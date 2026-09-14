// Optional browser regression check: npm install --no-save --package-lock=false playwright pngjs
// Start npm run serve, then: node scripts/check-foil.cjs [http://localhost:8080]
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const baseURL = process.argv[2] || 'http://localhost:8080';
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1000,height:1100}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseURL}/src/ui/foil-preview.html`);
  await page.waitForSelector('#cards .card-face');
  await page.selectOption('#motion','instant');
  await page.mouse.move(0,0);
  for (const width of [375,768,1280]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
  }
  await page.selectOption('#card','bb_clover_3');
  await page.selectOption('#printing','fullCardArt');
  await page.locator('.foil-details .inspect-card').click();
  assert.equal(await page.locator('.card-reader .card-face').getAttribute('data-foil'),'details');
  assert.equal(await page.locator('.card-reader .card-face').getAttribute('data-version'),'fullCardArt');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1000,height:1100});
  await page.selectOption('#motion','storybook');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator('.foil-sheen').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none')));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.selectOption('#size','small');
  await page.selectOption('#printing','regular');
  const hovered = page.locator('#cards .foil-artwork');
  await hovered.hover();
  await page.waitForSelector('#cardPeek:not([hidden]) .card-face');
  assert.equal(await page.locator('#cardPeek .card-face').getAttribute('data-foil'),'artwork');
  assert.equal(await page.locator('#cardPeek .card-face').getAttribute('data-version'),'regular');
  assert.ok(await hovered.evaluate(el=>el.style.getPropertyValue('--mx')),'pointer tracks interactive foil');
  await page.mouse.move(0,0);
  await page.selectOption('#size','large');
  await page.selectOption('#motion','instant');
  assert.ok(await page.locator('.foil-sheen').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none')));

  // Render each finish at identical coordinates, so pixel comparisons aren't distorted by
  // subpixel positioning or different background patches on the preview page.
  await page.evaluate(async()=>{
    const {buildCardFace}=await import('/src/ui/render.js');
    const cards=await (await fetch('/spec/starter_card_set.json')).json();
    const def=cards.cards.find(c=>c.id==='bb_clover_3');
    const host=document.createElement('div');host.id='test-host';host.style.cssText='position:fixed;inset:0;z-index:1000;background:#ddd;padding:20px;';document.body.append(host);
    const style=document.createElement('style');style.textContent='.foil-tag{display:none!important}';document.head.append(style);
    window.renderFinish=(mode,version='regular')=>{host.replaceChildren(buildCardFace(def,{large:true,interactive:false,version,foil:mode==='details'?{mode,mask:'assets/art/foil/sample-details.svg'}:mode}));};
  });
  function delta(a,b,r) {let changed=0,total=0;for(let y=Math.ceil(r.y)+4;y<Math.floor(r.y+r.height)-4;y++)for(let x=Math.ceil(r.x)+4;x<Math.floor(r.x+r.width)-4;x++){let i=(y*a.width+x)*4;total++;if([0,1,2].some(c=>a.data[i+c]!==b.data[i+c]))changed++;}return changed/total;}
  for(const version of ['regular','fullCardArt']) {
    const shots={};let rects;
    for(const mode of [null,'full','artwork','details','reverse','hexagon']) {
      await page.evaluate(({mode,version})=>window.renderFinish(mode,version),{mode,version});
      await page.waitForTimeout(80);
      const card=page.locator('#test-host .card-face');
      shots[mode]=PNG.sync.read(await card.screenshot());
      rects=await card.evaluate(el=>{const base=el.getBoundingClientRect();return Object.fromEntries(['art','body','banner'].map(k=>{const r=el.querySelector('.'+k).getBoundingClientRect();return[k,{x:r.x-base.x,y:r.y-base.y,width:r.width,height:r.height}];}));});
    }
    const body=rects.body;
    // A clear art sample, above the body and below the name panels, for full art.
    const art=version==='regular'?rects.art:{x:30,y:110,width:170,height:80};
    const report={version,reverseArt:delta(shots.null,shots.reverse,art),artworkBody:delta(shots.null,shots.artwork,body),detailBody:delta(shots.null,shots.details,body),fullArt:delta(shots.null,shots.full,art),artworkArt:delta(shots.null,shots.artwork,art),reverseBody:delta(shots.null,shots.reverse,body),hexArt:delta(shots.null,shots.hexagon,art),detailArt:delta(shots.null,shots.details,art)};
    console.log(report);
    assert.equal(report.reverseArt,0,'reverse foil must leave art pixels unchanged');
    // Full-art panels are translucent, so their background can reveal a little of the art below.
    if(version==='regular') {assert.equal(report.artworkBody,0);assert.equal(report.detailBody,0);}
    assert.ok(report.fullArt>.9);assert.ok(report.artworkArt>.9);assert.ok(report.reverseBody>.9);assert.ok(report.hexArt>.02);assert.ok(report.detailArt>0 && report.detailArt<.8);
  }
  await page.evaluate(async()=>{
    const {buildCardFace}=await import('/src/ui/render.js');
    const set=await (await fetch('/spec/starter_card_set.json')).json();
    const def=set.cards.find(c=>c.id==='bb_clover_3');
    document.querySelector('#test-host').replaceChildren(buildCardFace(def,{large:true,interactive:false,version:'regular',foil:{mode:'details',mask:'assets/art/foil/does-not-exist.svg'}}));
  });
  const missingMask=PNG.sync.read(await page.locator('#test-host .card-face').screenshot());
  await page.evaluate(()=>window.renderFinish(null,'regular'));
  const matte=PNG.sync.read(await page.locator('#test-host .card-face').screenshot());
  assert.equal(delta(matte,missingMask,{x:20,y:100,width:190,height:130}),0,'failed mask never turns into full-art foil');
  await page.evaluate(()=>document.querySelector('#test-host').remove());
  await page.goto(baseURL);
  await page.waitForTimeout(400);
  assert.deepEqual(errors,[]);
  console.log('Browser coverage, reader, motion, viewport and app load checks passed.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
