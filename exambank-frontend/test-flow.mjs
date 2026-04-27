
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("login") || msg.text().includes("failed")) {
        console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    }
  });

  try {
    console.log("Navigating to login...");
    await page.goto("http://localhost:5174/login");
    
    console.log("Entering credentials...");
    await page.fill("input[type=\"email\"]", "admin@exambank.local");
    await page.fill("input[type=\"password\"]", "Admin@12345");
    
    console.log("Clicking Login button...");
    const loginPromise = page.waitForResponse(response => 
        response.url().includes("/login") && response.status() >= 200,
        { timeout: 10000 }
    ).catch(e => { console.log("Did not see login response in 10s"); return null; });

    await page.click("button:has-text(\"Ðang nh?p\")");

    const response = await loginPromise;
    if (response) {
        console.log("Login Response Status:", response.status());
        try {
            console.log("Login Response Body:", await response.text());
        } catch(e) {}
    }

    await page.waitForTimeout(5000);
    console.log("Current URL:", page.url());
    console.log("Cookies:", await context.cookies());

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();

