const fs=require('fs'),vm=require('vm'),assert=require('assert');const s=fs.readFileSync(__dirname+'/index.html','utf8');
const code=s.slice(s.indexOf('// Armes supplémentaires réservées'),s.indexOf('const _vcStart=VC.prototype.start;'));
function VC(){}VC.prototype.respawn=function(){this.net&&this.order.push('respawn')};VC.prototype.switchWeapon=function(n){this.switched=n};
const em=[{id:'pm-a',name:'OLD SMG',kind:'smg',damage:20,magazine:30,reserve:90,reloadTime:1,fireInterval:.1},{id:'pm-b',name:'OLD SMG 2',kind:'smg',damage:20,magazine:30,reserve:90,reloadTime:1,fireInterval:.1},{id:'rifle',name:'OLD RIFLE',kind:'rifle',damage:25,magazine:30,reserve:90,reloadTime:1,fireInterval:.1}];
const py=(r,n)=>({...r,damage:r.damage*(1+n*.1)}),ctx={VC,em,wu:10,py,Math,Number};vm.createContext(ctx);vm.runInContext(code,ctx);
const levels={'pm-a':2,'pm-b':5,rifle:3};assert.equal(ctx.fsBestCategoryLevel('smg',levels),5);assert.equal(ctx.fsBestCategoryLevel('shotgun',levels),0);assert.equal(ctx.fsBestCategoryLevel('rifle',levels),3);
// Premier tirage force l'arme exclusive LYNX ; deuxième tirage choisit le kit.
let values=[3/9+.001,.4],out=ctx.fsRandomMpLoadout(levels,()=>values.shift());assert.equal(out.base.id,'mp-smg-lynx');assert.equal(out.level,5);assert.equal(out.item,'kit');
let g=new VC();Object.assign(g,{net:{},mpLoadout:out,slots:[{},{}],order:[],loadSlot(){this.ammo=this.slots[0].ammo},buildWeaponModel(){},emit(){}});g.applyMpLoadout();assert.equal(g.slots[0].def.damage,27);assert.equal(g.ammo,30);assert.equal(g.inventory[0].type,'kit');g.switchWeapon(1);assert.equal(g.switched,undefined);g.inventory[0]=null;g.respawn();assert.equal(g.inventory[0].type,'kit');assert.equal(g.slots[0].def.id,'mp-smg-lynx');g.net=null;g.switchWeapon(1);assert.equal(g.switched,1);
console.log('Tirage, exclusivité, meilleur niveau par catégorie, consommable et réapparition : OK');
