const { chromium } = require('playwright');

(async () => {
  const baseUrl = 'http://127.0.0.1:5174';
  const email = process.env.AVATAR_TEST_EMAIL;
  const password = process.env.AVATAR_TEST_PASS;
  const filePath = 'C:/BaiTap/CDCN/edit_admin/avatar_test.png';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const httpErrors = [];

  page.on('response', async (response) => {
    const status = response.status();
    if (status >= 400) {
      let body = null;
      try { body = await response.text(); } catch {}
      httpErrors.push({ status, url: response.url(), body: body && body.slice(0, 300) });
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
    await page.locator('button').nth(7).click();
    await page.waitForTimeout(3000);
    console.log(JSON.stringify({ httpErrors }, null, 2));
  } catch (error) {
    console.error('FLOW_ERROR', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
