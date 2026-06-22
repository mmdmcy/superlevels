(() => {
  const contentHost = location.hostname;
  const isYouTube = contentHost === "www.youtube.com" || contentHost === "m.youtube.com";
  const isX =
    contentHost === "x.com" ||
    contentHost === "twitter.com" ||
    contentHost === "mobile.x.com" ||
    contentHost === "mobile.twitter.com";

  function whenBodyReady(fn) {
    if (document.body) {
      fn();
      return;
    }
    const run = () => {
      if (document.body) fn();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      setTimeout(run, 0);
    }
  }

  (() => {
    const STYLE_ID = "superlevels-darkmode";

    function buildCSS(brightness) {
      const b = brightness / 100;
      return `
        html.superlevels-dark {
          filter: invert(1) hue-rotate(180deg) brightness(${b}) !important;
          background: #fff !important;
        }
        html.superlevels-dark img,
        html.superlevels-dark video,
        html.superlevels-dark canvas,
        html.superlevels-dark svg image,
        html.superlevels-dark picture,
        html.superlevels-dark [style*="background-image"],
        html.superlevels-dark iframe {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        html.superlevels-dark input,
        html.superlevels-dark textarea,
        html.superlevels-dark select {
          background-color: inherit !important;
          color: inherit !important;
        }
      `;
    }

    function applyDarkMode(enabled, brightness) {
      let style = document.getElementById(STYLE_ID);
      if (enabled) {
        if (!style) {
          style = document.createElement("style");
          style.id = STYLE_ID;
          (document.head || document.documentElement).appendChild(style);
        }
        style.textContent = buildCSS(brightness);
        document.documentElement.classList.add("superlevels-dark");
      } else {
        document.documentElement.classList.remove("superlevels-dark");
        if (style) style.remove();
      }
    }

    const host = location.hostname;
    const storageKey = "darkmode_" + host;
    const globalKey = "darkmode_global";

    chrome.storage.local.get([storageKey, globalKey, "darkmode_brightness"], (data) => {
      const siteState = data[storageKey];
      const globalState = data[globalKey];
      const enabled = siteState !== undefined ? siteState : (globalState || false);
      const brightness = data.darkmode_brightness || 100;
      if (enabled) applyDarkMode(true, brightness);
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "darkmode_toggle") {
        applyDarkMode(msg.enabled, msg.brightness || 100);
        sendResponse({ ok: true });
      }
      if (msg.type === "darkmode_query") {
        sendResponse({
          active: document.documentElement.classList.contains("superlevels-dark"),
          host,
        });
      }
    });
  })();

  (() => {
    const STYLE_ID = "sl-livecss";

    function applyCSS(css) {
      let el = document.getElementById(STYLE_ID);
      if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = css || "";
    }

    const host = location.hostname;
    if (host) {
      chrome.storage.local.get(["livecss_" + host], (data) => {
        const css = data["livecss_" + host];
        if (css) applyCSS(css);
      });
    }

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "livecss_update") {
        applyCSS(msg.css);
      }
    });
  })();

  (() => {
    const STYLE_ID = "sl-nocookie";

    const HIDE_CSS = `
      #cookie-banner, #cookie-notice, #cookie-consent, #cookie-popup,
      #cookiebanner, #cookienotice, #cookieconsent, #cookiepopup,
      #cookie_banner, #cookie_notice, #cookie_consent, #cookie_popup,
      .cookie-banner, .cookie-notice, .cookie-consent, .cookie-popup,
      .cookiebanner, .cookienotice, .cookieconsent, .cookiepopup,
      .cookie_banner, .cookie_notice, .cookie_consent, .cookie_popup,
      #gdpr-banner, #gdpr-consent, .gdpr-banner, .gdpr-consent,
      #cc-window, .cc-window, .cc-banner, .cc-overlay, .cc-revoke,
      #onetrust-banner-sdk, #onetrust-consent-sdk, .onetrust-pc-dark-filter,
      .ot-sdk-row, #ot-sdk-btn-floating,
      .cky-consent-container, #cky-consent,
      .didomi-popup, #didomi-host, #didomi-notice,
      .sp-message-open, #sp_message_container_0,
      [class*="cookie-banner"], [class*="cookie-consent"],
      [id*="cookie-banner"], [id*="cookie-consent"],
      [class*="CookieBanner"], [class*="CookieConsent"],
      .fc-consent-root, .fc-dialog-overlay, .fc-dialog,
      .qc-cmp-showing, #qcCmpUi, .qc-cmp2-container,
      .truste_box_overlay, #truste-consent-track,
      .osano-cm-dialog, .osano-cm-window,
      [aria-label="Cookie banner"], [aria-label="cookie consent"],
      .evidon-banner, #_evidon_banner,
      .iubenda-cs-container, #iubenda-cs-banner,
      .klaro, .cookie-modal-wrapper,
      #usercentrics-root, [id^="usercentrics"],
      .cmpboxBG, .cmpbox, #cmpbox, #cmpbox2,
      .js-cookie-consent, .cookie-law-info-bar,
      #cookie-law-info-bar, .cli-modal,
      .eupopup, #eu-cookie-bar, .eu-cookie-compliance-banner,
      #catapult-cookie-bar, .ct-ultimate-gdpr-cookie-popup,
      .cookiealert, #cookiealert, .cookie-alert,
      .consent-banner, #consent-banner, .consent-popup,
      .privacy-notice, #privacy-notice, .privacy-banner,
      .cc-floating, .cc-bottom, .cc-top,
      [data-testid="cookie-banner"], [data-testid="cookie-consent"],
      .snigel-cmp-framework, #snigel-cmp-framework,
      .adroll_consent_banner, #adroll_consent_container,
      .termly-consent-banner, #termly-code-snippet-support,
      .CybotCookiebotDialog, #CybotCookiebotDialog,
      #CybotCookiebotDialogBodyUnderlay,
      .cmplz-cookiebanner, #cmplz-cookiebanner-container {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -99999 !important;
      }
      body.cookie-consent-open,
      body.modal-open-cookie,
      body.no-scroll,
      body.sp-message-open,
      body.cmplz-blocked-content-container,
      html.sp-message-open,
      html.cookie-consent-open,
      body.ot-overflow-hidden,
      html.ot-overflow-hidden {
        overflow: auto !important;
        position: static !important;
      }
      .cc-grower { max-height: 0 !important; }
    `;

    const CLICK_SELECTORS = [
      "#onetrust-reject-all-handler",
      "#onetrust-pc-btn-handler",
      ".onetrust-close-btn-handler",
      "#CybotCookiebotDialogBodyButtonDecline",
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
      "#CybotCookiebotDialogBodyLevelButtonCustomize",
      ".cky-btn-reject",
      ".cky-btn-close",
      ".didomi-continue-without-agreeing",
      "#didomi-notice-disagree-button",
      ".qc-cmp2-summary-buttons button[mode='secondary']",
      ".qc-cmp-button[mode='secondary']",
      ".fc-cta-consent .fc-secondary-button",
      ".cc-deny",
      ".cc-btn.cc-dismiss",
      "[data-cookiefirst-action='reject']",
      ".cookie-reject",
      ".js-cookie-reject",
      ".decline-button",
      "#decline-button",
      ".cli_settings_button",
      ".cli-plugin-main-button",
      "#cookie_action_close_header",
      ".eupopup-closebutton",
      "#eu-cookie-compliance-reject",
      ".iubenda-cs-reject-btn",
      "[data-action='reject']",
      ".osano-cm-denyAll",
      ".reject-cookies-button",
      "button[data-gdpr='reject']",
      ".js-reject-cookies",
      ".cmplz-btn.cmplz-deny",
      ".snigel-cmp-reject-all",
      'button[title="Reject" i]',
      'button[title="Reject all" i]',
      'button[title="Decline" i]',
      'button[title="Decline all" i]',
      'button[title="Necessary only" i]',
      'button[title="Essential only" i]',
      '[aria-label="Reject" i]',
      '[aria-label="Reject all" i]',
      '[aria-label="Decline" i]',
      '[aria-label="Decline all" i]',
      '[aria-label="Necessary only" i]',
      '[aria-label="Essential only" i]',
      '[aria-label="Close" i][class*="cookie" i]',
      '[aria-label="Close" i][class*="consent" i]',
    ];

    function injectCSS() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = HIDE_CSS;
      (document.head || document.documentElement).appendChild(style);
    }

    function tryClick() {
      for (const sel of CLICK_SELECTORS) {
        try {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.click();
            return true;
          }
        } catch {}
      }
      return false;
    }

    function removeCSS() {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    }

    function activate() {
      injectCSS();
      setTimeout(tryClick, 500);
      setTimeout(tryClick, 1500);
      setTimeout(tryClick, 3000);
      setTimeout(tryClick, 5000);
    }

    chrome.storage.local.get(["nocookie_enabled"], (data) => {
      if (data.nocookie_enabled === true) activate();
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "nocookie_toggle") {
        if (msg.enabled) activate();
        else removeCSS();
      }
    });
  })();

  (() => {
    const STYLE_ID = "sl-jsonformat";

    function isJsonPage() {
      const ct = document.contentType || "";
      if (ct.includes("json")) return true;

      const body = document.body;
      if (!body) return false;

      const children = body.children;
      if (children.length !== 1) return false;
      if (children[0].tagName !== "PRE") return false;

      const text = children[0].textContent.trim();
      if (!text || (text[0] !== "{" && text[0] !== "[")) return false;
      try {
        JSON.parse(text);
        return true;
      } catch {
        return false;
      }
    }

    function syntaxHighlight(json) {
      json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return json.replace(
        /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
          let cls = "sl-jf-number";
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? "sl-jf-key" : "sl-jf-string";
          } else if (/true|false/.test(match)) {
            cls = "sl-jf-bool";
          } else if (/null/.test(match)) {
            cls = "sl-jf-null";
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
    }

    function buildCollapsible(obj, indent) {
      indent = indent || 0;
      const pad = "  ".repeat(indent);
      const padInner = "  ".repeat(indent + 1);

      if (obj === null) return '<span class="sl-jf-null">null</span>';
      if (typeof obj !== "object") {
        return syntaxHighlight(JSON.stringify(obj));
      }

      const isArray = Array.isArray(obj);
      const open = isArray ? "[" : "{";
      const close = isArray ? "]" : "}";
      const entries = isArray ? obj : Object.keys(obj);

      if (entries.length === 0) {
        return isArray ? "[]" : "{}";
      }

      let html = `<span class="sl-jf-toggle" data-collapsed="false">${open}</span>`;
      html += '<span class="sl-jf-collapsible">';
      html += "\n";

      entries.forEach((entry, i) => {
        const key = isArray ? null : entry;
        const val = isArray ? entry : obj[entry];
        const comma = i < entries.length - 1 ? "," : "";

        html += padInner;
        if (key !== null) {
          html += `<span class="sl-jf-key">"${escHtml(key)}"</span>: `;
        }
        html += buildCollapsible(val, indent + 1);
        html += comma + "\n";
      });

      html += "</span>";
      html += '<span class="sl-jf-ellipsis" style="display:none">...</span>';
      html += pad + close;

      return html;
    }

    function escHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function applyJsonFormat() {
      if (!document.body) return;

      let raw = "";
      if (document.body.children.length === 1 && document.body.children[0].tagName === "PRE") {
        raw = document.body.children[0].textContent;
      } else if (document.body.querySelector("pre")) {
        raw = document.body.querySelector("pre").textContent;
      } else {
        raw = document.body.textContent;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw.trim());
      } catch {
        return;
      }

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        body {
          margin: 0; padding: 0;
          background: #1a1a2e !important;
          color: #e0e0e0 !important;
          font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace !important;
          font-size: 13px !important;
          line-height: 1.5 !important;
        }
        .sl-jf-wrap {
          padding: 16px 20px;
          white-space: pre;
          overflow-x: auto;
          tab-size: 2;
        }
        .sl-jf-key { color: #e94560; }
        .sl-jf-string { color: #a8d8a8; }
        .sl-jf-number { color: #6ab0f3; }
        .sl-jf-bool { color: #f3d86a; }
        .sl-jf-null { color: #888; font-style: italic; }
        .sl-jf-toggle {
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        .sl-jf-toggle:hover { text-decoration: underline; }
        .sl-jf-toggle::before {
          content: "v";
          display: inline-block;
          width: 1em;
          margin-left: -1em;
          font-size: 10px;
          color: #666;
          transition: transform 0.15s;
        }
        .sl-jf-toggle[data-collapsed="true"]::before {
          transform: rotate(-90deg);
        }
        .sl-jf-ellipsis {
          color: #666;
          cursor: pointer;
        }
        .sl-jf-toolbar {
          position: fixed; top: 8px; right: 12px;
          display: flex; gap: 6px; z-index: 99999;
        }
        .sl-jf-toolbar button {
          padding: 5px 10px;
          background: #16213e;
          color: #aaa;
          border: 1px solid #2a2a4a;
          border-radius: 5px;
          font-size: 11px;
          font-family: -apple-system, sans-serif;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .sl-jf-toolbar button:hover {
          background: #1b2a4a;
          color: #fff;
        }
      `;

      (document.head || document.documentElement).appendChild(style);
      document.body.innerHTML = "";

      const toolbar = document.createElement("div");
      toolbar.className = "sl-jf-toolbar";

      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        const copied = await copyText(JSON.stringify(parsed, null, 2));
        copyBtn.textContent = copied ? "Copied!" : "Copy failed";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
      });

      const rawBtn = document.createElement("button");
      rawBtn.textContent = "Raw";
      rawBtn.addEventListener("click", () => {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
        document.body.innerHTML = "";
        const pre = document.createElement("pre");
        pre.textContent = raw.trim();
        document.body.appendChild(pre);
      });

      const collapseBtn = document.createElement("button");
      collapseBtn.textContent = "Collapse All";
      collapseBtn.addEventListener("click", () => {
        const all = document.querySelectorAll(".sl-jf-toggle");
        const shouldCollapse = collapseBtn.textContent === "Collapse All";
        all.forEach((t) => {
          t.dataset.collapsed = shouldCollapse ? "true" : "false";
          const block = t.nextElementSibling;
          const ellipsis = block.nextElementSibling;
          if (block) block.style.display = shouldCollapse ? "none" : "";
          if (ellipsis) ellipsis.style.display = shouldCollapse ? "inline" : "none";
        });
        collapseBtn.textContent = shouldCollapse ? "Expand All" : "Collapse All";
      });

      toolbar.appendChild(copyBtn);
      toolbar.appendChild(collapseBtn);
      toolbar.appendChild(rawBtn);
      document.body.appendChild(toolbar);

      const wrap = document.createElement("div");
      wrap.className = "sl-jf-wrap";
      wrap.innerHTML = buildCollapsible(parsed, 0);
      document.body.appendChild(wrap);

      wrap.addEventListener("click", (e) => {
        const toggle = e.target.closest(".sl-jf-toggle");
        if (!toggle) return;
        const collapsed = toggle.dataset.collapsed === "true";
        toggle.dataset.collapsed = collapsed ? "false" : "true";
        const block = toggle.nextElementSibling;
        const ellipsis = block.nextElementSibling;
        if (block) block.style.display = collapsed ? "" : "none";
        if (ellipsis) ellipsis.style.display = collapsed ? "none" : "inline";
      });
    }

    function removeFormat() {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
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

    whenBodyReady(() => {
      chrome.storage.local.get(["jsonformat_enabled"], (data) => {
        if (data.jsonformat_enabled !== false && isJsonPage()) {
          applyJsonFormat();
        }
      });
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "jsonformat_toggle") {
        whenBodyReady(() => {
          if (msg.enabled && isJsonPage()) applyJsonFormat();
          else removeFormat();
        });
      }
    });
  })();

  if (isYouTube) {
    (() => {
      const STYLE_ID = "sl-unhook";

      const UNHOOK_CSS = `
        ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
        ytd-browse[page-subtype="home"] #primary > ytd-rich-grid-renderer,
        ytd-browse[page-subtype="home"] ytd-rich-section-list-renderer,
        ytd-browse[page-subtype="home"] #header,
        ytd-browse[page-subtype="home"] .ytd-browse-chips-wrapper {
          display: none !important;
        }
        ytd-browse[page-subtype="home"] #primary {
          display: flex !important;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }
        ytd-browse[page-subtype="home"] #primary::before {
          content: 'Focus Mode - Use the search bar';
          font-size: 20px;
          color: #444;
          font-family: 'YouTube Sans', 'Roboto', sans-serif;
          font-weight: 500;
        }
        #secondary.ytd-watch-flexy,
        ytd-watch-next-secondary-results-renderer,
        #related {
          display: none !important;
        }
        ytd-watch-flexy[flexy][is-two-columns_] #primary.ytd-watch-flexy {
          max-width: 100% !important;
        }
        .ytp-ce-element,
        .ytp-endscreen-content,
        .ytp-suggestion-set,
        .ytp-cards-teaser,
        .ytp-ce-covering-overlay,
        .ytp-ce-element-show {
          display: none !important;
        }
        ytd-browse[page-subtype="trending"] #contents {
          display: none !important;
        }
        #chips-wrapper.ytd-feed-filter-chip-bar-renderer,
        ytd-feed-filter-chip-bar-renderer {
          display: none !important;
        }
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer {
          display: none !important;
        }
        ytd-rich-shelf-renderer {
          display: none !important;
        }
      `;

      function inject() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = UNHOOK_CSS;
        (document.head || document.documentElement).appendChild(style);
      }

      function remove() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
      }

      chrome.storage.local.get(["unhook_enabled"], (data) => {
        if (data.unhook_enabled !== false) inject();
      });

      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "unhook_toggle") {
          if (msg.enabled) inject();
          else remove();
        }
      });
    })();
  }

  if (isX) {
    (() => {
      const DIM_BASE_ID = "x-dim-base-ext";
      const DIM_CLASS = "x-dim-active";

      const THEMES = {
        dim: { hue: 210, sat: 34 },
        slate: { hue: 210, sat: 8 },
        jade: { hue: 150, sat: 34 },
        plum: { hue: 270, sat: 34 },
        dusk: { hue: 330, sat: 34 },
        ember: { hue: 25, sat: 34 },
      };

      let _theme = "dim";
      let _customHue = 210;

      function getLocalPreference(key) {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      }

      function paletteFromHue(h, s) {
        const bSat = Math.round(s * 0.47);
        return {
          bg: `hsl(${h}, ${s}%, 13%)`,
          bgHover: `hsl(${h}, ${Math.round(s * 0.74)}%, 16%)`,
          bgElevated: `hsl(${h}, ${Math.round(s * 0.71)}%, 20%)`,
          backdrop: `hsla(${h}, ${s}%, 13%, 0.85)`,
          text: `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`,
          border: `hsl(${h}, ${bSat}%, 26%)`,
          bgRaw: `${h} ${s}% 13%`,
          borderRaw: `${h} ${bSat}% 26%`,
          mutedRaw: `${h} ${bSat}% 55%`,
          grayRaw60: `${h} ${bSat}% 60%`,
          grayRaw50: `${h} ${bSat}% 50%`,
        };
      }

      function getActiveHueSat() {
        if (_theme === "custom") return { hue: _customHue, sat: 34 };
        return THEMES[_theme] || THEMES.dim;
      }

      function buildThemeCSS() {
        const { hue: h, sat: s } = getActiveHueSat();
        const p = paletteFromHue(h, s);
        return `
          html.${DIM_CLASS} {
            --xdm-bg: ${p.bg};
            --xdm-bg-hover: ${p.bgHover};
            --xdm-bg-elevated: ${p.bgElevated};
            --xdm-backdrop: ${p.backdrop};
            --xdm-text: ${p.text};
            --xdm-border: ${p.border};
          }
          html.${DIM_CLASS} body.LightsOut {
            --color: var(--xdm-text);
            --border: ${p.borderRaw};
            --input: ${p.borderRaw};
            --border-color: var(--xdm-border);
          }
          html.${DIM_CLASS}[data-theme="dark"],
          html.${DIM_CLASS} [data-theme="dark"] {
            --background: ${p.bgRaw};
            --border: ${p.borderRaw};
            --input: ${p.borderRaw};
            --muted-foreground: ${p.mutedRaw};
            --color-background: ${p.bgRaw};
            --color-gray-0: ${p.bgRaw};
            --color-gray-50: ${p.borderRaw};
            --color-gray-100: ${p.borderRaw};
            --color-gray-700: ${p.grayRaw60};
            --color-gray-800: ${p.grayRaw50};
          }`;
      }

      const STATIC_CSS = `
        html.${DIM_CLASS},
        html.${DIM_CLASS} body {
          background-color: var(--xdm-bg) !important;
        }
        html.${DIM_CLASS} [style*="background-color: rgb(0, 0, 0)"],
        html.${DIM_CLASS} [style*="background-color: rgba(0, 0, 0, 1)"] {
          background-color: var(--xdm-bg) !important;
        }
        html.${DIM_CLASS} [style*="background-color: rgb(24, 24, 27)"] {
          background-color: var(--xdm-bg-hover) !important;
        }
        html.${DIM_CLASS} [role="link"] > div > div:first-child div:has(> svg:only-child) {
          background-color: var(--xdm-bg-elevated) !important;
        }
        html.${DIM_CLASS} .r-kemksi,
        html.${DIM_CLASS} .r-1niwhzg,
        html.${DIM_CLASS} .r-yfoy6g,
        html.${DIM_CLASS} .r-14lw9ot {
          background-color: var(--xdm-bg) !important;
        }
        html.${DIM_CLASS} form[role="search"] input {
          background-color: transparent !important;
        }
        html.${DIM_CLASS} .r-1niwhzg.r-sdzlij {
          background-color: transparent !important;
        }
        html.${DIM_CLASS} .r-5zmot {
          background-color: var(--xdm-backdrop) !important;
        }
        html.${DIM_CLASS} .r-1shrkeu {
          background-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} .r-1hdo0pc {
          background-color: var(--xdm-bg-hover) !important;
        }
        html.${DIM_CLASS} .r-g2wdr4 {
          background-color: var(--xdm-bg-hover) !important;
        }
        html.${DIM_CLASS} .r-g2wdr4 [role="link"]:hover {
          background-color: var(--xdm-bg-elevated) !important;
        }
        html.${DIM_CLASS} .r-1kqtdi0,
        html.${DIM_CLASS} .r-1roi411 {
          border-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} .r-2sztyj {
          border-top-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} .r-1igl3o0,
        html.${DIM_CLASS} .r-rull8r {
          border-bottom-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} .r-gu4em3,
        html.${DIM_CLASS} .r-1bnu78o {
          background-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} .r-1bwzh9t {
          color: var(--xdm-text) !important;
        }
        html.${DIM_CLASS} .draftjs-styles_0 .public-DraftEditorPlaceholder-root,
        html.${DIM_CLASS} .public-DraftEditorPlaceholder-inner {
          color: var(--xdm-text) !important;
        }
        html.${DIM_CLASS} [style*="color: rgb(113, 118, 123)"],
        html.${DIM_CLASS} [style*="-webkit-line-clamp: 3; color: rgb(113, 118, 123)"],
        html.${DIM_CLASS} [style*="-webkit-line-clamp: 2; color: rgb(113, 118, 123)"] {
          color: var(--xdm-text) !important;
        }
        html.${DIM_CLASS} ::placeholder {
          color: var(--xdm-text) !important;
        }
        html.${DIM_CLASS} .bg-gray-0 {
          background-color: var(--xdm-bg) !important;
        }
        html.${DIM_CLASS} .border-gray-50,
        html.${DIM_CLASS} .border-gray-100 {
          border-color: var(--xdm-border) !important;
        }
        html.${DIM_CLASS} [style*="border-color: rgb(47, 51, 54)"].r-1che71a {
          background-color: var(--xdm-bg-hover) !important;
        }
        html.${DIM_CLASS} .xdm-dimmed {
          background-color: var(--xdm-bg) !important;
        }
        html.${DIM_CLASS} .xdm-dimmed-elevated {
          background-color: var(--xdm-bg-hover) !important;
        }
        html.${DIM_CLASS} .jf-element:has(> span:only-child > svg:only-child) {
          background-color: var(--xdm-bg-elevated) !important;
        }
        html.${DIM_CLASS} .xdm-dimmed-elevated .jf-element:empty {
          background-color: var(--xdm-border) !important;
          border-color: var(--xdm-border) !important;
        }
      `;

      function buildFullCSS() {
        return buildThemeCSS() + STATIC_CSS;
      }

      function ensureBaseCSS() {
        const css = buildFullCSS();
        let style = document.getElementById(DIM_BASE_ID);
        if (!style) {
          style = document.createElement("style");
          style.id = DIM_BASE_ID;
          (document.head || document.documentElement).appendChild(style);
        }
        if (style.textContent !== css) style.textContent = css;
      }

      ensureBaseCSS();

      if (
        getLocalPreference("__xdm_enabled") !== "0" &&
        (!window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.documentElement.classList.add(DIM_CLASS);
      }

      let _originalThemeColor = null;
      let _themeColorObserver = null;

      function syncThemeColor() {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
          if (!document.head) return;
          meta = document.createElement("meta");
          meta.name = "theme-color";
          document.head.appendChild(meta);
        }
        if (_originalThemeColor === null) _originalThemeColor = meta.getAttribute("content");
        const { hue, sat } = getActiveHueSat();
        const desired = `hsl(${hue}, ${sat}%, 13%)`;
        if (meta.getAttribute("content") !== desired) meta.setAttribute("content", desired);
      }

      function startThemeColorObserver() {
        if (_themeColorObserver || !document.head) return;
        _themeColorObserver = new MutationObserver(() => {
          if (_enabled && document.documentElement.classList.contains(DIM_CLASS)) syncThemeColor();
        });
        _themeColorObserver.observe(document.head, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["content"],
        });
      }

      function stopThemeColorObserver() {
        if (_themeColorObserver) {
          _themeColorObserver.disconnect();
          _themeColorObserver = null;
        }
      }

      function restoreThemeColor() {
        if (_originalThemeColor === null) return;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", _originalThemeColor);
        _originalThemeColor = null;
      }

      function applyDim() {
        ensureBaseCSS();
        document.documentElement.classList.add(DIM_CLASS);
        syncThemeColor();
        startThemeColorObserver();
        if (document.body) queueScan([document.body]);
      }

      function removeDim() {
        document.documentElement.classList.remove(DIM_CLASS);
        stopThemeColorObserver();
        restoreThemeColor();
        if (_scanFrame) {
          cancelAnimationFrame(_scanFrame);
          _scanFrame = 0;
          _pending.clear();
        }
        for (const el of document.querySelectorAll(".xdm-dimmed, .xdm-dimmed-elevated")) {
          el.classList.remove("xdm-dimmed", "xdm-dimmed-elevated");
        }
      }

      let _bodyObserver;
      let _suspendedForLight = false;
      let _seenLightsOut = false;

      function syncDimWithTheme() {
        if (!_enabled || !document.body) return;
        const hasLightsOut = document.body.classList.contains("LightsOut");
        const dimActive = document.documentElement.classList.contains(DIM_CLASS);
        if (hasLightsOut) {
          _suspendedForLight = false;
          applyDim();
          if (!dimActive) {
            for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
          }
        } else if (dimActive && _seenLightsOut) {
          _suspendedForLight = true;
          removeDim();
        }
      }

      function startBodyObserver() {
        if (_bodyObserver || !document.body) return;
        if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
        _bodyObserver = new MutationObserver(() => {
          if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
          syncDimWithTheme();
        });
        _bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }

      function stopBodyObserver() {
        if (_bodyObserver) {
          _bodyObserver.disconnect();
          _bodyObserver = null;
        }
      }

      let _scanFrame = 0;
      const _pending = new Set();

      function queueScan(nodes) {
        for (const n of nodes) {
          if (n && n.nodeType === 1) _pending.add(n);
        }
        if (_pending.size && !_scanFrame) _scanFrame = requestAnimationFrame(flushScan);
      }

      function flushScan() {
        _scanFrame = 0;
        if (!document.documentElement.classList.contains(DIM_CLASS)) {
          _pending.clear();
          return;
        }
        const batch = [..._pending];
        _pending.clear();
        for (const node of batch) dimSubtree(node);
      }

      function dimSubtree(root) {
        dimElement(root);
        for (const el of root.querySelectorAll("div,main,aside,header,nav,section,article,footer,button")) {
          dimElement(el);
        }
      }

      function dimElement(el) {
        if (
          !el ||
          el.nodeType !== 1 ||
          el.classList.contains("xdm-dimmed") ||
          el.classList.contains("xdm-dimmed-elevated")
        ) {
          return;
        }
        const bg = el.classList.contains("jf-element")
          ? (() => {
              try {
                return getComputedStyle(el).backgroundColor;
              } catch {
                return "";
              }
            })()
          : el.style.backgroundColor;
        if (bg === "rgb(0, 0, 0)" || bg === "rgba(0, 0, 0, 1)") {
          el.classList.add("xdm-dimmed");
        } else if (bg === "rgb(24, 24, 27)") {
          el.classList.add("xdm-dimmed-elevated");
        }
      }

      let _enabled = false;
      let _observer;

      function startObserver() {
        if (_observer) return;
        _observer = new MutationObserver((mutations) => {
          try {
            if (_enabled && !_suspendedForLight && !document.documentElement.classList.contains(DIM_CLASS)) {
              applyDim();
            }
            if (_enabled && document.documentElement.classList.contains(DIM_CLASS)) {
              for (const m of mutations) {
                if (m.addedNodes.length) queueScan(m.addedNodes);
              }
            }
            if (_enabled && document.body && !_bodyObserver) startBodyObserver();
          } catch {
            _observer.disconnect();
          }
        });
        _observer.observe(document.documentElement, { childList: true, subtree: true });
      }

      function fullRescan() {
        if (_enabled && document.body) queueScan([document.body]);
      }

      chrome.storage.local.get(["xdim_enabled", "xdim_theme", "xdim_customHue"], (data) => {
        _theme = data.xdim_theme ?? "dim";
        _customHue = data.xdim_customHue ?? 210;

        if (data.xdim_enabled === undefined) {
          _enabled = false;
        } else {
          _enabled = !!data.xdim_enabled;
        }
        try {
          localStorage.setItem("__xdm_enabled", _enabled ? "1" : "0");
        } catch {}

        ensureBaseCSS();

        if (_enabled) {
          const systemDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (systemDark) {
            applyDim();
            for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
          }
        } else {
          removeDim();
        }

        startObserver();
        if (_enabled && document.body) startBodyObserver();
      });

      chrome.storage.onChanged.addListener((changes) => {
        if (changes.xdim_enabled) {
          _enabled = !!changes.xdim_enabled.newValue;
          try {
            localStorage.setItem("__xdm_enabled", _enabled ? "1" : "0");
          } catch {}
          if (_enabled) {
            _suspendedForLight = false;
            startBodyObserver();
            applyDim();
          } else {
            stopBodyObserver();
            removeDim();
          }
        }
        if (changes.xdim_theme || changes.xdim_customHue) {
          if (changes.xdim_theme) _theme = changes.xdim_theme.newValue ?? "dim";
          if (changes.xdim_customHue) _customHue = changes.xdim_customHue.newValue ?? 210;
          ensureBaseCSS();
          syncThemeColor();
        }
      });

      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === "xdim_toggle") {
          _enabled = msg.enabled;
          if (_enabled) {
            applyDim();
            startBodyObserver();
          } else {
            removeDim();
            stopBodyObserver();
          }
          sendResponse({ ok: true });
        }
        if (msg.type === "xdim_query") {
          sendResponse({ active: document.documentElement.classList.contains(DIM_CLASS) });
        }
      });
    })();

    (() => {
      const STYLE_ID = "sl-xunhook";

      const XUNHOOK_CSS = `
        div[data-testid="sidebarColumn"] > div > div > div > div > div > div:not(:first-of-type) {
          display: none !important;
        }
        header[role="banner"] nav a[href="/explore"] {
          display: none !important;
        }
        div[aria-labelledby="modal-header"] a[href="/explore"] {
          display: none !important;
        }
      `;

      function inject() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = XUNHOOK_CSS;
        (document.head || document.documentElement).appendChild(style);
      }

      function remove() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
      }

      chrome.storage.local.get(["xunhook_enabled"], (data) => {
        if (data.xunhook_enabled !== false) inject();
      });

      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "xunhook_toggle") {
          if (msg.enabled) inject();
          else remove();
        }
      });
    })();
  }
})();
