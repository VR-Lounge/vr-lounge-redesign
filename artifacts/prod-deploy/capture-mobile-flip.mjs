#!/usr/bin/env node
/**
 * Coarse-pointer gift-card flip proof for /opt/cursor/artifacts/vr-lounge-mobile-flip/
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

const OUT = "/opt/cursor/artifacts/vr-lounge-mobile-flip";
const URL = process.env.VRL_URL || "http://127.0.0.1:8765/?autogift=1";
const CHROME = process.env.CHROME_PATH || "google-chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("CDP timeout: " + method));
        }
      }, 30000);
    });
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const port = await freePort();
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=/tmp/vrl-chrome-flip-${port}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--window-size=390,844",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json());
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!version) {
    chrome.kill();
    throw new Error("Chrome CDP not ready");
  }

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const s = (method, params) => cdp.send(method, params, sessionId);

  await s("Page.enable");
  await s("Runtime.enable");
  await s("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await s("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await s("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "no-preference" },
      { name: "hover", value: "none" },
      { name: "pointer", value: "coarse" },
      { name: "any-hover", value: "none" },
      { name: "any-pointer", value: "coarse" },
    ],
  });

  await s("Page.navigate", { url: URL });
  await sleep(1400);
  await s("Runtime.evaluate", {
    expression: `(() => {
      const bs = document.getElementById('gift-bs');
      if (bs && bs.hidden) document.getElementById('btn-gift-open')?.click();
      const card = document.querySelector('#gift-sheet-card .vrl-gift__card');
      card?.scrollIntoView({ block: 'center' });
      return true;
    })()`,
  });
  await sleep(700);

  async function snapshot() {
    const ev = await s("Runtime.evaluate", {
      expression: `(() => {
        const root = document.getElementById('gift-sheet-card');
        const card = root.querySelector('.vrl-gift__card');
        const cs = getComputedStyle(card);
        return {
          now: performance.now(),
          classes: root.className,
          transition: cs.transition,
          transitionDuration: cs.transitionDuration,
          transform: cs.transform,
          mq: {
            coarse: matchMedia('(pointer: coarse)').matches,
            hoverNone: matchMedia('(hover: none)').matches,
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          },
          flipping: root.classList.contains('is-flipping'),
          flipped: root.classList.contains('is-flipped'),
          settled: root.classList.contains('is-face-settled'),
          frontDisplay: getComputedStyle(root.querySelector('.vrl-gift__front')).display,
          backDisplay: getComputedStyle(root.querySelector('.vrl-gift__back')).display,
        };
      })()`,
      returnByValue: true,
    });
    return ev.result.value;
  }

  const before = await snapshot();
  const shotBefore = await s("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path.join(OUT, "01-before-flip.png"), Buffer.from(shotBefore.data, "base64"));

  await s("Runtime.evaluate", {
    expression: `document.querySelector('#gift-sheet-card .vrl-gift__card').click()`,
  });

  // Wall-clock mid sample ~420ms after click (rAF starts transition ~1 frame later)
  await sleep(420);
  const mid = await snapshot();
  const shotMid = await s("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path.join(OUT, "02-mid-flip.png"), Buffer.from(shotMid.data, "base64"));

  await sleep(900);
  const after = await snapshot();
  const shotAfter = await s("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path.join(OUT, "03-after-flip.png"), Buffer.from(shotAfter.data, "base64"));

  const passChecks = {
    transitionPresent: !!(before.transition && before.transition.includes("transform") && !before.transition.includes("none")),
    durationNear900ms: !!(before.transitionDuration && (before.transitionDuration.includes("0.9s") || before.transitionDuration.includes("900ms"))),
    coarsePointerTrue: !!before.mq.coarse,
    midFlipping: !!mid.flipping,
    midNotSettled: mid.settled === false,
    midBothFacesInTree: mid.frontDisplay !== "none" && mid.backDisplay !== "none",
    midTransform3d: !!(mid.transform && mid.transform.startsWith("matrix3d")),
    afterSettledFrontHidden: after.flipped === true && after.settled === true && after.frontDisplay === "none",
  };

  const report = {
    url: URL,
    emulated: {
      viewport: "390x844@3",
      pointer: "coarse",
      hover: "none",
      reducedMotion: "no-preference",
    },
    before,
    mid,
    after,
    passChecks,
  };

  await writeFile(path.join(OUT, "flip-report.json"), JSON.stringify(report, null, 2));
  await writeFile(
    path.join(OUT, "README.md"),
    [
      "# VR Lounge mobile flip proof",
      "",
      `- URL: ${URL}`,
      "- Emulation: iPhone 390x844, pointer:coarse, hover:none",
      `- Computed transition (before flip): \`${before.transition}\``,
      `- Mid-flip classes: \`${mid.classes}\``,
      `- Mid-flip transform: \`${mid.transform}\``,
      `- Pass checks: ${JSON.stringify(passChecks)}`,
      "",
      "Artifacts: 01-before-flip.png, 02-mid-flip.png, 03-after-flip.png, flip-report.json",
      "",
    ].join("\n")
  );

  console.log(JSON.stringify(passChecks, null, 2));
  console.log("before.transition:", before.transition);
  console.log("mid.transform:", mid.transform);
  console.log("mid.classes:", mid.classes);

  ws.close();
  chrome.kill("SIGKILL");
  const failed = Object.entries(passChecks).filter(([, v]) => !v);
  if (failed.length) {
    console.error("FAILED checks:", failed.map(([k]) => k).join(", "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
