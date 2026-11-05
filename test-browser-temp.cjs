const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 const data=fs.readFileSync('index.html','utf8').replace('constructor(e,n,a){this.container=e,this.onSnapshot', 'constructor(e,n,a){window.__testGame=this;this.container=e,this.onSnapshot');
 await page.route('http://localhost:8765/**',route=>route.fulfill({status:200,contentType:'text/html',body:data}));
 await page.route('https://fortressstrikeonline.onrender.com/api/**',route=>route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({username:'testeur',profile:{version:2,xp:1000,credits:250,campaign:{unlocked:15,completed:Array(15).fill(1),best:Array(15).fill(0)}}})}));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;localStorage.setItem('fs-account-token-v1','a'.repeat(64));localStorage.setItem('fs-account-owner-v1','testeur')});
 console.log('chargement');await page.goto('http://localhost:8765/',{waitUntil:'domcontentloaded',timeout:30000});console.log('chargé');
 await page.waitForSelector('.campaign-button',{timeout:20000});console.log('menu prêt');
 await page.locator('.campaign-button').click();await page.waitForSelector('.mission-card');assert.equal(await page.locator('.mission-card').count(),15);
 await page.locator('.mission-card').first().click();await page.waitForFunction(()=>window.__testGame?.phase==='playing',{timeout:30000});
 await page.waitForTimeout(500);let info=await page.evaluate(()=>({mission:__testGame.mission,arena:__testGame.world.expanded,points:__testGame.tacticalPoints(),enemies:__testGame.enemies.length,marker:__testGame.world.complex.markers[2].position.z}));console.log('Mission 1 démarrée',info);assert.equal(info.mission,0);assert.equal(info.arena,true);assert.equal(info.points.length,3);assert.equal(info.marker,80);assert(info.enemies>10);
 await page.keyboard.press('m');await page.evaluate(()=>__testGame.update(.05));await page.waitForTimeout(100);assert.equal(await page.locator('.fs-full-map').evaluate(e=>getComputedStyle(e).display),'flex');await page.keyboard.press('m');await page.evaluate(()=>__testGame.update(.05));
 await page.evaluate(()=>{const g=__testGame;g.health=99999;g.agent.speed=0;g.fsAlarm=false;});
 for(let i=0;i<3;i++){
  await page.evaluate(i=>{const g=__testGame,[x,z]=g.tacticalPoints()[i];g.player.set(x,0,z);g.extraKey({code:'KeyE',repeat:false})},i);
  const started=await page.evaluate(()=>!!__testGame.missionAction);assert(started,'action au poste '+i);
  await page.evaluate(()=>{const g=__testGame;g.missionAction.remaining=.01;g.update(.05)});
  assert.equal(await page.evaluate(()=>__testGame.routeStage),i+1);
 }
 for(let i=0;i<2;i++){
  await page.evaluate(i=>{const g=__testGame;let p=i===0?[-7,5,-7]:[7,10,-7];g.player.set(...p);g.extraKey({code:'KeyE',repeat:false})},i);
  assert(await page.evaluate(()=>!!__testGame.missionAction),'action étage '+i);
  await page.evaluate(()=>{const g=__testGame;g.missionAction.remaining=.01;g.update(.05)});
  assert.equal(await page.evaluate(()=>__testGame.complexStage),i+1);
 }
 await page.evaluate(()=>{const g=__testGame;g.player.set(0,0,80);g.extraKey({code:'KeyE',repeat:false})});assert(await page.evaluate(()=>__testGame.heliCalled));
 await page.evaluate(()=>{const g=__testGame;g.heliTimer=.01;g.update(.05)});assert.equal(await page.evaluate(()=>__testGame.phase),'victory');console.log('Objectifs, carte plein écran et extraction : OK');
 const missions=await page.evaluate(()=>{let g=window.__testGame;g.controls.lock=()=>{};g.controls.unlock=()=>{};const report=[];for(let i=0;i<15;i++){g.begin(i,'volt',{damage:0,vitality:0,cooldown:0},{primary:'volt-ar24',secondary:'volt-p12'},{});report.push({i,playing:g.phase==='playing',enemies:g.enemies.length,points:g.tacticalPoints().length,commander:!!g.missionCommander,required:!!g.tacticalConfig().commander,markers:g.world.complex.route.map(m=>m.visible)});}return report});
 assert.equal(missions.length,15);for(const m of missions){assert(m.playing&&m.enemies>10&&m.points===3);assert.equal(m.commander,m.required);assert.deepEqual(m.markers,[true,false,false])}console.log('Démarrage et objectifs des 15 missions : OK');
 if(errors.length)console.log('PAGE ERRORS',errors);assert.equal(errors.length,0);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
