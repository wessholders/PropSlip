import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function defaultChromePath() {
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

const chromePath = process.env.CHROME_PATH || defaultChromePath();
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const indexUrl = `file:///${resolve(publicDir, "index.html").replace(/\\/g, "/").replace(/ /g, "%20")}`;
const profileDir = await mkdtemp(join(tmpdir(), "propslip-chrome-profile-"));
const port = 9224;

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--no-first-run",
  "--remote-debugging-address=127.0.0.1",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--window-size=390,900",
  indexUrl
], {
  stdio: "ignore",
  windowsHide: true
});

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function fetchJson(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      await wait(250);
    }
  }
  throw new Error(`Unable to reach ${url}`);
}

async function send(ws, method, params = {}) {
  const id = send.nextId = (send.nextId || 0) + 1;
  return new Promise((resolveSend, rejectSend) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (message.error) {
        rejectSend(new Error(message.error.message));
      } else {
        resolveSend(message.result);
      }
    };

    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluateValue(ws, expression) {
  const result = await send(ws, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const exception = result.exceptionDetails.exception;
    throw new Error(exception?.description || exception?.value || result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result.value;
}

async function waitForExpression(ws, expression, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await evaluateValue(ws, expression);
    if (value) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

function workflowEscape(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

try {
  const pages = await fetchJson(`http://127.0.0.1:${port}/json`);
  const page = pages.find((entry) => entry.type === "page");
  if (!page) throw new Error("Chrome did not expose a page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveOpen) => ws.addEventListener("open", resolveOpen, { once: true }));
  await send(ws, "Runtime.enable");
  await send(ws, "Page.enable");
  await waitForExpression(ws, `document.readyState !== "loading" && document.querySelector("#calculatorSwitcher") && document.querySelector("#slipValue").textContent.trim() !== "--"`);

  const expression = `({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    switcherHidden: document.querySelector("#calculatorSwitcher").hidden,
    whatIfHidden: document.querySelector("#view-whatif").hidden,
    comparisonModeOn: document.querySelector("#comparisonModeToggle").checked,
    slipValue: document.querySelector("#slipValue").textContent.trim(),
    status: document.querySelector("#statusPill").textContent.trim(),
    overflowEls: [...document.querySelectorAll("body *")]
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        className: String(el.className),
        right: Math.round(el.getBoundingClientRect().right),
        width: Math.round(el.getBoundingClientRect().width)
      }))
      .filter((item) => item.right > document.documentElement.clientWidth + 1)
      .slice(0, 10)
  })`;

  const defaultState = await evaluateValue(ws, expression);
  const screenshot = await send(ws, "Page.captureScreenshot", { format: "png" });
  const whatIfState = await evaluateValue(ws, `(() => {
      document.querySelector("#whatIfTab").click();
      const singleMode = {
        whatIfHidden: document.querySelector("#view-whatif").hidden,
        resultValue: document.querySelector("#whatIfResultValue").textContent.trim(),
        metric: document.querySelector("#whatIfMetricLabel").textContent.trim(),
        status: document.querySelector("#whatIfStatusPill").textContent.trim(),
        statusHidden: document.querySelector("#whatIfStatusPill").hidden,
        setupBHidden: document.querySelector("#compareSetupB").hidden
      };
      document.querySelector("#comparisonModeToggle").click();
      const comparisonMode = {
        whatIfHidden: document.querySelector("#view-whatif").hidden,
        resultValue: document.querySelector("#whatIfResultValue").textContent.trim(),
        metric: document.querySelector("#whatIfMetricLabel").textContent.trim(),
        status: document.querySelector("#whatIfStatusPill").textContent.trim(),
        statusHidden: document.querySelector("#whatIfStatusPill").hidden,
        setupBHidden: document.querySelector("#compareSetupB").hidden,
        setupAClass: document.querySelector("#whatIfStatA").className,
        setupBClass: document.querySelector("#whatIfStatB").className
      };
      document.querySelector("#comparePitchB").value = "22";
      document.querySelector("#comparePitchB").dispatchEvent(new Event("input", { bubbles: true }));
      return {
        singleMode,
        comparisonMode,
        reverseComparisonMode: {
          whatIfHidden: document.querySelector("#view-whatif").hidden,
          resultValue: document.querySelector("#whatIfResultValue").textContent.trim(),
          metric: document.querySelector("#whatIfMetricLabel").textContent.trim(),
          status: document.querySelector("#whatIfStatusPill").textContent.trim(),
          statusHidden: document.querySelector("#whatIfStatusPill").hidden,
          setupBHidden: document.querySelector("#compareSetupB").hidden,
          setupAClass: document.querySelector("#whatIfStatA").className,
          setupBClass: document.querySelector("#whatIfStatB").className
        }
      };
    })()`);
  const comparisonScreenshot = await send(ws, "Page.captureScreenshot", { format: "png" });
  await evaluateValue(ws, `localStorage.setItem("prop-slip-comparison-mode", "on"); true`);
  await send(ws, "Page.reload", { ignoreCache: true });
  await wait(500);
  await waitForExpression(ws, `document.readyState !== "loading" && document.documentElement.dataset.ready === "true"`);
  const refreshState = await evaluateValue(ws, `({
    slipHidden: document.querySelector("#view-slip").hidden,
    whatIfHidden: document.querySelector("#view-whatif").hidden,
    slipSelected: document.querySelector("#slipTab").getAttribute("aria-selected"),
    whatIfSelected: document.querySelector("#whatIfTab").getAttribute("aria-selected"),
    comparisonModeOn: document.querySelector("#comparisonModeToggle").checked,
    setupBHidden: document.querySelector("#compareSetupB").hidden,
    storedComparisonMode: localStorage.getItem("prop-slip-comparison-mode")
  })`);
  ws.close();

  const failures = [];

  if (defaultState.switcherHidden) failures.push("calculator switcher should be visible by default");
  if (!defaultState.whatIfHidden) failures.push("Theoretical Setup view should be hidden while Propeller Slip tab is active");
  if (defaultState.comparisonModeOn) failures.push("Theoretical Setup comparison mode should be off by default");
  if (defaultState.slipValue !== "6.5%") failures.push(`expected default slip value 6.5%, got ${defaultState.slipValue}`);
  if (defaultState.overflowEls.length > 0) failures.push("default mobile render has horizontal overflow");
  if (whatIfState.singleMode.metric !== "Estimated speed") failures.push("single Theoretical Setup mode should show Estimated speed");
  if (!whatIfState.singleMode.setupBHidden) failures.push("Setup B should be hidden in single Theoretical Setup mode");
  if (!whatIfState.singleMode.statusHidden) failures.push("single Theoretical Setup mode should hide the Setup A status pill");
  if (whatIfState.comparisonMode.metric !== "Speed difference") failures.push("comparison mode should show Speed difference");
  if (whatIfState.comparisonMode.setupBHidden) failures.push("Setup B should be visible in comparison mode");
  if (!whatIfState.comparisonMode.statusHidden) failures.push("comparison mode should hide the faster/slower status pill");
  if (!whatIfState.comparisonMode.setupAClass.includes("warn")) failures.push("slower Setup A tile should be highlighted red");
  if (!whatIfState.comparisonMode.setupBClass.includes("good")) failures.push("faster Setup B tile should be highlighted green");
  if (whatIfState.comparisonMode.resultValue !== "5.5 mph") failures.push(`expected comparison diff 5.5 mph, got ${whatIfState.comparisonMode.resultValue}`);
  if (whatIfState.reverseComparisonMode.resultValue !== "5.5 mph") failures.push(`expected reverse comparison absolute diff 5.5 mph, got ${whatIfState.reverseComparisonMode.resultValue}`);
  if (whatIfState.reverseComparisonMode.resultValue.startsWith("-")) failures.push("reverse comparison diff should not be negative");
  if (!whatIfState.reverseComparisonMode.setupAClass.includes("good")) failures.push("faster Setup A tile should be highlighted green in reverse comparison");
  if (!whatIfState.reverseComparisonMode.setupBClass.includes("warn")) failures.push("slower Setup B tile should be highlighted red in reverse comparison");
  if (refreshState.slipHidden) failures.push("refresh should return to Propeller Slip view");
  if (!refreshState.whatIfHidden) failures.push("refresh should hide Theoretical Setup view");
  if (refreshState.slipSelected !== "true") failures.push("refresh should select Propeller Slip tab");
  if (refreshState.whatIfSelected !== "false") failures.push("refresh should deselect Theoretical Setup tab");
  if (refreshState.comparisonModeOn) failures.push("refresh should turn comparison mode off");
  if (!refreshState.setupBHidden) failures.push("refresh should hide Setup B");
  if (refreshState.storedComparisonMode !== null) failures.push("refresh should clear stored comparison mode");

  if (failures.length > 0) {
    console.error(JSON.stringify({ failures, defaultState, whatIfState, refreshState }, null, 2));
    if (process.env.GITHUB_ACTIONS) {
      console.error(`::error title=Render smoke failed::${workflowEscape(failures.join("; "))}`);
    }
    throw new Error(failures.join("; "));
  }

  await writeFile(resolve(root, "propslip-home.png"), Buffer.from(screenshot.data, "base64"));
  await writeFile(resolve(root, "propslip-whatif-comparison.png"), Buffer.from(comparisonScreenshot.data, "base64"));
  console.log(JSON.stringify({
    screenshots: ["propslip-home.png", "propslip-whatif-comparison.png"],
    defaultState,
    whatIfState,
    refreshState
  }, null, 2));
} catch (error) {
  console.error(error);
  if (process.env.GITHUB_ACTIONS) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error title=Render smoke crashed::${workflowEscape(message)}`);
  }
  process.exitCode = 1;
} finally {
  chrome.kill();
  await new Promise((resolveExit) => {
    if (chrome.exitCode !== null) {
      resolveExit();
      return;
    }

    chrome.once("exit", resolveExit);
    setTimeout(resolveExit, 1500);
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 2) break;
      await wait(250);
    }
  }
}
