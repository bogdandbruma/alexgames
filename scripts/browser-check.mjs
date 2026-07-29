import { chromium } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5174";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const failures = [];
const consoleMessages = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
  }
});

page.on("pageerror", (error) => {
  failures.push(`Page error: ${error.message}`);
});

await page.addInitScript(() => {
  if (!sessionStorage.getItem("space-board-demo-test-started")) {
    localStorage.removeItem("space-board-demo");
    sessionStorage.setItem("space-board-demo-test-started", "true");
  }

  Math.random = () => 0.2;
});

await page.goto(appUrl, { waitUntil: "load" });
await page.getByRole("heading", { name: "Jocurile Brumix" }).waitFor();
await page.getByRole("button", { name: /Joac/i }).click();
await page.getByRole("heading", { name: /Cursa spa.ial/i }).waitFor();
await page.locator("canvas").waitFor();
await page.waitForTimeout(2500);

const canvasPainted = await page.locator("canvas").evaluate((canvas) => {
  const gl =
    canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ??
    canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    return false;
  }

  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  let variedPixels = 0;
  for (let index = 0; index < pixels.length; index += 64) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];

    if (r !== 16 || g !== 17 || b !== 19) {
      variedPixels += 1;
    }
  }

  return variedPixels > 100;
});

if (!canvasPainted) {
  failures.push("The WebGL canvas did not appear to paint scene pixels.");
}

const setupPlayers = page.locator(".setup-player");
if ((await setupPlayers.count()) !== 2) {
  failures.push("The default setup list did not show two players.");
}

await setupPlayers.nth(0).getByLabel("Nume").fill("Mara");
await setupPlayers.nth(0).getByRole("button", { name: /^Schimbă$/i }).click();
await page.getByRole("dialog", { name: /Alege personajul/i }).getByRole("button", { name: /Iepure/i }).click();
await setupPlayers.nth(1).getByLabel("Nume").fill("Alex");
await setupPlayers.nth(1).getByRole("button", { name: /Juc.tor/i }).click();
await setupPlayers.nth(1).getByRole("button", { name: /^Schimbă$/i }).click();
await page.getByRole("dialog", { name: /Alege personajul/i }).getByRole("button", { name: /Pisic/i }).click();

await page.getByRole("button", { name: /ncepe jocul/i }).click();
await page.locator(".player-roster").getByText("Mara", { exact: true }).waitFor();
await page.locator(".player-roster").getByText("Alex", { exact: true }).waitFor();

await page.evaluate(() => {
  window.__roomSamples = [];
  window.__roomSampleTimer = window.setInterval(() => {
    const roomText =
      document.querySelector('[aria-label^="Camera"] strong')
        ?.textContent ?? "";
    window.__roomSamples.push(roomText.trim());
  }, 40);
});

await page.getByRole("button", { name: /^D. cu zarul$/i }).click();
await page.getByText(/R.ndul lui Alex/i).waitFor({
  timeout: 15000,
});

const roomSamples = await page.evaluate(() => {
  window.clearInterval(window.__roomSampleTimer);
  return window.__roomSamples;
});

if (
  !roomSamples.some((room) => room.startsWith("2.")) ||
  !roomSamples.some((room) => room.startsWith("3."))
) {
  failures.push(
    `Intermediate rooms were not sampled during movement: ${roomSamples.join(
      ", ",
    )}`,
  );
}

const diceValue = Number(
  await page.locator(".dice-readout strong").textContent(),
);
if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) {
  failures.push(`Dice result was not between 1 and 6: ${diceValue}`);
}

const visiblePips = await page.locator(".dice-pip").count();
if (visiblePips !== diceValue) {
  failures.push(
    `Dice tray showed ${visiblePips} pips for dice value ${diceValue}.`,
  );
}

const rollButton = page.getByRole("button", { name: /^D. cu zarul$/i });
if (!(await rollButton.isEnabled())) {
  failures.push("The next human player could not roll after the first turn.");
}

await page.reload({ waitUntil: "load" });
await page.locator(".player-roster").getByText("Alex", { exact: true }).waitFor();
await page.getByText(/R.ndul lui Alex/i).waitFor();

await page.evaluate(() => {
  const rawState = localStorage.getItem("space-board-demo");

  if (!rawState) {
    throw new Error("Missing persisted Space Board state.");
  }

  const persisted = JSON.parse(rawState);
  const players = persisted.state.players.map((player, index) => ({
    ...player,
    armedCoinsX3: false,
    armedDiceX2: false,
    coins: 0,
    inventory: [],
    lastDice: null,
    positionIndex: index === 0 ? 64 : 0,
    trapped: false,
  }));

  persisted.state = {
    ...persisted.state,
    currentPlayerIndex: 0,
    diceValue: null,
    message: `Rândul lui ${players[0].name}.`,
    phase: "playing",
    players,
    winnerId: null,
  };

  localStorage.setItem("space-board-demo", JSON.stringify(persisted));
});

await page.reload({ waitUntil: "load" });
await page.locator(".player-roster").getByText("Mara", { exact: true }).waitFor();
await page
  .locator('[aria-label^="Camera"] strong')
  .filter({ hasText: /^65\./ })
  .waitFor();
await page.getByRole("button", { name: /^D. cu zarul$/i }).click();
await page.locator(".victory-overlay").waitFor({
  timeout: 16000,
});
await page.getByText(/Mara a ajuns pe Luna/i).waitFor();
await page.getByRole("button", { name: "Revansa" }).first().click();
await page.locator(".player-roster").getByText("Mara", { exact: true }).waitFor();
await page
  .locator('[aria-label^="Camera"] strong')
  .filter({ hasText: /^1\./ })
  .waitFor();

await page.setViewportSize({ width: 390, height: 760 });
await page.waitForTimeout(700);

const mobileState = await page.evaluate(() => {
  const panel = document.querySelector(".game-panel")?.getBoundingClientRect();
  const scene = document
    .querySelector(".scene-container")
    ?.getBoundingClientRect();
  const bodyWidth = document.documentElement.scrollWidth;

  return {
    bodyWidth,
    viewportWidth: window.innerWidth,
    panelHeight: panel?.height ?? 0,
    sceneHeight: scene?.height ?? 0,
  };
});

if (mobileState.bodyWidth > mobileState.viewportWidth + 1) {
  failures.push("Mobile viewport has horizontal overflow.");
}

if (mobileState.panelHeight <= 0 || mobileState.sceneHeight <= 0) {
  failures.push("Mobile panel or scene did not lay out.");
}

const screenshotPath = "test-results/space-board-browser-check.png";
await page.screenshot({ path: screenshotPath, fullPage: true });

await browser.close();

const filteredConsoleMessages = consoleMessages.filter((message) =>
  message.startsWith("error:"),
);

if (filteredConsoleMessages.length > 0) {
  failures.push(`Console issues:\n${filteredConsoleMessages.join("\n")}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Browser check passed. Screenshot: ${screenshotPath}`);
