import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const PROFILE_DIR = "D:/chrome-profiles"; // folder tempat semua profile
const TOKEN_TIMEOUT = 20000; // ms max tunggu token
const DELAY_BETWEEN = 3000; // ms delay antar profile

async function grabToken(profile) {
  console.log(`Launch ${profile}`);

  const profilePath = path.join(PROFILE_DIR, profile);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      userDataDir: profilePath,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-features=site-per-process",
      ],
    });

    const page = await browser.newPage();
    let token = null;

    // tangkap token dari response
    page.on("response", async (res) => {
      if (res.url().includes("/api/auth/session") && !token) {
        try {
          const data = await res.json();
          token = data.access_token;
        } catch {}
      }
    });

    
    await page.goto(
      "https://labs.google/fx/tools/whisk/project",
      { waitUntil: "domcontentloaded" }
    );

    const start = Date.now();
    while (!token && Date.now() - start < TOKEN_TIMEOUT) {
      await new Promise((r) => setTimeout(r, 500));
    }

    if (token) {
      console.log(`${profile} -> ${token.slice(0, 30)}...`);
    } else {
      console.log(`❌ ${profile} token not found`);
    }

    await page.close();
    await browser.close();
    return token;

  } catch (err) {
    console.log(` Error profile ${profile}:`, err.message);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

async function main() {
  const profiles = fs.readdirSync(PROFILE_DIR).filter((f) =>
    fs.statSync(path.join(PROFILE_DIR, f)).isDirectory()
  );

  const tokens = [];

  for (const profile of profiles) {
    const token = await grabToken(profile);

    if (token) tokens.push(token);

    // delay biar Windows release folder
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN));
  }

  
  const merged = tokens.join(",");

  console.log("\nALL TOKENS:");
  console.log(merged);

  fs.writeFileSync("tokens.txt", merged);
}

main();