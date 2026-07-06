const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9339;
const baseUrl = "http://127.0.0.1:8000";
const outDir = path.resolve("handoff/screenshots");
const userDataDir = "/private/tmp/codex-checkout-handoff-chrome";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.callbacks.has(message.id)) {
        const { resolve, reject } = this.callbacks.get(message.id);
        this.callbacks.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result || {});
        }
        return;
      }
      this.events.push(message);
    });
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  async send(method, params = {}) {
    await this.ready();
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
    });
  }

  waitForEvent(method, timeoutMs = 7000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const index = this.events.findIndex((event) => event.method === method);
        if (index >= 0) {
          const [event] = this.events.splice(index, 1);
          clearInterval(timer);
          resolve(event.params || {});
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error(`Timed out waiting for ${method}`));
        }
      }, 50);
    });
  }

  close() {
    this.ws.close();
  }
}

async function createPage() {
  const browserMeta = await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const browser = new CdpSession(browserMeta.webSocketDebuggerUrl);
  await browser.ready();
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const target = targets.find((item) => item.id === targetId);
  browser.close();
  if (!target) {
    throw new Error("Unable to find created Chrome target");
  }
  const page = new CdpSession(target.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 430,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return page;
}

async function navigate(page, url) {
  const loaded = page.waitForEvent("Page.loadEventFired");
  await page.send("Page.navigate", { url });
  await loaded;
  await sleep(250);
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`Evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function setStateAndNavigate(page, route, state = {}) {
  await navigate(page, `${baseUrl}/`);
  const entries = Object.entries(state);
  await evaluate(page, `(() => {
    sessionStorage.clear();
    const entries = ${JSON.stringify(entries)};
    for (const [key, value] of entries) sessionStorage.setItem(key, value);
  })()`);
  await navigate(page, `${baseUrl}${route}`);
}

async function capture(page, filename, options = {}) {
  if (options.afterLoadScript) {
    await evaluate(page, options.afterLoadScript);
    await sleep(options.waitAfterScript || 300);
  }
  if (options.scrollY) {
    await evaluate(page, `window.scrollTo(0, ${options.scrollY})`);
    await sleep(150);
  }
  const result = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await fs.writeFile(path.join(outDir, filename), Buffer.from(result.data, "base64"));
}

const guestDetails = {
  checkoutIdentifier: "guest@example.com",
  checkoutEmail: "guest@example.com",
  checkoutFirstName: "Taylor",
  checkoutLastName: "Morgan",
  checkoutName: "Taylor Morgan",
  accountMatchedSignin: "false",
};

const registeredDetails = {
  checkoutIdentifier: "alex_smith@gmail.com",
  checkoutEmail: "alex_smith@gmail.com",
  checkoutFirstName: "Alex",
  checkoutLastName: "Smith",
  checkoutName: "Alex Smith",
  accountMatchedSignin: "true",
};

const homeDelivery = {
  ...guestDetails,
  deliveryType: "home",
  deliveryAddressLine1: "12 Mill Hill",
  deliveryAddressLine2: "Enderby",
  deliveryTownCity: "Leicester",
  deliveryPostcode: "LE19 4AD",
  deliveryAddressLabel: "12 Mill Hill, Enderby, Leicester, LE19 4AD",
  deliveryDate: "wed-12",
  deliveryDateLabel: "Wednesday 12th July",
};

const collectionBase = {
  ...guestDetails,
  deliveryType: "collection",
  collectionSearch: "Leicester",
  collectionStore: "enderby",
  collectionStoreSummary: "Next Leicester - Fosse Park",
};

const parcelshopBase = {
  ...guestDetails,
  deliveryType: "parcelshop",
  collectionSearch: "Enderby",
  collectionStore: "mercury-news",
  collectionStoreSummary: "Mercury News",
};

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--window-size=430,960",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    const page = await createPage();

    await setStateAndNavigate(page, "/signin-register/");
    await capture(page, "01-signin-register.png");

    await setStateAndNavigate(page, "/your-details/", guestDetails);
    await capture(page, "02-guest-your-details.png", {
      afterLoadScript: `(() => {
        document.querySelector('#email').value = 'guest@example.com';
        document.querySelector('#first-name').value = 'Taylor';
        document.querySelector('#last-name').value = 'Morgan';
      })()`,
    });

    await setStateAndNavigate(page, "/your-details/", {
      checkoutIdentifier: "recognised@email.com",
      checkoutEmail: "recognised@email.com",
      accountMatchVisible: "true",
    });
    await capture(page, "03-recognised-account.png");

    await setStateAndNavigate(page, "/enter-otp/", {
      checkoutIdentifier: "recognised@email.com",
      accountMatchVisible: "true",
    });
    await capture(page, "04-enter-otp.png");

    await setStateAndNavigate(page, "/delivery/", homeDelivery);
    await capture(page, "05-home-delivery.png", { scrollY: 120 });

    await setStateAndNavigate(page, "/delivery/", collectionBase);
    await capture(page, "06-collection-search.png", { scrollY: 120 });

    await setStateAndNavigate(page, "/delivery/", {
      ...collectionBase,
      deliveryStage: "collection-results",
    });
    await capture(page, "07-collection-results.png", { scrollY: 120 });

    await setStateAndNavigate(page, "/delivery/", {
      ...collectionBase,
      deliveryStage: "collection-dates",
    });
    await capture(page, "08-collection-dates.png", { scrollY: 120 });

    await setStateAndNavigate(page, "/delivery/", {
      ...parcelshopBase,
      deliveryStage: "collection-results",
    });
    await capture(page, "09-parcelshop-results.png", { scrollY: 120 });

    await setStateAndNavigate(page, "/payment/", homeDelivery);
    await capture(page, "10-payment-card.png", {
      afterLoadScript: `(() => {
        const card = document.querySelector('[data-payment-method="card"]');
        if (card && card.getAttribute('aria-expanded') !== 'true') card.click();
      })()`,
      waitAfterScript: 500,
      scrollY: 260,
    });

    await setStateAndNavigate(page, "/order-complete/", {
      ...homeDelivery,
      accountMatchedSignin: "false",
    });
    await capture(page, "11-order-complete-guest.png");

    await setStateAndNavigate(page, "/order-complete/", {
      ...homeDelivery,
      ...registeredDetails,
      accountMatchedSignin: "true",
    });
    await capture(page, "12-order-complete-passkey.png");

    page.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
