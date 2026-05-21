const { chromium } = require('playwright');

(async () => {
  const baseUrl = 'http://127.0.0.1:5174';
  const email = process.env.AVATAR_TEST_EMAIL;
  const password = process.env.AVATAR_TEST_PASS;
  const filePath = 'C:/BaiTap/CDCN/edit_admin/avatar_test.png';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const failedRequests = [];
  const consoleErrors = [];
  let uploadResponse = null;

  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure() }));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/users/me/avatar')) {
      let body = null;
      try { body = await response.text(); } catch {}
      uploadResponse = { status: response.status(), url, body };
    }
  });

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2200);

    await page.goto(`${baseUrl}/user/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await page.locator('input[type="file"]').first().setInputFiles(filePath);
    await page.waitForTimeout(500);

    const allButtons = page.locator('button');
    const allTexts = (await allButtons.allTextContents()).map((t) => t.trim());

    await allButtons.nth(7).click();
    await page.waitForTimeout(3500);

    const noticeText = await page.locator('div.rounded-2xl.border.px-4.py-3.text-sm').first().textContent().catch(() => null);
    const avatarBeforeReload = await page.locator('aside img').first().getAttribute('src');
    const loadedBeforeReload = await page.locator('aside img').first().evaluate((img) => img.complete && img.naturalWidth > 0);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const avatarAfterReload = await page.locator('aside img').first().getAttribute('src');
    const loadedAfterReload = await page.locator('aside img').first().evaluate((img) => img.complete && img.naturalWidth > 0);

    console.log(JSON.stringify({ email, allTexts, uploadResponse, noticeText, avatarBeforeReload, loadedBeforeReload, avatarAfterReload, loadedAfterReload, failedRequests, consoleErrors }, null, 2));
  } catch (error) {
    console.error('FLOW_ERROR', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
