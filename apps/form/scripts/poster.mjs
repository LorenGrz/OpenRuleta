// Generates the landscape (1920x1080) QR poster the wheel projects full-screen
// behind "Show QR": logo, headline, sponsor chips and the form's QR code — all
// pulled from packages/config (`siteConfig.poster`, `assets.logo`, `sponsors`).
//
//   pnpm poster <form-url>          (from the repo root)
//   node scripts/poster.mjs <form-url>
//
// Writes straight into apps/ruleta/public/poster.png. Point
// `siteConfig.assets.poster` at "/poster.png" to project it.
//
// Needs Chrome/Chromium/Brave to rasterise the HTML. If none is found the HTML
// is left at scripts/.poster.html so you can open it and export a PNG by hand.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { siteConfig } from "@openruleta/config";

const URL = process.argv[2];
if (!URL) {
  console.error("Usage: pnpm poster <form-url>");
  process.exit(1);
}

const WIDTH = 1920;
const HEIGHT = 1080;

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.resolve(ROOT, "..", "ruleta", "public", "poster.png");
const HTML = path.join(ROOT, "scripts", ".poster.html");

const p = siteConfig.poster;
const font = p.font ?? "Montserrat";
const logoCard = p.logoCard ?? true;

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const mimeFor = (rel) => (rel.endsWith(".svg") ? "image/svg+xml" : "image/png");
const publicFile = (rel) => path.join(ROOT, "public", rel.replace(/^\//, ""));
const dataUri = (rel) =>
  `data:${mimeFor(rel)};base64,${readFileSync(publicFile(rel)).toString("base64")}`;

const qrDataUri = await QRCode.toDataURL(URL, {
  margin: 1,
  width: 1200,
  errorCorrectionLevel: "H",
});

const chips = siteConfig.sponsors
  .map((s) =>
    s.src && existsSync(publicFile(s.src))
      ? `<div class="chip"><img alt="${esc(s.name)}" src="${dataUri(s.src)}"></div>`
      : `<div class="chip chip--text">${esc(s.name)}</div>`,
  )
  .join("\n");

const host = URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
const title = p.title.split("\n").map(esc).join("<br>");
const fontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replaceAll("%20", "+")}:wght@500;600;700;800&display=swap`;

const html = `<!doctype html><html lang="${esc(siteConfig.lang)}"><head><meta charset="utf-8">
<link href="${fontHref}" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
  body{
    font-family:'${font}',ui-sans-serif,system-ui,Arial,sans-serif;
    background:${p.background};
    color:#fff;display:flex;align-items:center;gap:88px;
    padding:60px 96px;
  }
  .left{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:center}
  .logo{align-self:flex-start}
  .logo--card{background:#fff;border-radius:24px;padding:20px 30px}
  .logo img{height:${logoCard ? 92 : 120}px;display:block}
  h1{font-weight:800;font-size:108px;line-height:1.02;letter-spacing:-.025em;margin-top:56px}
  .sub{margin-top:26px;font-size:32px;font-weight:600;color:rgba(255,255,255,.82);text-transform:uppercase;letter-spacing:.13em}
  .support{margin-top:72px}
  .support-label{font-size:20px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.7);text-transform:uppercase}
  .chips{margin-top:20px;display:flex;flex-wrap:wrap;gap:14px}
  .chip{background:#fff;border-radius:14px;height:76px;width:138px;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center}
  .chip img{max-height:44px;max-width:112px;object-fit:contain}
  .chip--text{color:${p.ink};font-weight:700;font-size:14px;line-height:1.15;text-transform:uppercase;letter-spacing:.03em}
  .right{display:flex;flex-direction:column;align-items:center}
  .qrcard{background:#fff;border-radius:44px;padding:32px 32px 22px;box-shadow:0 0 0 6px ${p.accent},0 30px 90px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center}
  .qrcard img{width:780px;height:780px;display:block}
  .hint{margin-top:12px;font-size:26px;color:${p.ink};font-weight:600}
  .url{margin-top:26px;font-size:30px;font-weight:700;color:#fff;background:${p.accent};padding:12px 32px;border-radius:9999px}
</style></head><body>
  <div class="left">
    <div class="logo${logoCard ? " logo--card" : ""}"><img alt="${esc(siteConfig.name)}" src="${dataUri(siteConfig.assets.logo)}"></div>
    <h1>${title}</h1>
    <div class="sub">${esc(p.subtitle)}</div>
    ${
      siteConfig.sponsors.length
        ? `<div class="support"><div class="support-label">${esc(p.supportLabel)}</div><div class="chips">${chips}</div></div>`
        : ""
    }
  </div>
  <div class="right">
    <div class="qrcard">
      <img alt="QR" src="${qrDataUri}">
      <div class="hint">${esc(p.hint)}</div>
    </div>
    <div class="url">${esc(host)}</div>
  </div>
</body></html>`;

writeFileSync(HTML, html);

const CHROME_CANDIDATES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "brave",
  "brave-browser",
  "/opt/brave-bin/brave",
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
        // give the web font time to load before the screenshot
        "--virtual-time-budget=5000",
        "--force-device-scale-factor=1",
        `--window-size=${WIDTH},${HEIGHT}`,
        `--screenshot=${OUT}`,
        `file://${HTML}`,
      ],
      { stdio: "ignore" },
    );
    rendered = true;
    console.log(`Poster generated (${WIDTH}x${HEIGHT}): ${OUT}`);
    if (siteConfig.assets.poster !== "/poster.png") {
      console.log(
        `Note: siteConfig.assets.poster is "${siteConfig.assets.poster}" — set it to "/poster.png" to project this poster.`,
      );
    }
    break;
  } catch {
    // try the next candidate
  }
}

if (!rendered) {
  console.log(
    `No Chrome/Chromium/Brave found. Open ${HTML} and export it as a ${WIDTH}x${HEIGHT} PNG to ${OUT}.`,
  );
}
