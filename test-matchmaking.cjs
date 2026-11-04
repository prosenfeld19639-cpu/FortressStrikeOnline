const WebSocket=require('ws'),assert=require('assert');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function client(){let sock=new WebSocket('ws://127.0.0.1:3101'),messages=[];sock.on('message',d=>messages.push(JSON.parse(d)));await new Promise((r,j)=>{sock.once('open',r);sock.once('error',j)});await wait(20);return{sock,messages,send:o=>sock.send(JSON.stringify(o))}}
(async()=>{const a=await client(),b=await client(),c=await client();
a.send({t:'mm_join'});await wait(500);assert(a.messages.some(x=>x.t==='mm_status'&&x.alone));assert(!a.messages.some(x=>x.t==='mm_ready'));console.log('seul : aucune partie, recherche relancée');
b.send({t:'mm_join'});await wait(500);let ra=a.messages.find(x=>x.t==='mm_ready'),rb=b.messages.find(x=>x.t==='mm_ready');assert(ra&&rb&&ra.matchId===rb.matchId);assert(!c.messages.some(x=>x.t==='mm_ready'));console.log('deux joueurs : même match');
a.send({t:'join',room:ra.room});b.send({t:'join',room:rb.room});c.send({t:'join',room:ra.room});await wait(100);assert(a.messages.some(x=>x.t==='room'&&x.name===ra.room&&x.peers.length===2));assert(c.messages.some(x=>x.t==='mm_error'));console.log('salon réservé aux joueurs sélectionnés');
a.send({t:'join',room:'private-1234567890abcdef'});a.send({t:'lp',p:{n:'Test',s:'private-1234567890abcdef'}});await wait(100);let l=b.messages.filter(x=>x.t==='lobby').at(-1);assert(!l.peers.some(p=>p.presence.s==='private-1234567890abcdef'));console.log('salon privé non listé');
a.send({t:'mm_join'});a.send({t:'mm_cancel'});await wait(500);assert(a.messages.some(x=>x.t==='mm_cancelled'));console.log('annulation de la file');
for(const x of [a,b,c])x.sock.close();
})().catch(err=>{console.error(err);process.exitCode=1});
