const { chromium } = require('playwright');

(async () => {
  const baseUrl = 'http://127.0.0.1:5174';
  const email = 'avatar_flow_5485@example.com';
  const password = 'secret123';
  const filePath = 'C:/BaiTap/CDCN/edit_admin/avatar_test.png';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let uploadResponse = null;
  const failedRequests = [];

  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/users/me/avatar')) {
      uploadResponse = {
        status: response.status(),
        url: response.url(),
        body: await response.text().catch(() => null),
      };
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure() });
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

    const beforeSrc = await page.locator('aside img').first().getAttribute('src');
    const beforeLoaded = await page.locator('aside img').first().evaluate((img) => img.complete && img.naturalWidth > 0);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const afterSrc = await page.locator('aside img').first().getAttribute('src');
    const afterLoaded = await page.locator('aside img').first().evaluate((img) => img.complete && img.naturalWidth > 0);

    console.log(JSON.stringify({ uploadResponse, beforeSrc, beforeLoaded, afterSrc, afterLoaded, failedRequests }, null, 2));
  } catch (e) {
    console.error('FLOW_ERROR', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
