
import { test, expect } from "@playwright/test";

test("Avatar upload flow", async ({ page }) => {
  const loginUrl = "http://localhost:5174/login";
  const profileUrl = "http://localhost:5174/admin/profile";
  const email = "hungdz@gmail.com";
  const password = "Monmoncute@123";
  const pngPath = "small.png";

  console.log("Navigating to login...");
  await page.goto(loginUrl);
  
  const emailInput = page.locator("input[type=\"email\"], input[placeholder*=\"Email\"], input[name=\"email\"]").first();
  const passInput = page.locator("input[type=\"password\"], input[placeholder*=\"Password\"], input[name=\"password\"]").first();
  
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);
  await passInput.fill(password);
  
  const loginButton = page.locator("button[type=\"submit\"], button:has-text(\"Login\"), button:has-text(\"Sign in\")").first();
  await loginButton.click();
  
  console.log("Waiting for navigation after login...");
  await page.waitForTimeout(5000); 

  console.log("Navigating to profile...");
  await page.goto(profileUrl);
  await page.waitForLoadState("networkidle");

  const screenshotPath = "profile-screenshot.png";
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Detailed logging
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img")).map(img => ({
      src: img.src,
      alt: img.alt,
      className: img.className
    }));
  });
  console.log("Images on page:", JSON.stringify(images, null, 2));

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).map(btn => btn.innerText);
  });
  console.log("Buttons on page:", buttons);

  console.log("Looking for upload options...");
  const uploadInput = page.locator("input[type=\"file\"]");
  
  if (await uploadInput.count() > 0) {
      await uploadInput.setInputFiles(pngPath);
      console.log("Found file input, uploaded small.png");
  } else {
      console.log("No file input found. Trying to find a clickable image or button...");
      const imgToClick = page.locator("img").first();
      if (await imgToClick.count() > 0) {
          console.log("Clicking the first image to trigger upload...");
          const fileChooserPromise = page.waitForEvent("filechooser").catch(() => null);
          await imgToClick.click();
          const fileChooser = await fileChooserPromise;
          if (fileChooser) {
              await fileChooser.setFiles(pngPath);
              console.log("Uploaded via filechooser");
          }
      }
  }

  const saveBtn = page.locator("button:has-text(\"Save\"), button:has-text(\"Update\"), button[type=\"submit\"]").first();
  if (await saveBtn.count() > 0) {
      await saveBtn.click();
      console.log("Clicked save button");
  } else {
      console.log("No save button found");
  }
  
  await page.waitForTimeout(4000);

  const avatarImg = page.locator("img").first();
  const src = await avatarImg.getAttribute("src").catch(() => "Not found");
  const isLoaded = await avatarImg.evaluate(img => img.complete && img.naturalHeight !== 0).catch(() => false);
  
  console.log(`Final Avatar Src: ${src}`);
  console.log(`Avatar Loaded: ${isLoaded}`);
  
  const auth = await page.evaluate(() => ({
    ls: JSON.stringify(localStorage),
    ss: JSON.stringify(sessionStorage)
  }));
  console.log(`Auth Info: ${auth.ls}`);

  await page.reload();
  await page.waitForTimeout(2000);
  const isLoadedAfter = await avatarImg.evaluate(img => img.complete && img.naturalHeight !== 0).catch(() => false);
  console.log(`Avatar Loaded After Reload: ${isLoadedAfter}`);
});
