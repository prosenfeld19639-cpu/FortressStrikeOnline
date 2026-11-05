// This script is embedded in index.html before the game module.
(function(){
 'use strict';
 const BASE='https://fortressstrikeonline.onrender.com',TOKEN='fs-account-token-v1',OWNER='fs-account-owner-v1',PROFILE='fortressstrike-profile-v1';
 let verified=false,account='',adminCode='',saveTimer=null,pendingProfile=null,saving=false,ui={},gameStarted=false,resolveGame;
 window.fsGameReady=new Promise(resolve=>{resolveGame=resolve});
 function token(){return localStorage.getItem(TOKEN)||''}
 async function request(path,options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};if(token())headers.Authorization='Bearer '+token();
  const response=await fetch(BASE+path,{...options,headers,cache:'no-store'});
  let result;try{result=await response.json()}catch{throw new Error('Réponse du serveur invalide.')}
  if(!response.ok)throw new Error(result.error||'Serveur indisponible.');return result;
 }
 async function flush(){
  if(!verified||saving||!pendingProfile)return;saving=true;
  const profile=pendingProfile;pendingProfile=null;
  try{await request('/api/profile',{method:'PUT',body:JSON.stringify({profile})});if(ui.save)ui.save.textContent='PROGRESSION SYNCHRONISÉE'}
  catch(err){if(!pendingProfile)pendingProfile=profile;if(ui.save)ui.save.textContent='SAUVEGARDE EN ATTENTE : '+err.message}
  finally{saving=false;if(pendingProfile){clearTimeout(saveTimer);saveTimer=setTimeout(flush,3000)}}
 }
 window.fsSaveProfile=function(profile){if(!verified)return;pendingProfile=profile;if(ui.save)ui.save.textContent='SAUVEGARDE…';clearTimeout(saveTimer);saveTimer=setTimeout(flush,700)};
 window.fsAccountToken=token;
 window.fsAccountAdminRequest=async function(path,options={}){if(!adminCode)throw new Error('Active d’abord le mode admin.');return request(path,{...options,headers:{...(options.headers||{}),'X-Admin-Code':adminCode}})};
 window.fsAccountAuthError=function(message){verified=false;localStorage.removeItem(TOKEN);if(ui.auth){ui.auth.style.display='flex';ui.error.textContent=message||'Session expirée. Reconnecte-toi.'}if(ui.account)ui.account.style.display='none'};
 function node(tag,cls,text,parent){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;if(parent)parent.appendChild(e);return e}
 async function applyAccount(data,newToken){
  const previous=localStorage.getItem(OWNER),local=localStorage.getItem(PROFILE);
  if(newToken)localStorage.setItem(TOKEN,newToken);
  localStorage.setItem(OWNER,data.username);
  if(data.profile){localStorage.setItem(PROFILE,JSON.stringify(data.profile))}
  else if(local&&(!previous||previous===data.username)){
   try{const profile=JSON.parse(local);await request('/api/profile',{method:'PUT',body:JSON.stringify({profile})})}catch(e){throw new Error('Connexion réussie mais sauvegarde initiale impossible : '+e.message)}
  }else if(previous&&previous!==data.username){localStorage.removeItem(PROFILE)}
 }
 function finishLogin(data){
  verified=true;account=data.username;ui.auth.style.display='none';ui.account.style.display='flex';
  ui.username.textContent='COMPTE · '+account;ui.save.textContent='PROGRESSION SYNCHRONISÉE';
  if(!gameStarted){gameStarted=true;resolveGame()}
 }
 async function bootstrap(){
  ui.auth.style.display='flex';ui.error.textContent='';
  if(!token()){ui.status.textContent='Connecte-toi ou crée un compte pour jouer.';return}
  ui.status.textContent='Vérification du compte…';
  try{
   const data=await request('/api/me');
   await applyAccount(data);
   finishLogin(data);
  }catch(err){ui.status.textContent='Connexion nécessaire.';ui.error.textContent=err.message;if(/banni|Connecte-toi/.test(err.message))localStorage.removeItem(TOKEN)}
 }
 async function signIn(mode){
  ui.error.textContent='';ui.status.textContent=mode==='login'?'Connexion…':'Création du compte…';
  const username=ui.user.value.trim(),password=ui.pass.value,email=ui.email.value.trim();
  try{
   const data=await request('/api/'+mode,{method:'POST',body:JSON.stringify({username,password,email})});
   await applyAccount(data,data.token);
   if(gameStarted){location.reload();return}
   finishLogin(data);
  }catch(err){ui.status.textContent='Connexion nécessaire.';ui.error.textContent=err.message}
 }
 async function refreshUsers(){
  try{const data=await window.fsAccountAdminRequest('/api/admin/users');ui.list.replaceChildren();
   for(const user of data.users){const row=node('div','fs-auth-row','',ui.list);node('span','',user.username+(user.banned?' · BANNI':''),row);if(user.username===data.me){node('small','', 'VOUS',row);continue}
    const btn=node('button','fs-auth-button',user.banned?'DÉBANNIR':'BANNIR',row);btn.onclick=async()=>{if(!user.banned&&!confirm('Bannir le compte '+user.username+' ?'))return;try{await window.fsAccountAdminRequest('/api/admin/ban',{method:'POST',body:JSON.stringify({username:user.username,banned:!user.banned})});await refreshUsers()}catch(e){ui.adminError.textContent=e.message}};
   }
  }catch(err){ui.adminError.textContent=err.message}
 }
 function build(){
  const style=node('style','', '',document.head);style.textContent=`
.fs-auth-overlay{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;background:#08151eeb;color:#e9fbf7;font-family:Arial,sans-serif;box-sizing:border-box}.fs-auth-card{width:min(440px,100%);max-height:90vh;overflow:auto;background:#18343b;border:1px solid #87b4b2;padding:24px;box-sizing:border-box;box-shadow:0 20px 70px #000b}.fs-auth-card h2{margin:0 0 8px;font-size:24px}.fs-auth-card p{line-height:1.5;font-size:13px;color:#c3d9d4}.fs-auth-card input{display:block;width:100%;box-sizing:border-box;padding:10px;margin:8px 0;color:#fff;background:#10252a;border:1px solid #607c7c}.fs-auth-actions{display:flex;gap:8px;flex-wrap:wrap}.fs-auth-button{border:1px solid #c5ef62;background:#c5ef62;color:#17302d;padding:9px 12px;font-weight:bold;cursor:pointer}.fs-auth-error{min-height:1em;color:#ffb0a0!important}.fs-account-strip{position:fixed;z-index:99997;right:12px;top:78px;display:none;gap:6px;align-items:center;background:#10252de8;color:#d9f3ee;padding:6px 8px;font:700 10px Arial;max-width:45vw}.fs-account-strip button{font-size:10px;padding:5px}.fs-admin-overlay{z-index:100000}.fs-auth-list{max-height:38vh;overflow:auto;margin-top:10px}.fs-auth-row{display:flex;align-items:center;gap:10px;padding:8px;background:#23444b;margin-bottom:4px}.fs-auth-row span{flex:1;overflow-wrap:anywhere}.fs-auth-row button{font-size:10px}.fs-save-note{font-size:9px;color:#b9d5cd}@media(max-width:700px){.fs-account-strip{top:64px;right:5px;max-width:55vw}.fs-save-note{display:none}}`;
  ui.auth=node('div','fs-auth-overlay','',document.body);const card=node('div','fs-auth-card','',ui.auth);node('h2','','COMPTE FORTRESSSTRIKE',card);ui.status=node('p','','Connecte-toi ou crée un compte.',card);
  ui.user=node('input','','',card);ui.user.placeholder='Pseudo (3 à 24 caractères)';ui.user.autocomplete='username';ui.user.maxLength=24;
  ui.email=node('input','','',card);ui.email.type='email';ui.email.placeholder='E-mail (création de compte uniquement)';ui.email.autocomplete='email';ui.email.maxLength=254;
  ui.pass=node('input','','',card);ui.pass.type='password';ui.pass.placeholder='Mot de passe (8 caractères minimum)';ui.pass.autocomplete='current-password';ui.pass.maxLength=128;
  const actions=node('div','fs-auth-actions','',card);node('button','fs-auth-button','SE CONNECTER',actions).onclick=()=>signIn('login');node('button','fs-auth-button','CRÉER UN COMPTE',actions).onclick=()=>signIn('register');
  ui.error=node('p','fs-auth-error','',card);node('p','','L’e-mail est demandé à la création du compte. La progression locale de ce navigateur sera importée lors de la création du premier compte, si elle existe.',card);
  ui.account=node('div','fs-account-strip','',document.body);ui.username=node('span','','',ui.account);ui.save=node('span','fs-save-note','',ui.account);
  node('button','fs-auth-button','ADMIN',ui.account).onclick=()=>{ui.admin.style.display='flex'};
  node('button','fs-auth-button','DÉCONNEXION',ui.account).onclick=async()=>{try{if(pendingProfile)await flush();await request('/api/logout',{method:'POST'})}catch{}localStorage.removeItem(TOKEN);location.reload()};
  ui.admin=node('div','fs-auth-overlay fs-admin-overlay','',document.body);ui.admin.style.display='none';const adm=node('div','fs-auth-card','',ui.admin);node('h2','','MODE ADMIN',adm);node('p','','Le code est défini sur le serveur, jamais dans le jeu.',adm);
  const code=node('input','','',adm);code.type='password';code.placeholder='Code administrateur';code.autocomplete='off';
  const buttons=node('div','fs-auth-actions','',adm);node('button','fs-auth-button','ACTIVER',buttons).onclick=async()=>{try{const candidate=code.value;await request('/api/admin/verify',{method:'POST',headers:{'X-Admin-Code':candidate}});adminCode=candidate;code.value='';ui.adminError.textContent='Mode admin activé.';ui.adminTools.style.display='block';await refreshUsers()}catch(e){ui.adminError.textContent=e.message}};
  node('button','fs-auth-button','FERMER',buttons).onclick=()=>{adminCode='';ui.adminTools.style.display='none';ui.admin.style.display='none'};
  ui.adminError=node('p','fs-auth-error','',adm);ui.adminTools=node('div','','',adm);ui.adminTools.style.display='none';
  node('button','fs-auth-button','DÉBLOQUER TOUTES LES ARMES',ui.adminTools).onclick=async()=>{try{await window.fsAccountAdminRequest('/api/admin/verify',{method:'POST'});await window.fsAdminUnlock();}catch(e){ui.adminError.textContent=e.message}};
  node('p','','Bannir ou débannir un compte :',ui.adminTools);ui.list=node('div','fs-auth-list','',ui.adminTools);
  setInterval(()=>{if(ui.account)ui.account.style.display=verified&&!document.pointerLockElement?'flex':'none'},500);
  bootstrap();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
