// Generates a print/share poster (poster.png) with the form's QR code, the
// logo and the sponsor list — all pulled from packages/config.
//
//   node scripts/poster.mjs <form-url>
//
// Needs Chrome/Chromium to rasterise the HTML. If none is found the HTML is
// left at scripts/.poster.html so you can open it and export a PNG by hand.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { siteConfig } from "@openruleta/config";

const URL = process.argv[2];
if (!URL) {
  console.error("Usage: node scripts/poster.mjs <form-url>");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "poster.png");
const HTML = path.join(ROOT, "scripts", ".poster.html");

const mimeFor = (rel) => (rel.endsWith(".svg") ? "image/svg+xml" : "image/png");
const dataUri = (rel) => {
  const file = path.join(ROOT, "public", rel.replace(/^\//, ""));
  return `data:${mimeFor(rel)};base64,${readFileSync(file).toString("base64")}`;
};

const qrDataUri = await QRCode.toDataURL(URL, {
  margin: 1,
  width: 900,
  errorCorrectionLevel: "H",
});

const chips = siteConfig.sponsors
  .map((s) =>
    s.src && existsSync(path.join(ROOT, "public", s.src.replace(/^\//, "")))
      ? `<div class="chip"><img alt="${s.name}" src="${dataUri(s.src)}"></div>`
      : `<div class="chip chip--text">${s.name}</div>`,
  )
  .join("\n");

const host = URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

const html = `<!doctype html><html lang="${siteConfig.lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1600px}
  body{
    font-family:Montserrat,ui-sans-serif,system-ui,Arial,sans-serif;
    background:
      radial-gradient(900px 520px at 50% -8%, rgba(255,255,255,.16), transparent 60%),
      linear-gradient(160deg,#2563eb 0%,#1e3a8a 100%);
    color:#fff;display:flex;flex-direction:column;align-items:center;
    padding:70px 72px 60px;text-align:center;
  }
  .logo{background:#fff;border-radius:22px;padding:18px 26px}
  .logo img{height:88px;display:block}
  h1{font-weight:800;font-size:76px;line-height:1.05;letter-spacing:-.02em;margin-top:48px}
  .sub{margin-top:18px;font-size:24px;font-weight:600;color:rgba(255,255,255,.82);text-transform:uppercase;letter-spacing:.13em}
  .qrcard{background:#fff;border-radius:40px;padding:42px;margin-top:44px;box-shadow:0 30px 80px rgba(0,20,60,.35)}
  .qrcard img{width:516px;height:516px;display:block}
  .hint{margin-top:18px;font-size:23px;color:#0b3b73;font-weight:600}
  .url{margin-top:26px;font-size:27px;font-weight:700;color:#fff;background:rgba(255,255,255,.14);padding:13px 28px;border-radius:9999px}
  .apoyo{margin-top:auto;padding-top:42px;font-size:20px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.7)}
  .chips{margin-top:22px;display:flex;flex-wrap:wrap;gap:15px;justify-content:center;max-width:960px}
  .chip{background:#fff;border-radius:14px;height:82px;width:145px;display:flex;align-items:center;justify-content:center;padding:13px}
  .chip img{max-height:46px;max-width:118px;object-fit:contain}
  .chip--text{color:#0b3b73;font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:.04em}
</style></head><body>
  <div class="logo"><img alt="${siteConfig.name}" src="${dataUri(siteConfig.assets.logo)}"></div>
  <h1>SCAN THE QR<br>TO ENTER</h1>
  <div class="sub">${siteConfig.name}</div>
  <div class="qrcard">
    <img alt="QR" src="${qrDataUri}">
    <div class="hint">Point your phone camera at it</div>
  </div>
  <div class="url">${host}</div>
  <div class="apoyo">WITH SUPPORT FROM</div>
  <div class="chips">${chips}</div>
</body></html>`;

writeFileSync(HTML, html);

const CHROME_CANDIDATES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "brave-browser",
];

let rendered = false;
for (const bin of CHROME_CANDIDATES) {
  try {
    execFileSync(
      bin,
      [
        "--headless",
        "--no-sandbox",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1080,1600",
        `--screenshot=${OUT}`,
        `file://${HTML}`,
      ],
      { stdio: "ignore" },
    );
    rendered = true;
    console.log(`Poster generated: ${path.relative(ROOT, OUT)}`);
    break;
  } catch {
    // try the next candidate
  }
}

if (!rendered) {
  console.log(
    `No Chrome/Chromium found. Open ${path.relative(ROOT, HTML)} and export it as PNG.`,
  );
}
