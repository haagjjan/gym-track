// Renders the app icon and splash images for iOS and Android from the GymTrack mark
// (the same dumbbell as apps/web/src/app/icon.svg) on the dark app background.
// Run from the repository root: node apps/mobile/scripts/make-icons.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobile = path.resolve(here, "..");
const { chromium } = createRequire(path.resolve(mobile, "../web/package.json"))("@playwright/test");

const BACKGROUND = "#0b0d10";
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 9.5 26 13">
  <g fill="#0096a0"><rect x="3.5" y="12.5" width="3" height="7" rx="0.5"/><rect x="25.5" y="12.5" width="3" height="7" rx="0.5"/></g>
  <g fill="#2dd4e6"><rect x="6.5" y="10" width="3" height="12" rx="0.5"/><rect x="22.5" y="10" width="3" height="12" rx="0.5"/><rect x="9" y="14.5" width="14" height="3"/></g>
</svg>`;

const res = path.join(mobile, "android/app/src/main/res");
const ios = path.join(mobile, "ios/App/App/Assets.xcassets");
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const splashPort = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };

/** One image: the mark at `scale` of the shorter side, on `background` (or transparent), clipped by `radius`. */
const jobs = [{ file: path.join(ios, "AppIcon.appiconset/AppIcon-512@2x.png"), w: 1024, h: 1024, scale: 0.6 }];

for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  jobs.push({ file: path.join(ios, "Splash.imageset", name), w: 2732, h: 2732, scale: 0.16 });
}

for (const [density, factor] of Object.entries(densities)) {
  const dir = path.join(res, `mipmap-${density}`);
  jobs.push({ file: path.join(dir, "ic_launcher.png"), w: 48 * factor, h: 48 * factor, scale: 0.6, radius: "18%" });
  jobs.push({ file: path.join(dir, "ic_launcher_round.png"), w: 48 * factor, h: 48 * factor, scale: 0.56, radius: "50%" });
  // Adaptive icon foreground: 108dp canvas, only the middle 66dp is always visible.
  jobs.push({ file: path.join(dir, "ic_launcher_foreground.png"), w: 108 * factor, h: 108 * factor, scale: 0.4, transparent: true });
  const [w, h] = splashPort[density];
  jobs.push({ file: path.join(res, `drawable-port-${density}/splash.png`), w, h, scale: 0.3 });
  jobs.push({ file: path.join(res, `drawable-land-${density}/splash.png`), w: h, h: w, scale: 0.3 });
}

jobs.push({ file: path.join(res, "drawable/splash.png"), w: 480, h: 320, scale: 0.3 });

const browser = await chromium.launch();

for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: Math.round(job.w), height: Math.round(job.h) } });
  const size = Math.round(Math.min(job.w, job.h) * job.scale);

  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:${job.transparent ? "transparent" : BACKGROUND};border-radius:${job.radius ?? 0}"><div style="width:${size}px">${MARK}</div></div></body>`);
  await page.screenshot({ path: job.file, omitBackground: Boolean(job.transparent || job.radius) });
  await page.close();
}

await browser.close();
console.log(`${jobs.length} images written.`);
