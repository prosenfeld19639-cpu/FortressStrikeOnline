'use strict';
const { Pool } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt=promisify(crypto.scrypt);
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquante : configure la base PostgreSQL sur Render.');
if(!process.env.ADMIN_CODE || process.env.ADMIN_CODE.length<12) throw new Error('ADMIN_CODE manquant ou trop court (12 caractères minimum).');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const hashToken = token=>crypto.createHash('sha256').update(token).digest('hex');
const timingEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
async function initialize(){
 await pool.query(`CREATE TABLE IF NOT EXISTS fs_users (id SERIAL PRIMARY KEY, username VARCHAR(24) NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, banned BOOLEAN NOT NULL DEFAULT FALSE, profile JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await pool.query(`ALTER TABLE fs_users ADD COLUMN IF NOT EXISTS email TEXT`);
 await pool.query(`CREATE TABLE IF NOT EXISTS fs_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES fs_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`);
}
async function lookup(token){
 if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const q=await pool.query('SELECT u.id,u.username,u.banned,u.profile FROM fs_sessions s JOIN fs_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()', [hashToken(token)]);
 return q.rows[0]||null;
}
async function session(user){
 const token=crypto.randomBytes(32).toString('hex');
 await pool.query("INSERT INTO fs_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,NOW()+INTERVAL '30 days')",[hashToken(token),user.id]);return token;
}
const attemptMap=new Map();
function allowAttempt(req){
 // Render's proxy address can be shared: limit generously to avoid penalising a class.
 const key=req.socket.remoteAddress||'unknown',now=Date.now();let v=attemptMap.get(key);
 if(!v||now>v.until){v={count:0,until:now+600000};attemptMap.set(key,v)}
 return ++v.count<=120;
}
function body(req){return new Promise((resolve,reject)=>{let text='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){reject(new Error('Trop volumineux'));req.destroy();return}text+=chunk.toString()});req.on('end',()=>{try{resolve(JSON.parse(text||'{}'))}catch{reject(new Error('JSON invalide'))}});req.on('error',reject)})}
function reply(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Admin-Code','Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
function fail(res,status,message){return reply(res,status,{error:message});}
function tokenOf(req){const m=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'');return m?m[1]:''}
function adminOK(req){return timingEqual(req.headers['x-admin-code']||'',process.env.ADMIN_CODE)}
async function api(req,res,onBan){
 if(req.method==='OPTIONS'){reply(res,200,{ok:true});return true}
 const p=new URL(req.url,'http://localhost').pathname;
 if(!p.startsWith('/api/'))return false;
 try{
  if((p==='/api/register'||p==='/api/login')&&req.method==='POST'){
   if(!allowAttempt(req)){fail(res,429,'Trop de tentatives. Réessaie plus tard.');return true}
   const data=await body(req),username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   if(!/^[a-z0-9_-]{3,24}$/.test(username)||password.length<8||password.length>128){fail(res,400,'Pseudo : 3 à 24 lettres, chiffres, tirets ou underscores. Mot de passe : 8 caractères minimum.');return true}
   if(p==='/api/register'){
    const email=String(data.email||'').trim().toLowerCase();
    if(email.length>254||!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)){fail(res,400,'Adresse e-mail invalide.');return true}
    const domain=email.split('@')[1];
    const blocked=['drtall.com','temp-mail.org','temp-mail.io','mailinator.com','guerrillamail.com','10minutemail.com','yopmail.com','dispostable.com','getnada.com'];
    if(blocked.some(d=>domain===d||domain.endsWith('.'+d))){fail(res,403,'Les adresses e-mail temporaires ne sont pas acceptées.');return true}
    const salt=crypto.randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
    try{const result=await pool.query('INSERT INTO fs_users (username,salt,password_hash,email) VALUES ($1,$2,$3,$4) RETURNING id,username,banned,profile',[username,salt,hash,email]);const user=result.rows[0];reply(res,201,{token:await session(user),username:user.username,profile:null})}
    catch(e){if(e.code==='23505')fail(res,409,'Ce pseudo est déjà utilisé.');else throw e}
   }else{
    const result=await pool.query('SELECT id,username,salt,password_hash,banned,profile FROM fs_users WHERE username=$1',[username]),u=result.rows[0];
    // Scrypt même si le pseudo est inconnu.
    const hash=(await scrypt(password,u?.salt||'00000000000000000000000000000000',64)).toString('hex');
    if(!u||!timingEqual(hash,u.password_hash)){fail(res,401,'Pseudo ou mot de passe incorrect.');return true}
    if(u.banned){fail(res,403,'Ce compte est banni.');return true}
    reply(res,200,{token:await session(u),username:u.username,profile:u.profile});
   }
   return true;
  }
  const token=tokenOf(req),u=await lookup(token);
  if(!u){fail(res,401,'Connecte-toi à ton compte.');return true}
  if(u.banned){fail(res,403,'Ce compte est banni.');return true}
  if(p==='/api/me'&&req.method==='GET'){reply(res,200,{username:u.username,profile:u.profile});return true}
  if(p==='/api/logout'&&req.method==='POST'){await pool.query('DELETE FROM fs_sessions WHERE token_hash=$1',[hashToken(token)]);reply(res,200,{ok:true});return true}
  if(p==='/api/profile'&&req.method==='PUT'){
   const data=await body(req);if(!data.profile||typeof data.profile!=='object'||Array.isArray(data.profile)){fail(res,400,'Profil invalide.');return true}
   await pool.query('UPDATE fs_users SET profile=$1 WHERE id=$2',[JSON.stringify(data.profile),u.id]);reply(res,200,{ok:true});return true;
  }
  if(p.startsWith('/api/admin/')){
   if(!allowAttempt(req)){fail(res,429,'Trop de tentatives. Réessaie plus tard.');return true}
   if(!adminOK(req)){fail(res,403,'Code administrateur incorrect.');return true}
   if(p==='/api/admin/verify'&&req.method==='POST'){reply(res,200,{ok:true});return true}
   if(p==='/api/admin/users'&&req.method==='GET'){
    const q=await pool.query('SELECT id,username,banned FROM fs_users ORDER BY username LIMIT 500');reply(res,200,{users:q.rows,me:u.username});return true;
   }
   if(p==='/api/admin/ban'&&req.method==='POST'){
    const data=await body(req),name=String(data.username||'').trim().toLowerCase(),banned=data.banned===true;
    if(!/^[a-z0-9_-]{3,24}$/.test(name)){fail(res,400,'Pseudo invalide.');return true}
    if(name===u.username&&banned){fail(res,400,'Tu ne peux pas bannir ton propre compte.');return true}
    const q=await pool.query('UPDATE fs_users SET banned=$1 WHERE username=$2 RETURNING id,username,banned',[banned,name]);
    if(!q.rows.length){fail(res,404,'Compte introuvable.');return true}
    if(banned)onBan(q.rows[0].id);reply(res,200,{user:q.rows[0]});return true;
   }
  }
  fail(res,404,'Route introuvable.');return true;
 }catch(e){console.error('API:',e.message);if(!res.headersSent)fail(res,500,'Erreur serveur. Réessaie.');return true}
}
module.exports={initialize,lookup,api};
