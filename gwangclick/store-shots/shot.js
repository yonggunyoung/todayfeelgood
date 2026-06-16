const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    defaultViewport: { width: 412, height: 892, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    executablePath: exe,
    headless: true,
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('file:///tmp/shots/site/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(()=>{});
  await page.waitForSelector('#ig-a', { timeout: 8000 }).catch(()=>{});
  await sleep(1100);
  await page.screenshot({ path: '/tmp/shots/01-intro.png' });
  console.log('intro shot');

  // 배틀 시작
  await page.evaluate(() => window.GO && GO('a'));
  await page.waitForSelector('#fb-tap', { timeout: 8000 });
  await sleep(300);
  // 광클 시뮬레이션 (콤보 쌓기)
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => {
      const st = document.getElementById('fb-stage');
      const b = document.getElementById('fb-tap');
      if (!st || !b) return;
      const r = b.getBoundingClientRect();
      st.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: r.left + r.width / 2 + (Math.random()*40-20),
        clientY: r.top + r.height / 2 + (Math.random()*40-20),
        bubbles: true
      }));
    });
    await sleep(28);
  }
  await sleep(450);
  await page.screenshot({ path: '/tmp/shots/02-battle.png' });
  console.log('battle shot');

  // 강제 종료 → 결과
  await page.evaluate(() => { if (window.B) B.endsAt = performance.now() - 1; });
  await page.waitForSelector('.verdict', { timeout: 8000 }).catch(()=>{});
  await sleep(4200);
  await page.screenshot({ path: '/tmp/shots/03-result.png' });
  console.log('result shot');

  // 전국 랭킹판
  await page.evaluate(() => window.rankBoard && rankBoard());
  await page.waitForSelector('#rb-list', { timeout: 8000 }).catch(()=>{});
  await sleep(900);
  await page.screenshot({ path: '/tmp/shots/04-ranking.png' });
  console.log('ranking shot');

  await browser.close();
  console.log('SHOTS DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
