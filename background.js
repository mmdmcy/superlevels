normalizeExtensionApi(["scripting"], ["executeScript"]);
normalizeExtensionApi(["storage", "local"], ["remove"]);

function normalizeExtensionApi(path, methods) {
  if (typeof chrome === "undefined") return;
  const chromeNs = path.reduce((obj, key) => obj?.[key], chrome);
  const browserNs =
    typeof browser !== "undefined" ? path.reduce((obj, key) => obj?.[key], browser) : null;
  if (!chromeNs) return;

  for (const method of methods) {
    if (chromeNs[method]?.__superlevelsPromiseWrapped) continue;
    const browserMethod = browserNs && typeof browserNs[method] === "function"
      ? browserNs[method].bind(browserNs)
      : null;
    const chromeMethod = typeof chromeNs[method] === "function" ? chromeNs[method].bind(chromeNs) : null;
    const sourceMethod = browserMethod || chromeMethod;
    if (!sourceMethod) continue;

    const wrapped = (...args) => {
      const callback = typeof args[args.length - 1] === "function" ? args.pop() : null;

      if (browserMethod) {
        const promise = browserMethod(...args);
        if (!callback) return promise;
        promise.then((value) => callback(value), () => callback());
        return undefined;
      }

      if (callback) {
        chromeMethod(...args, (...callbackArgs) => callback(...callbackArgs));
        return undefined;
      }

      return new Promise((resolve, reject) => {
        chromeMethod(...args, (...callbackArgs) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message || String(error)));
            return;
          }
          resolve(callbackArgs.length > 1 ? callbackArgs : callbackArgs[0]);
        });
      });
    };

    Object.defineProperty(wrapped, "__superlevelsPromiseWrapped", { value: true });
    chromeNs[method] = wrapped;
  }
}

// ═══════════════════════════════════
//  Redirect Tracer
// ═══════════════════════════════════
// { tabId: { chain: [{url, statusCode, statusLine}], finalUrl, finalStatus } }
const redirectData = {};

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of url.searchParams.keys()) {
      url.searchParams.set(key, "[redacted]");
    }
    return url.toString();
  } catch {
    return String(rawUrl || "").split("#")[0];
  }
}

// When a new main-frame navigation starts, reset the chain
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
});

// Capture each redirect hop
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    if (!redirectData[details.tabId]) {
      redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
    }
    redirectData[details.tabId].chain.push({
      url: redactUrl(details.url),
      statusCode: details.statusCode,
      statusLine: details.statusLine || "",
      redirectUrl: redactUrl(details.redirectUrl),
    });
  },
  { urls: ["http://*/*", "https://*/*"] }
);

// Capture final completed request
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    if (!redirectData[details.tabId]) {
      redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
    }
    redirectData[details.tabId].finalUrl = redactUrl(details.url);
    redirectData[details.tabId].finalStatus = details.statusCode;
  },
  { urls: ["http://*/*", "https://*/*"] }
);

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  delete redirectData[tabId];
});

// Respond to popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getRedirects") {
    sendResponse(redirectData[msg.tabId] || { chain: [], finalUrl: null, finalStatus: null });
  }
  if (msg.type === "pip") {
    chrome.scripting.executeScript({
      target: { tabId: msg.tabId },
      func: () => {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
          return { action: "exited" };
        }
        const videos = Array.from(document.querySelectorAll("video"));
        if (!videos.length) return { error: "No video found on this page" };
        const playing = videos.filter(v => !v.paused && !v.ended);
        let video;
        if (playing.length) {
          video = playing.reduce((a, b) =>
            (b.videoWidth * b.videoHeight) > (a.videoWidth * a.videoHeight) ? b : a
          );
        } else {
          video = videos.reduce((a, b) =>
            (b.videoWidth * b.videoHeight) > (a.videoWidth * a.videoHeight) ? b : a
          );
        }
        return video.requestPictureInPicture()
          .then(() => ({ action: "entered" }))
          .catch(e => ({ error: e.message }));
      },
    }).then(results => {
      sendResponse(results[0]?.result || { error: "No result" });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true; // async sendResponse
  }
});

const DEPRECATED_PRIVATE_KEYS = [
  "acr_host",
  "acr_key",
  "acr_secret",
  "music_history",
  "closed_tabs",
  "enabled",
  "timeoutMin",
  "exclusions",
];

function cleanupDeprecatedPrivateData() {
  chrome.storage.local.remove(DEPRECATED_PRIVATE_KEYS).catch(() => {});
}

// ═══════════════════════════════════
//  Chromium tab-audio capture
// ═══════════════════════════════════
const OFFSCREEN_DOCUMENT = "offscreen.html";
let creatingOffscreenDocument = null;

function hasChromiumTabCapture() {
  return Boolean(
    chrome.offscreen?.createDocument &&
    chrome.runtime?.getContexts &&
    chrome.tabCapture?.getMediaStreamId
  );
}

async function findOffscreenDocument() {
  if (!chrome.runtime?.getContexts) return false;
  const documentUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [documentUrl],
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await findOffscreenDocument()) return;
  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT,
      reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
      justification: "Boost and replay audio captured from the active tab.",
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

async function sendToOffscreen(message) {
  return chrome.runtime.sendMessage({
    ...message,
    target: "superlevels-offscreen",
  });
}

async function setCapturedTabVolume(tabId, percent) {
  if (!hasChromiumTabCapture()) {
    return { supported: false };
  }

  const normalizedPercent = Math.max(100, Math.min(500, Number(percent) || 100));
  const hasDocument = await findOffscreenDocument();

  if (normalizedPercent === 100) {
    if (!hasDocument) {
      return { supported: true, active: false, percent: normalizedPercent };
    }
    return sendToOffscreen({
      type: "volume_capture_stop",
      tabId,
      percent: normalizedPercent,
    });
  }

  if (!hasDocument) await ensureOffscreenDocument();

  const existing = await sendToOffscreen({
    type: "volume_capture_query",
    tabId,
  });
  if (existing?.active) {
    return sendToOffscreen({
      type: "volume_capture_gain",
      tabId,
      percent: normalizedPercent,
    });
  }

  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId,
  });
  return sendToOffscreen({
    type: "volume_capture_start",
    tabId,
    percent: normalizedPercent,
    streamId,
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "volume_capture_set") return undefined;

  setCapturedTabVolume(msg.tabId, msg.percent)
    .then(sendResponse)
    .catch((err) => {
      sendResponse({
        supported: hasChromiumTabCapture(),
        active: false,
        error: err?.message || "Could not capture this tab's audio.",
      });
    });
  return true;
});

cleanupDeprecatedPrivateData();
chrome.runtime.onInstalled.addListener(cleanupDeprecatedPrivateData);
