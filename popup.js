normalizeExtensionApi(["storage", "local"], ["get", "set", "remove"]);
normalizeExtensionApi(["tabs"], ["query", "sendMessage", "reload"]);
normalizeExtensionApi(["cookies"], ["getAll", "remove", "set"]);
normalizeExtensionApi(["runtime"], ["sendMessage"]);
normalizeExtensionApi(["contentSettings", "javascript"], ["get", "set"]);

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
//  Navigation
// ═══════════════════════════════════
function switchToPage(page) {
  const btn = document.querySelector(`.nav button[data-page="${page}"]`);
  const pageEl = document.getElementById("page-" + page);
  if (!btn || !pageEl) return false;
  document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  pageEl.classList.add("active");
  if (page === "cookies") loadCookies();
  if (page === "redirects") loadRedirects();
  if (page === "darkmode") loadDarkMode();
  if (page === "xdim") loadXDim();
  if (page === "jstoggle") loadJsToggle();
  if (page === "livecss") loadLiveCSS();
  if (page === "unhook") loadUnhook();
  if (page === "xunhook") loadXUnhook();
  if (page === "jsonformat") loadJsonFormat();
  chrome.storage.local.set({ last_tab: page }).catch(() => {});
  return true;
}

document.querySelectorAll(".nav button").forEach((btn) => {
  btn.addEventListener("click", () => switchToPage(btn.dataset.page));
});

// Restore last open tab
chrome.storage.local.get(["last_tab"], (data) => {
  if (!data.last_tab || !switchToPage(data.last_tab)) {
    switchToPage("cookies");
  }
});

// ═══════════════════════════════════
//  Cookie Editor
// ═══════════════════════════════════
const cookieDomainEl = document.getElementById("cookieDomain");
const cookieCountEl = document.getElementById("cookieCount");
const cookieListEl = document.getElementById("cookieList");

let currentUrl = "";
let currentDomain = "";
let allCookies = [];

async function loadCookies() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    cookieDomainEl.textContent = "No accessible page";
    cookieCountEl.textContent = "0";
    cookieListEl.innerHTML = '<div class="empty">Cannot read cookies from this page</div>';
    return;
  }
  currentUrl = tab.url;
  try {
    currentDomain = new URL(tab.url).hostname;
  } catch {
    currentDomain = "";
  }
  cookieDomainEl.textContent = currentDomain;

  const cookies = await chrome.cookies.getAll({ url: tab.url });
  cookies.sort((a, b) => a.name.localeCompare(b.name));
  allCookies = cookies;
  cookieCountEl.textContent = cookies.length;
  renderCookies(cookies);
}

function renderCookies(cookies) {
  if (!cookies.length) {
    cookieListEl.innerHTML = '<div class="empty">No cookies for this site</div>';
    return;
  }
  cookieListEl.innerHTML = cookies.map((c, i) => `
    <div class="cookie-item" data-idx="${i}">
      <div class="cookie-row">
        <span class="cookie-chevron">&#9660;</span>
        <span class="cookie-name">${esc(c.name)}</span>
        <button class="cookie-del" data-delidx="${i}" title="Delete">&times;</button>
      </div>
      <div class="cookie-details">
        <div class="cookie-field">
          <label>Name</label>
          <input type="text" value="${escA(c.name)}" data-field="name" data-i="${i}">
        </div>
        <div class="cookie-field">
          <label>Value</label>
          <textarea data-field="value" data-i="${i}">${esc(c.value)}</textarea>
        </div>
        <div class="advanced-toggle" data-adv="${i}">Show Advanced</div>
        <div class="advanced-fields" data-advf="${i}">
          <div class="cookie-field">
            <label>Domain</label>
            <input type="text" value="${escA(c.domain)}" data-field="domain" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Path</label>
            <input type="text" value="${escA(c.path)}" data-field="path" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>SameSite</label>
            <input type="text" value="${escA(c.sameSite || "unspecified")}" data-field="sameSite" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Secure: ${c.secure ? "Yes" : "No"} &nbsp;|&nbsp; HttpOnly: ${c.httpOnly ? "Yes" : "No"}</label>
          </div>
        </div>
        <div class="cookie-actions">
          <button class="btn-save" data-saveidx="${i}">&#128190; Save</button>
          <button class="btn-del2" data-delidx="${i}">&#128465; Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  // Expand / collapse
  cookieListEl.querySelectorAll(".cookie-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".cookie-del")) return;
      row.closest(".cookie-item").classList.toggle("expanded");
    });
  });

  // Show Advanced
  cookieListEl.querySelectorAll(".advanced-toggle").forEach((t) => {
    t.addEventListener("click", () => {
      const fields = cookieListEl.querySelector(`.advanced-fields[data-advf="${t.dataset.adv}"]`);
      fields.classList.toggle("show");
      t.textContent = fields.classList.contains("show") ? "Hide Advanced" : "Show Advanced";
    });
  });

  // Delete buttons
  cookieListEl.querySelectorAll("[data-delidx]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCookie(allCookies[parseInt(btn.dataset.delidx)]);
    });
  });

  // Save buttons
  cookieListEl.querySelectorAll("[data-saveidx]").forEach((btn) => {
    btn.addEventListener("click", () => saveCookie(parseInt(btn.dataset.saveidx)));
  });
}

async function deleteCookie(cookie) {
  const protocol = cookie.secure ? "https" : "http";
  const url = `${protocol}://${cookie.domain.replace(/^\./, "")}${cookie.path}`;
  await chrome.cookies.remove({ url, name: cookie.name });
  loadCookies();
}

async function saveCookie(idx) {
  const original = allCookies[idx];
  const item = cookieListEl.querySelector(`.cookie-item[data-idx="${idx}"]`);

  const nameEl = item.querySelector('[data-field="name"]');
  const valueEl = item.querySelector('[data-field="value"]');
  const domainEl = item.querySelector('[data-field="domain"]');
  const pathEl = item.querySelector('[data-field="path"]');
  const sameSiteEl = item.querySelector('[data-field="sameSite"]');

  // Remove old cookie first
  const protocol = original.secure ? "https" : "http";
  const oldUrl = `${protocol}://${original.domain.replace(/^\./, "")}${original.path}`;
  await chrome.cookies.remove({ url: oldUrl, name: original.name });

  const domain = domainEl ? domainEl.value : original.domain;
  const path = pathEl ? pathEl.value : original.path;
  const newUrl = `${protocol}://${domain.replace(/^\./, "")}${path}`;

  const details = {
    url: newUrl,
    name: nameEl.value,
    value: valueEl.value,
    path: path,
    secure: original.secure,
    httpOnly: original.httpOnly,
    sameSite: sameSiteEl ? sameSiteEl.value : original.sameSite || "unspecified",
  };
  if (!original.hostOnly) details.domain = domain;
  if (original.expirationDate) details.expirationDate = original.expirationDate;

  await chrome.cookies.set(details);
  loadCookies();
}

// Delete All
document.getElementById("btnDeleteAll").addEventListener("click", async () => {
  if (!allCookies.length) return;
  for (const c of allCookies) {
    const protocol = c.secure ? "https" : "http";
    const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;
    await chrome.cookies.remove({ url, name: c.name });
  }
  loadCookies();
});

// Refresh
document.getElementById("btnRefresh").addEventListener("click", () => loadCookies());

// Export
document.getElementById("btnExport").addEventListener("click", () => {
  if (!allCookies.length) return;
  const data = JSON.stringify(allCookies, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cookies-${currentDomain}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Add Cookie Modal
const addModal = document.getElementById("addModal");
document.getElementById("btnAdd").addEventListener("click", () => {
  document.getElementById("newDomain").value = currentDomain ? "." + currentDomain : "";
  document.getElementById("newPath").value = "/";
  document.getElementById("newName").value = "";
  document.getElementById("newValue").value = "";
  addModal.classList.add("show");
});
document.getElementById("modalCancel").addEventListener("click", () => {
  addModal.classList.remove("show");
});
addModal.addEventListener("click", (e) => {
  if (e.target === addModal) addModal.classList.remove("show");
});
document.getElementById("modalSave").addEventListener("click", async () => {
  const name = document.getElementById("newName").value.trim();
  if (!name) return;
  const domain = document.getElementById("newDomain").value.trim();
  const path = document.getElementById("newPath").value.trim() || "/";
  const url = `https://${domain.replace(/^\./, "")}${path}`;
  await chrome.cookies.set({
    url,
    name,
    value: document.getElementById("newValue").value,
    domain,
    path,
  });
  addModal.classList.remove("show");
  loadCookies();
});

// ═══════════════════════════════════
//  Redirect Tracer
// ═══════════════════════════════════
const redirectChainEl = document.getElementById("redirectChain");
let lastRedirectText = "";

function redactUrlForDisplay(rawUrl) {
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

async function loadRedirects() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    redirectChainEl.innerHTML = '<div class="redirect-empty"><div class="big-icon">🔀</div><p>No active tab</p></div>';
    return;
  }

  const data = await chrome.runtime.sendMessage({ type: "getRedirects", tabId: tab.id });
  const chain = data.chain || [];
  const finalUrl = redactUrlForDisplay(data.finalUrl || tab.url);
  const finalStatus = data.finalStatus || 200;

  if (!chain.length) {
    // No redirects — just show the final URL
    redirectChainEl.innerHTML = renderStep(finalUrl, finalStatus, true, false);
    lastRedirectText = `${finalUrl}\n${finalStatus}: Final destination`;
    return;
  }

  let html = "";
  let text = "";
  chain.forEach((hop, i) => {
    const label = getRedirectLabel(hop.statusCode);
    html += renderStep(hop.url, hop.statusCode, false, true);
    text += `${hop.url}\n${hop.statusCode}: ${label} to ${hop.redirectUrl}\n\n`;
  });
  // Final destination
  html += renderStep(finalUrl, finalStatus, true, false);
  text += `${finalUrl}\n${finalStatus}: Final destination`;

  redirectChainEl.innerHTML = html;
  lastRedirectText = text;
}

function renderStep(url, statusCode, isFinal, hasConnector) {
  const iconClass = isFinal ? (statusCode >= 400 ? "error" : "final") : "redirect";
  const codeClass = statusCode >= 500 ? "code-5xx" : statusCode >= 400 ? "code-4xx" : `code-${statusCode}`;
  const label = isFinal ? "Final destination" : getRedirectLabel(statusCode);
  const arrow = isFinal
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="#6af38a" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="#6ab0f3" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';

  return `
    <div class="redirect-step">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="step-icon ${iconClass}">${arrow}</div>
        ${hasConnector ? '<div class="step-connector"></div>' : ''}
      </div>
      <div class="step-content">
        <div class="step-url">${esc(url)}</div>
        <div class="step-status"><span class="code ${codeClass}">${statusCode}</span> ${esc(label)}</div>
      </div>
    </div>
  `;
}

function getRedirectLabel(code) {
  const labels = {
    301: "Permanent redirect",
    302: "Temporary redirect (Found)",
    303: "See Other",
    307: "Temporary redirect",
    308: "Permanent redirect",
  };
  return labels[code] || `Redirect (${code})`;
}

document.getElementById("btnRedirectRefresh").addEventListener("click", () => loadRedirects());

document.getElementById("btnRedirectCopy").addEventListener("click", async () => {
  if (!lastRedirectText) return;
  const btn = document.getElementById("btnRedirectCopy");
  const orig = btn.querySelector("span").textContent;
  const copied = await copyText(lastRedirectText);
  btn.querySelector("span").textContent = copied ? "Copied!" : "Copy failed";
  setTimeout(() => { btn.querySelector("span").textContent = orig; }, 1500);
});

// ═══════════════════════════════════
//  Dark Mode
// ═══════════════════════════════════
const darkToggle = document.getElementById("darkToggle");
const darkStatus = document.getElementById("darkStatus");
const darkHostEl = document.getElementById("darkHost");
const darkBrightness = document.getElementById("darkBrightness");
const darkBrightnessVal = document.getElementById("darkBrightnessVal");
const scopeSite = document.getElementById("scopeSite");
const scopeGlobal = document.getElementById("scopeGlobal");

let darkHost = "";
let darkScope = "site"; // "site" or "global"

async function loadDarkMode() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { darkHost = new URL(tab.url).hostname; } catch { darkHost = ""; }
  darkHostEl.textContent = darkHost ? `Current site: ${darkHost}` : "";

  const siteKey = "darkmode_" + darkHost;
  const data = await chrome.storage.local.get([siteKey, "darkmode_global", "darkmode_brightness"]);

  const brightness = data.darkmode_brightness || 100;
  darkBrightness.value = brightness;
  darkBrightnessVal.textContent = brightness + "%";

  const siteState = data[siteKey];
  const globalState = data.darkmode_global || false;
  const enabled = siteState !== undefined ? siteState : globalState;

  darkToggle.checked = enabled;
  updateDarkStatus(enabled);
}

function updateDarkStatus(on) {
  darkStatus.textContent = on ? "ON" : "OFF";
  darkStatus.className = "status " + (on ? "on" : "off");
}

async function applyDark() {
  const enabled = darkToggle.checked;
  const brightness = parseInt(darkBrightness.value);
  updateDarkStatus(enabled);

  // Save preference
  if (darkScope === "global") {
    await chrome.storage.local.set({ darkmode_global: enabled });
  } else {
    const siteKey = "darkmode_" + darkHost;
    await chrome.storage.local.set({ [siteKey]: enabled });
  }
  await chrome.storage.local.set({ darkmode_brightness: brightness });

  // Send to active tab's content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "darkmode_toggle",
      enabled,
      brightness,
    }).catch(() => {});
  }
}

darkToggle.addEventListener("change", applyDark);

darkBrightness.addEventListener("input", () => {
  darkBrightnessVal.textContent = darkBrightness.value + "%";
});
darkBrightness.addEventListener("change", applyDark);

scopeSite.addEventListener("click", () => {
  darkScope = "site";
  scopeSite.classList.add("active");
  scopeGlobal.classList.remove("active");
});
scopeGlobal.addEventListener("click", () => {
  darkScope = "global";
  scopeGlobal.classList.add("active");
  scopeSite.classList.remove("active");
});

// ═══════════════════════════════════
//  X Dim Mode
// ═══════════════════════════════════
const xdimToggle = document.getElementById("xdimToggle");
const xdimStatus = document.getElementById("xdimStatus");
const xdimPreview = document.getElementById("xdimPreview");
const xdimHueSlider = document.getElementById("xdimHueSlider");
const xdimHueVal = document.getElementById("xdimHueVal");
const xdimCustomHueSection = document.getElementById("xdimCustomHueSection");
const xdimDots = document.querySelectorAll(".xdim-dot");

const XDIM_THEMES = {
  dim:   { hue: 210, sat: 34 },
  slate: { hue: 210, sat: 8  },
  jade:  { hue: 150, sat: 34 },
  plum:  { hue: 270, sat: 34 },
  dusk:  { hue: 330, sat: 34 },
  ember: { hue: 25,  sat: 34 },
};

let xdimTheme = "dim";
let xdimCustomHue = 210;

async function loadXDim() {
  const data = await chrome.storage.local.get(["xdim_enabled", "xdim_theme", "xdim_customHue"]);
  const enabled = data.xdim_enabled || false;
  xdimTheme = data.xdim_theme || "dim";
  xdimCustomHue = data.xdim_customHue || 210;

  xdimToggle.checked = enabled;
  xdimHueSlider.value = xdimCustomHue;
  xdimHueVal.textContent = xdimCustomHue + "°";

  updateXDimStatus(enabled);
  updateXDimThemeDots();
  updateXDimPreview();
}

function updateXDimStatus(on) {
  xdimStatus.textContent = on ? "ON" : "OFF";
  xdimStatus.className = "status " + (on ? "on" : "off");
}

function updateXDimThemeDots() {
  xdimDots.forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.theme === xdimTheme);
  });
  xdimCustomHueSection.classList.toggle("show", xdimTheme === "custom");
}

function getXDimHueSat() {
  if (xdimTheme === "custom") return { hue: xdimCustomHue, sat: 34 };
  return XDIM_THEMES[xdimTheme] || XDIM_THEMES.dim;
}

function updateXDimPreview() {
  const { hue: h, sat: s } = getXDimHueSat();
  const bSat = Math.round(s * 0.47);
  const bar = xdimPreview.querySelector(".xdim-preview-bar");
  const tweet = xdimPreview.querySelector(".xdim-preview-tweet");
  bar.style.background = `hsl(${h}, ${s}%, 16%)`;
  bar.style.color = `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`;
  tweet.style.background = `hsl(${h}, ${s}%, 13%)`;
  tweet.style.color = `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`;
  tweet.style.borderColor = `hsl(${h}, ${bSat}%, 26%)`;
}

xdimToggle.addEventListener("change", async () => {
  const enabled = xdimToggle.checked;
  updateXDimStatus(enabled);
  await chrome.storage.local.set({ xdim_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "xdim_toggle", enabled }).catch(() => {});
  }
});

xdimDots.forEach((dot) => {
  dot.addEventListener("click", async () => {
    xdimTheme = dot.dataset.theme;
    updateXDimThemeDots();
    updateXDimPreview();
    await chrome.storage.local.set({ xdim_theme: xdimTheme });
  });
});

xdimHueSlider.addEventListener("input", () => {
  xdimCustomHue = parseInt(xdimHueSlider.value);
  xdimHueVal.textContent = xdimCustomHue + "°";
  updateXDimPreview();
});
xdimHueSlider.addEventListener("change", async () => {
  xdimCustomHue = parseInt(xdimHueSlider.value);
  await chrome.storage.local.set({ xdim_customHue: xdimCustomHue });
});

// ═══════════════════════════════════
//  Live CSS Editor
// ═══════════════════════════════════
const livecssHostEl = document.getElementById("livecssHost");
const livecssEditor = document.getElementById("livecssEditor");
const livecssSave = document.getElementById("livecssSave");
const livecssClear = document.getElementById("livecssClear");

let livecssHost = "";

async function loadLiveCSS() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { livecssHost = new URL(tab.url).hostname; } catch { livecssHost = ""; }
  livecssHostEl.textContent = livecssHost ? `Editing CSS for: ${livecssHost}` : "No accessible page";

  const key = "livecss_" + livecssHost;
  const data = await chrome.storage.local.get([key]);
  livecssEditor.value = data[key] || "";
}

// Live preview as user types
livecssEditor.addEventListener("input", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: livecssEditor.value }).catch(() => {});
  }
});

// Allow Tab key to insert spaces in textarea
livecssEditor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = livecssEditor.selectionStart;
    const end = livecssEditor.selectionEnd;
    livecssEditor.value = livecssEditor.value.substring(0, start) + "  " + livecssEditor.value.substring(end);
    livecssEditor.selectionStart = livecssEditor.selectionEnd = start + 2;
    livecssEditor.dispatchEvent(new Event("input"));
  }
});

livecssSave.addEventListener("click", async () => {
  const key = "livecss_" + livecssHost;
  await chrome.storage.local.set({ [key]: livecssEditor.value });
  livecssSave.textContent = "Saved!";
  setTimeout(() => { livecssSave.textContent = "Save"; }, 1500);
});

livecssClear.addEventListener("click", async () => {
  livecssEditor.value = "";
  const key = "livecss_" + livecssHost;
  await chrome.storage.local.remove(key);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: "" }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  YouTube Unhook
// ═══════════════════════════════════
const unhookToggle = document.getElementById("unhookToggle");
const unhookStatus = document.getElementById("unhookStatus");

async function loadUnhook() {
  const data = await chrome.storage.local.get(["unhook_enabled"]);
  const enabled = data.unhook_enabled !== false;
  unhookToggle.checked = enabled;
  updateUnhookUI(enabled);
}

function updateUnhookUI(on) {
  unhookStatus.textContent = on ? "ON" : "OFF";
  unhookStatus.className = "status " + (on ? "on" : "off");
}

unhookToggle.addEventListener("change", async () => {
  const enabled = unhookToggle.checked;
  updateUnhookUI(enabled);
  await chrome.storage.local.set({ unhook_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  X Unhook
// ═══════════════════════════════════
const xunhookToggle = document.getElementById("xunhookToggle");
const xunhookStatus = document.getElementById("xunhookStatus");

async function loadXUnhook() {
  const data = await chrome.storage.local.get(["xunhook_enabled"]);
  const enabled = data.xunhook_enabled !== false;
  xunhookToggle.checked = enabled;
  updateXUnhookUI(enabled);
}

function updateXUnhookUI(on) {
  xunhookStatus.textContent = on ? "ON" : "OFF";
  xunhookStatus.className = "status " + (on ? "on" : "off");
}

xunhookToggle.addEventListener("change", async () => {
  const enabled = xunhookToggle.checked;
  updateXUnhookUI(enabled);
  await chrome.storage.local.set({ xunhook_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "xunhook_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  JavaScript Toggle
// ═══════════════════════════════════
const jsToggle = document.getElementById("jsToggle");
const jsStatus = document.getElementById("jsStatus");
const jsIndicator = document.getElementById("jsIndicator");
const jsHostLabel = document.getElementById("jsHostLabel");

let jsHost = "";
let jsActiveTabUrl = "";
let jsLastEnabled = true;

function parseHttpTabUrl(tab) {
  try {
    const url = new URL(tab?.url || "");
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  } catch {}
  return null;
}

function hasJsContentSettingsApi() {
  return Boolean(
    chrome.contentSettings &&
    chrome.contentSettings.javascript &&
    typeof chrome.contentSettings.javascript.get === "function" &&
    typeof chrome.contentSettings.javascript.set === "function"
  );
}

function formatExtensionError(err) {
  const message = err?.message || String(err || "");
  return message || "blocked by browser policy";
}

function showJsUnavailable(message) {
  jsToggle.disabled = true;
  jsToggle.checked = false;
  jsToggle.title = message;
  updateJsUI(false, "UNAVAILABLE");
  jsHostLabel.textContent = message;
}

function jsPatternsForHost(host) {
  return [`https://${host}/*`, `http://${host}/*`];
}

async function loadJsToggle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = parseHttpTabUrl(tab);

  jsHost = tabUrl?.hostname || "";
  jsActiveTabUrl = tabUrl?.href || "";

  if (!tabUrl || !jsHost) {
    showJsUnavailable("Open an http:// or https:// page to use the JS toggle");
    return;
  }

  jsHostLabel.textContent = jsHost;
  jsToggle.title = "";

  if (!hasJsContentSettingsApi()) {
    showJsUnavailable(`${jsHost} (JS toggle unsupported in this browser/profile)`);
    return;
  }

  try {
    const details = await chrome.contentSettings.javascript.get({ primaryUrl: jsActiveTabUrl });
    const enabled = details?.setting !== "block";
    const managed = details?.source === "policy";

    jsToggle.checked = enabled;
    jsToggle.disabled = managed;
    jsToggle.title = managed ? "This JavaScript setting is managed by your organization" : "";
    jsHostLabel.textContent = managed ? `${jsHost} (managed by organization)` : jsHost;
    jsLastEnabled = enabled;
    updateJsUI(enabled);
  } catch (err) {
    showJsUnavailable(`${jsHost} (${formatExtensionError(err)})`);
  }
}

function updateJsUI(enabled, label) {
  jsStatus.textContent = label || (enabled ? "ENABLED" : "DISABLED");
  jsStatus.className = "status " + (enabled ? "on" : "off");
  jsIndicator.className = "indicator " + (enabled ? "on" : "off");
}

jsToggle.addEventListener("change", async () => {
  const enabled = jsToggle.checked;
  updateJsUI(enabled);

  if (!jsHost || !hasJsContentSettingsApi()) {
    await loadJsToggle();
    return;
  }

  jsToggle.disabled = true;
  let failed = false;

  try {
    for (const primaryPattern of jsPatternsForHost(jsHost)) {
      await chrome.contentSettings.javascript.set({
        primaryPattern,
        setting: enabled ? "allow" : "block",
      });
    }

    jsLastEnabled = enabled;

    // Reload the tab so the change takes effect.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await chrome.tabs.reload(tab.id);
  } catch (err) {
    failed = true;
    jsToggle.checked = jsLastEnabled;
    jsToggle.title = "This JavaScript setting could not be changed";
    jsHostLabel.textContent = `${jsHost} (${formatExtensionError(err)})`;
    updateJsUI(jsLastEnabled, "MANAGED");
  } finally {
    if (!failed) jsToggle.disabled = false;
  }
});

// ═══════════════════════════════════
//  Picture-in-Picture
// ═══════════════════════════════════
const pipBtn = document.getElementById("pipBtn");
const pipLabel = document.getElementById("pipLabel");
const pipStatus = document.getElementById("pipStatus");

pipBtn.addEventListener("click", enterPiP);

async function enterPiP() {
  pipStatus.textContent = "";
  pipStatus.className = "pip-status";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    pipStatus.textContent = "No active tab";
    pipStatus.className = "pip-status err";
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({ type: "pip", tabId: tab.id });
    if (!result) {
      pipStatus.textContent = "Could not access page";
      pipStatus.className = "pip-status err";
    } else if (result.error) {
      pipStatus.textContent = result.error;
      pipStatus.className = "pip-status err";
    } else if (result.action === "entered") {
      pipStatus.textContent = "Video in Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.add("active");
    } else if (result.action === "exited") {
      pipStatus.textContent = "Exited Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.remove("active");
    }
  } catch (err) {
    pipStatus.textContent = err.message;
    pipStatus.className = "pip-status err";
  }
}

// ═══════════════════════════════════
//  JSON Formatter
// ═══════════════════════════════════
const jsonformatToggle = document.getElementById("jsonformatToggle");
const jsonformatStatus = document.getElementById("jsonformatStatus");

async function loadJsonFormat() {
  const data = await chrome.storage.local.get(["jsonformat_enabled"]);
  const enabled = data.jsonformat_enabled !== false;
  jsonformatToggle.checked = enabled;
  updateJsonFormatUI(enabled);
}

function updateJsonFormatUI(on) {
  jsonformatStatus.textContent = on ? "ON" : "OFF";
  jsonformatStatus.className = "status " + (on ? "on" : "off");
}

jsonformatToggle.addEventListener("change", async () => {
  const enabled = jsonformatToggle.checked;
  updateJsonFormatUI(enabled);
  await chrome.storage.local.set({ jsonformat_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "jsonformat_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  Helpers
// ═══════════════════════════════════
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function escA(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
