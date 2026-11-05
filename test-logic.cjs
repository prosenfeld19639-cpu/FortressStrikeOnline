const fs=require('fs'),vm=require('vm'),assert=require('assert');
const anti=require('./anticheat');
let sender={id:'a',rp:{m:'m',al:1}},target={id:'b',rp:{m:'m'}};
assert(anti.validPresence(sender,{x:0,z:0,al:1,m:'m',hp:110},1000));
assert(anti.validPresence(sender,{x:1,z:0,al:1,m:'m',hp:110},1100));
assert(!anti.validPresence(sender,{x:29,z:29,al:1,m:'m'},1200));
assert(anti.validPresence(sender,{m:null,x:null,y:null,z:null,al:null,k:null,d:null},1400));
assert.equal(anti.validEvent(sender,'hit',{to:'b',d:999},new Set([sender,target])).d,150);
assert.equal(anti.validEvent(sender,'kill',{v:'b',k:'a'},new Set([sender,target])),null);
const s=fs.readFileSync(__dirname+'/index.html','utf8');const source=s.slice(s.indexOf('const FS_TACTICAL='),s.indexOf('VC.prototype.resetExtras=function()'));
function VC(){}class W{constructor(x,y,z){Object.assign(this,{x,y,z})}}function Ix(id,kind,pos){return{id,kind,group:{position:pos},hp:50,damage:10,speed:2}}
vm.runInNewContext(source,{VC,W,Ix,Math});let game=new VC();Object.assign(game,{mission:6,missionCfg:{hp:1,dmg:1,speed:1},routeStage:0,complexStage:0,enemies:[],enemyId:0,world:{scene:{add(){}},complex:{route:Array.from({length:3},()=>({visible:true})),markers:Array.from({length:3},()=>({visible:true})),heli:{visible:false,position:{y:0}}}}});
game.startTacticalAction('route',0,-35,30,0);assert.equal(game.missionAction.remaining,3);for(let i=0;i<3;i++)game.finishTacticalAction({kind:'route',index:i});for(let i=0;i<2;i++)game.finishTacticalAction({kind:'floor',index:i});assert.equal(game.complexStage,2);game.callExtraction();assert(game.heliCalled);assert.equal(game.heliTimer,12);assert.equal(game.enemies.length,3);
let final=new VC();Object.assign(final,{mission:8,missionCommander:{dead:false},world:game.world,enemies:[],missionCfg:game.missionCfg});final.callExtraction();assert(!final.heliCalled);final.missionCommander.dead=true;final.callExtraction();assert(final.heliCalled);console.log('Anti-triche et logique des missions : OK');
