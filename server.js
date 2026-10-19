const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,PAGE=path.join(__dirname,'index.html');
const rooms=new Map(),send=(res,o)=>res.write('data:'+JSON.stringify(o)+'\n\n');
const rc=u=>String(u.searchParams.get('room')||'').trim().slice(0,16).replace(/[^\w\-ぁ-んァ-ヶ一-龠ー]/g,'');
const getRoom=c=>{let r=rooms.get(c);if(!r){r={code:c,players:new Map(),streams:new Map(),dirty:new Set(),host:null,t0:Date.now(),sticky:new Map()};rooms.set(c,r)}return r};
const all=(r,o,ex)=>{for(const[i,s]of r.streams)if(i!==ex)send(s,o)};
function drop(r,id){const had=r.players.delete(id)|r.streams.delete(id);if(!had)return;all(r,{u:[],l:[id],c:r.streams.size});
if(r.host===id){r.host=r.streams.keys().next().value||null;if(r.host)all(r,{h:r.host})}
if(!r.streams.size)setTimeout(()=>{if(!r.streams.size&&rooms.get(r.code)===r)rooms.delete(r.code)},60000)}
const body=(q,cb)=>{let b='';q.on('data',d=>{b+=d;if(b.length>100000)q.destroy()});q.on('end',()=>{try{cb(JSON.parse(b))}catch(e){cb(null)}})};
http.createServer((q,res)=>{const u=new URL(q.url,'http://x'),code=rc(u),id=(u.searchParams.get('id')||'').slice(0,16);
if(u.pathname==='/events'){if(!id||!code){res.writeHead(400).end();return}const r=getRoom(code);
res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
r.streams.set(id,res);if(!r.host||!r.streams.has(r.host))r.host=id;
send(res,{init:1,now:Date.now(),t0:r.t0,host:r.host,u:[...r.players.values()],c:r.streams.size,m:[...r.sticky.values()]});all(r,{u:[],c:r.streams.size},id);
q.on('close',()=>drop(r,id));return}
const r=rooms.get(code);
if(u.pathname==='/pos'&&q.method==='POST'){body(q,p=>{if(r&&p&&r.streams.has(p.id)&&[p.x,p.y,p.z,p.w].every(Number.isFinite)){p.n=String(p.n||'').slice(0,12);p.d=p.d?1:0;p.ts=Date.now();r.players.set(p.id,p);r.dirty.add(p.id)}res.writeHead(204).end()});return}
if(u.pathname==='/msg'&&q.method==='POST'){body(q,arr=>{if(r&&r.streams.has(id)&&Array.isArray(arr)){const out=[];
for(const m of arr){if(!m||typeof m!=='object')continue;m.f=id;
if(m.sk){if(m.k==='base')for(const k of r.sticky.keys())if(k.startsWith('d'+m.i+'_'))r.sticky.delete(k);r.sticky.set(String(m.sk),m)}
if(m.to){const s=r.streams.get(m.to);if(s)send(s,{m:[m]})}else out.push(m)}
if(out.length)all(r,{m:out},id)}res.writeHead(204).end()});return}
if(u.pathname==='/'||u.pathname==='/index.html'){fs.readFile(PAGE,(e,d)=>{res.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8'}).end(d)});return}
res.writeHead(404).end()}).listen(PORT,()=>console.log('listening on '+PORT));
let tick=0;setInterval(()=>{tick++;for(const r of rooms.values()){if(r.dirty.size){const u=[...r.dirty].map(i=>r.players.get(i)).filter(Boolean);r.dirty.clear();all(r,{u,c:r.streams.size})}
const t=Date.now();for(const[i,p]of r.players)if(t-p.ts>15000){r.players.delete(i);all(r,{u:[],l:[i],c:r.streams.size})}
if(tick%10===0)for(const s of r.streams.values())s.write(':\n\n')}},100);
