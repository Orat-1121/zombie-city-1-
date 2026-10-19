const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,PAGE=path.join(__dirname,'index.html');
const players=new Map(),streams=new Map(),dirty=new Set();
const send=(r,o)=>r.write('data:'+JSON.stringify(o)+'\n\n');
const all=o=>{for(const r of streams.values())send(r,o)};
const drop=id=>{if(players.delete(id)|streams.delete(id))all({u:[],l:[id],c:players.size})};
http.createServer((q,r)=>{const u=new URL(q.url,'http://x');
if(u.pathname==='/events'){const id=(u.searchParams.get('id')||'').slice(0,16);if(!id){r.writeHead(400).end();return}
r.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
streams.set(id,r);send(r,{u:[...players.values()],c:players.size});q.on('close',()=>{streams.delete(id);drop(id)});return}
if(u.pathname==='/pos'&&q.method==='POST'){let b='';q.on('data',d=>{b+=d;if(b.length>1000)q.destroy()});q.on('end',()=>{try{const p=JSON.parse(b);
if(typeof p.id==='string'&&p.id.length<=16&&[p.x,p.y,p.z,p.w].every(Number.isFinite)){p.id=p.id;p.n=String(p.n||'').slice(0,12);p.d=p.d?1:0;p.ts=Date.now();
if(!players.has(p.id)&&players.size>=100){r.writeHead(503).end();return}players.set(p.id,p);dirty.add(p.id)}}catch(e){}r.writeHead(204).end()});return}
if(u.pathname==='/'||u.pathname==='/index.html'){fs.readFile(PAGE,(e,d)=>{r.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8'}).end(d)});return}
r.writeHead(404).end()}).listen(PORT,()=>console.log('listening on '+PORT));
setInterval(()=>{if(dirty.size){const u=[...dirty].map(i=>players.get(i)).filter(Boolean);dirty.clear();all({u,c:players.size})}
const t=Date.now();for(const[i,p]of players)if(t-p.ts>15000)drop(i);for(const r of streams.values())r.write(':\n\n')},100);
