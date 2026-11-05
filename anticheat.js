'use strict';
// Protections prudentes côté serveur : on ignore les messages impossibles, sans bannissement automatique.
function validPresence(c,patch,now=Date.now()){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))return false;
 if(patch.y!=null&&(!Number.isFinite(patch.y)||patch.y<0||patch.y>5))return false;
 if(patch.hp!=null&&(!Number.isFinite(patch.hp)||patch.hp<0||patch.hp>300))return false;
 if(patch.k!=null&&(!Number.isInteger(patch.k)||patch.k<0||patch.k>10000))return false;
 if(patch.d!=null&&(!Number.isInteger(patch.d)||patch.d<0||patch.d>10000))return false;
 if(patch.m===null)c.acPosition=null;
 const clearing=patch.x===null&&patch.z===null;
 const hasPos=!clearing&&(patch.x!==undefined||patch.z!==undefined);
 if(hasPos){
  if(!Number.isFinite(patch.x)||!Number.isFinite(patch.z)||Math.abs(patch.x)>31.5||Math.abs(patch.z)>31.5)return false;
  const prev=c.acPosition,alive=patch.al===undefined?Number(c.rp.al)===1:Number(patch.al)===1;
  const match=patch.m===undefined?c.rp.m:patch.m;
  if(prev&&alive&&prev.alive&&match&&prev.match===match){
   const elapsed=Math.max(0,Math.min(10,(now-prev.time)/1000));
   if(Math.hypot(patch.x-prev.x,patch.z-prev.z)>6+20*elapsed)return false;
  }
  c.acPosition={x:patch.x,z:patch.z,time:now,alive,match};
 }
 return true;
}
function validEvent(c,event,data,members,now=Date.now()){
 if(event==='hit'){
  if(!data||typeof data!=='object'||typeof data.to!=='string'||!Number.isFinite(data.d)||data.d<=0||data.to===c.id)return null;
  const target=[...members].find(p=>p.id===data.to);
  if(!target||!c.rp.m||target.rp.m!==c.rp.m)return null;
  if(!c.acHits||now-c.acHits.start>2000)c.acHits={start:now,count:0};
  if(++c.acHits.count>200)return null;
  return {to:data.to,d:Math.min(150,Math.round(data.d)),hs:!!data.hs};
 }
 if(event==='kill'){
  if(!data||typeof data!=='object'||data.v!==c.id||typeof data.k!=='string'||data.k.length>48)return null;
  return {v:c.id,k:data.k,hs:!!data.hs};
 }
 return data;
}
module.exports={validPresence,validEvent};
