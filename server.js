'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = Number(process.env.PORT) || 3000;
const WAIT = Math.max(0.1, Number(process.env.MM_SECONDS) || 40) * 1000;
const html = fs.readFileSync(path.join(__dirname, 'index.html'));
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/health') { res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}); return res.end('ok'); }
  if (pathname !== '/' && pathname !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method === 'HEAD' ? undefined : html);
});
const wss = new WebSocketServer({server, maxPayload: 64 * 1024, perMessageDeflate: false});
const clients = new Map(), rooms = new Map(), queue = new Set();
let queueDeadline = 0, queueTimer = null;
const id = () => crypto.randomBytes(12).toString('hex');
function send(c, obj) { if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(obj)); }
function merge(dst, src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return;
  for (const [k,v] of Object.entries(src)) {
    if (!/^[a-zA-Z0-9_]{1,24}$/.test(k)) continue;
    if (v === null || v === undefined) delete dst[k];
    else if (typeof v === 'string') dst[k] = v.slice(0,128);
    else if (typeof v === 'number' && Number.isFinite(v) || typeof v === 'boolean') dst[k] = v;
  }
}
function lobby() {
  const peers = [...clients.values()].map(c => {
    const p = {...c.lp};
    if (typeof p.s === 'string' && /^(private|match)-/i.test(p.s)) delete p.s;
    return {peer:c.id,presence:p};
  });
  for (const c of clients.values()) send(c,{t:'lobby',peers});
}
function broadcastRoom(name) {
  const members=rooms.get(name); if (!members) return;
  const peers=[...members].map(c=>({peer:c.id,presence:c.rp}));
  for(const c of members) send(c,{t:'room',name,peers});
}
function leaveRoom(c) {
  if (!c.room) return;
  const name=c.room,members=rooms.get(name); c.room=null;c.rp={};
  if(members){members.delete(c);if(!members.size)rooms.delete(name);else broadcastRoom(name);}
}
function queueStatus(extra) {
  for(const c of queue) send(c,{t:'mm_status',count:queue.size,deadline:queueDeadline, ...extra});
}
function stopTimer(){if(queueTimer)clearTimeout(queueTimer);queueTimer=null;queueDeadline=0;}
function beginTimer(){
  if(!queue.size || queueTimer) return;
  queueDeadline=Date.now()+WAIT;
  queueTimer=setTimeout(()=>{
    queueTimer=null;
    // Disconnected sockets are also removed by their close handlers.
    for(const c of queue) if(c.ws.readyState!==WebSocket.OPEN)queue.delete(c);
    if(queue.size<2){queueDeadline=0;if(queue.size){beginTimer();queueStatus({alone:true});}return;}
    const members=[...queue];queue.clear();queueDeadline=0;
    const matchId='match-'+id();
    // Reservations ensure that only queued clients can join an automatic match.
    const allowed=new Set(members.map(c=>c.id)); reservations.set(matchId,{allowed,expires:Date.now()+60000});
    for(const c of members) send(c,{t:'mm_ready',room:matchId,matchId});
  },WAIT);
  queueStatus();
}
const reservations=new Map();
function unqueue(c){if(queue.delete(c)){if(!queue.size)stopTimer();else queueStatus();}}
function receive(c,m){
  if(!m || typeof m!=='object'||Array.isArray(m))return;
  if(m.t==='mm_join'){
    leaveRoom(c);queue.add(c);if(!queueTimer)beginTimer();else queueStatus();return;
  }
  if(m.t==='mm_cancel'){unqueue(c);send(c,{t:'mm_cancelled'});return;}
  if(m.t==='lp'){merge(c.lp,m.p);return lobby();}
  if(m.t==='join'){
    const name=String(m.room||'').toLowerCase();
    if(!/^[a-z0-9_.-]{1,48}$/.test(name))return;
    if(name.startsWith('match-')){
      const r=reservations.get(name);if(!r||r.expires<Date.now()||!r.allowed.has(c.id)){send(c,{t:'mm_error',message:'Accès à ce match refusé.'});return;}
    }
    unqueue(c);leaveRoom(c);c.room=name;c.rp={};if(!rooms.has(name))rooms.set(name,new Set());rooms.get(name).add(c);broadcastRoom(name);return;
  }
  if(m.t==='rp'){if(c.room){merge(c.rp,m.p);broadcastRoom(c.room);}return;}
  if(m.t==='ev'){
    if(!c.room||typeof m.e!=='string'||m.e.length>48)return;
    for(const peer of rooms.get(c.room)||[])send(peer,{t:'ev',e:m.e,d:m.d,peer:c.id});return;
  }
  if(m.t==='leave'){leaveRoom(c);send(c,{t:'room',name:null,peers:[]});}
}
wss.on('connection',ws=>{
  const c={id:id(),ws,lp:{},rp:{},room:null,alive:true};clients.set(c.id,c);
  send(c,{t:'id',id:c.id});lobby();
  ws.on('pong',()=>{c.alive=true});
  ws.on('message',data=>{try{receive(c,JSON.parse(data.toString()))}catch{}});
  ws.on('close',()=>{unqueue(c);leaveRoom(c);clients.delete(c.id);lobby()});
  ws.on('error',()=>{});
});
const heartbeat=setInterval(()=>{
  for(const c of clients.values()){if(!c.alive){c.ws.terminate();continue;}c.alive=false;c.ws.ping();}
  for(const [key,r] of reservations)if(r.expires<Date.now())reservations.delete(key);
},30000);heartbeat.unref();
server.listen(PORT,'0.0.0.0',()=>console.log(`FortressStrike sur le port ${PORT}`));
