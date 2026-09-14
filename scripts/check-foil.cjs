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

  // Test visible, moving light on the actual commissioned masks, not only the demo shapes.
  function lightDifference(a, b) {
    let changed = 0, energy = 0, peak = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const channels = [0, 1, 2].map(c => Math.abs(a.data[i+c] - b.data[i+c]));
      const difference = Math.max(...channels);
      if (difference > 8) { changed++; energy += channels.reduce((sum, x) => sum + x, 0) / 3; }
      peak = Math.max(peak, difference);
    }
    return { changed, mean: energy / Math.max(changed, 1), peak };
  }
  for (const id of ['mk_comet_astronaut_5', 'ns_flint_0', 'mk_earl_tea_house_keeper_4']) {
    for (const large of [false, true]) {
      const captures = [];
      for (const foil of [false, undefined]) {
        await page.evaluate(async ({ id, large, foil }) => {
          const { buildCardFace } = await import('/src/ui/render.js');
          const sets = await Promise.all(['starter_card_set', 'maker_card_set'].map(async name => (await (await fetch(`/spec/${name}.json`)).json()).cards));
          const card = buildCardFace(sets.flat().find(def => def.id === id), { large, interactive: false, version: 'foil', foil });
          document.querySelector('#test-host').replaceChildren(card);
          await Promise.all([...new Set([...card.querySelectorAll('image')].map(image => image.getAttribute('href')))].map(async url => {
            const image = new Image(); image.src = url; await image.decode();
          }));
          const { setPace } = await import('/src/ui/fx.js');
          setPace('storybook');
          for (const animation of card.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 0; }
        }, { id, large, foil });
        captures.push(PNG.sync.read(await page.locator('#test-host .art').screenshot()));
      }
      await page.locator('#test-host .foil-sheen').evaluate(el => {
        for (const animation of el.getAnimations()) animation.currentTime = 2000;
      });
      const later = PNG.sync.read(await page.locator('#test-host .art').screenshot());
      const visible = lightDifference(captures[0], captures[1]);
      const moving = lightDifference(captures[1], later);
      assert.ok(visible.changed > 5 && visible.peak > 40, `${id}/${large}: detail foil is visible`);
      assert.ok(moving.changed > 5 && moving.mean > 15, `${id}/${large}: reflected light visibly sweeps`);
      console.log('Detail light', id, large ? 'large' : 'table', { visible, moving });
    }
  }
  await page.evaluate(()=>document.querySelector('#test-host').remove());
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('#welcomePlayBtn').click();
  await page.locator('#screen-home button').nth(2).click();
  await page.getByRole('button', { name: 'Foil · 15', exact: true }).click();
  const bookFaces = page.locator('#bookHost .card-face');
  assert.equal(await bookFaces.count(), 15);
  assert.ok(await bookFaces.evaluateAll(els => els.every(el => el.dataset.version === 'foil')));
  assert.deepEqual(await bookFaces.evaluateAll(els => els.reduce((counts, el) => {
    counts[el.dataset.foil] = (counts[el.dataset.foil] || 0) + 1;
    return counts;
  }, {})), { full: 3, artwork: 3, details: 3, reverse: 3, hexagon: 3 });
  await page.locator('#bookHost .foil-details .inspect-card').first().click();
  assert.equal(await page.locator('.card-reader .card-face').getAttribute('data-version'), 'foil');
  assert.equal(await page.locator('.card-reader .card-face').getAttribute('data-foil'), 'details');
  const readerFace = page.locator('.card-reader .card-face');
  await readerFace.hover({ position: { x: 40, y: 120 } });
  assert.ok(await readerFace.evaluate(el => el.style.getPropertyValue('--mx')), 'reader tracks reflected light');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const stillPointer = await readerFace.evaluate(el => el.style.getPropertyValue('--mx'));
  await readerFace.hover({ position: { x: 120, y: 140 } });
  assert.equal(await readerFace.evaluate(el => el.style.getPropertyValue('--mx')), stillPointer);
  assert.equal(await readerFace.locator('.foil-sheen').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('Escape');
  await page.locator('#bookHost .book-card').first().getByRole('button', { name: 'Regular', exact: true }).click();
  assert.equal(await bookFaces.first().getAttribute('data-version'), 'regular');
  await page.getByRole('button', { name: 'Foil · 15', exact: true }).click();
  await page.getByRole('button', { name: 'Foil · 15', exact: true }).click();
  assert.ok(await bookFaces.evaluateAll(els => els.every(el => el.dataset.version === 'foil')));
  assert.deepEqual(errors,[]);
  console.log('Browser coverage, reader, motion, viewport and all 15 Book foil printings passed.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
