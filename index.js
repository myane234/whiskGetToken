  import fs from "fs";
  import path from "path";
  import puppeteer from "puppeteer";

  const PROFILE_DIR = "D:/chrome-profiles";
  const TOKEN_TIMEOUT = 20000;
  const DELAY_BETWEEN = 3000;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const textArea = `textarea`;

  const outputFile = path.join("D:", "tokens.txt");

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

      

      page.on("response", async (res) => {
        if (res.url().includes("/api/auth/session") && !token) {
          try {
            const data = await res.json();
            if (data.access_token) {
              token = data.access_token;
            }
          } catch {}
        }
      });

      await page.goto(
        "https://labs.google/fx/tools/whisk/project",
        { waitUntil: "domcontentloaded" }
      );

      // refresh sampai 3 kali kalau belum dapat token
      for (let i = 0; i < 3 && !token; i++) {

        console.log(`${profile} refresh ${i + 1}`);

        await page.reload({ waitUntil: "networkidle2" });

        const start = Date.now();

        while (!token && Date.now() - start < TOKEN_TIMEOUT) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      await page.waitForSelector(textArea, { timeout: 15000 });

      await page.focus(textArea);
      await page.click(textArea);

      await delay(2000)

      await page.type(textArea, "nice girl");

      if (token) {
        console.log(`${profile} -> ${token.slice(0, 30)}...`);
      } else {
        console.log(` ${profile} token not found`);
      }

      await page.close();
      await browser.close();

      return token;

    } catch (err) {

      console.log(`Error profile ${profile}:`, err.message);

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

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN));
    }

    const merged = tokens.join(",");

    console.log("\nALL TOKENS:");
    console.log(merged);

    fs.writeFileSync(outputFile, merged, "utf8");

    console.log(`Token di simpan di ${outputFile}`);
  }

  main();