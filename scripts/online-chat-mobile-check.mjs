import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({
  isMobile: true,
  viewport: { width: 390, height: 760 },
});

const failures = [];

await page.setContent(`<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${css}</style>
<div class="online-play-with-chat">
  <main class="app-shell-gameplay app-shell">
    <aside class="game-panel">
      <div class="gameplay-bottom-dock">
        <section class="message-box"><span>Randul tau.</span></section>
        <div class="game-actions">
          <button class="primary-button"><span>Da cu zarul</span></button>
          <button class="secondary-button"><span>Joc nou</span></button>
        </div>
      </div>
    </aside>
    <section class="scene-container">
      <button class="map-fab" aria-label="Deschide miniharta">
        <span>Harta</span>
      </button>
    </section>
  </main>
</div>
<aside class="online-room-chat" aria-label="Chat camera">
  <button class="secondary-button online-room-chat-toggle" aria-expanded="false">
    <svg></svg><span>Chat</span><svg></svg>
  </button>
</aside>`);

const rect = async (selector) =>
  page.locator(selector).evaluate((element) => {
    const r = element.getBoundingClientRect();
    return {
      bottom: r.bottom,
      height: r.height,
      left: r.left,
      right: r.right,
      top: r.top,
      width: r.width,
    };
  });

const overlapArea = (a, b) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

let chat = await rect(".online-room-chat-toggle");
const map = await rect(".map-fab");
const secondary = await rect(".game-actions .secondary-button");

if (Math.round(chat.width) !== 44 || Math.round(chat.height) !== 44) {
  failures.push(`Closed chat toggle is ${chat.width}x${chat.height}, not 44x44.`);
}

if (overlapArea(chat, map) > 0 || overlapArea(chat, secondary) > 0) {
  failures.push("Closed chat toggle overlaps the map or trailing game action.");
}

await page.locator(".online-room-chat").evaluate((element) => {
  element.classList.add("online-room-chat--open");
});
await page.locator(".online-room-chat").evaluate((element) => {
  const panel = document.createElement("div");
  panel.className = "online-room-chat-panel";
  panel.innerHTML = `
    <ul class="online-room-chat-list"><li>Niciun mesaj inca.</li></ul>
    <div class="online-room-chat-emoji"><button class="online-room-chat-emoji-btn">😀</button></div>
    <form class="online-room-chat-form">
      <input placeholder="Scrie" />
      <button class="primary-button"><span>Trimite</span></button>
    </form>
  `;
  element.append(panel);
});

chat = await rect(".online-room-chat-toggle");
const panel = await rect(".online-room-chat-panel");
const viewport = page.viewportSize();

if (
  panel.left < 0 ||
  panel.top < 0 ||
  !viewport ||
  panel.right > viewport.width ||
  panel.bottom > viewport.height
) {
  failures.push(`Open chat panel is outside the mobile viewport: ${JSON.stringify(panel)}.`);
}

if (panel.bottom > chat.top) {
  failures.push("Open chat panel does not sit above the chat toggle.");
}

await browser.close();

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Mobile chat layout check passed.");
