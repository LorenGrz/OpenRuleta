import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const url = process.argv[2] ?? process.env.DEPLOY_URL;

if (!url) {
  console.error("Usage: pnpm --filter @openruleta/form qr <form-url>");
  console.error(
    "   or: DEPLOY_URL=<form-url> pnpm --filter @openruleta/form qr",
  );
  process.exit(1);
}

const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 512 });
await writeFile("qr.svg", svg);
await QRCode.toFile("qr.png", url, { margin: 1, width: 1024 });

console.log(`QR generated for ${url}\n  -> qr.svg\n  -> qr.png`);
