# 🚀 SuperLevels Privacy Fork

A compact, open-source browser extension that replaces several separate privacy and focus tools with one auditable package.

This fork targets Firefox, Brave, Chromium, and Microsoft Edge. It intentionally uses the browser's default extension icon so the repo does not need PNG icon assets.

## Privacy Hardening

- Removed music recognition, ACRCloud upload code, stored ACR credentials, and the `tabCapture` permission.
- Removed Tab Cleaner runtime/UI and clears stale Tab Cleaner storage keys on install/startup.
- Removed Google Search/Images injections, including Google Maps links and View Image.
- Limited page access to `http://*/*` and `https://*/*` instead of `<all_urls>`.
- Redacted redirect query-string values before showing or copying redirect chains.
- Consolidated page injections into one guarded content script.

## Features

- 🍪 Cookie Editor: view, edit, add, delete, and export cookies for the current site.
- 🔀 Redirect Tracer: inspect redacted redirect chains for the active tab.
- 🌙 Dark Mode: per-site or global color-inverting dark mode.
- ☀ Brightness: reduce any site's brightness from 100% down to 20% without enabling Dark Mode, saved per site.
- 𝕏 X Theme: custom dim palettes for X/Twitter.
- 𝕏 X Unhook: hide X/Twitter sidebar panels and Explore links.
- ⚡ JS Toggle: disable JavaScript per site where the browser exposes `contentSettings.javascript`.
- 🎨 Live CSS Editor: per-domain custom CSS with live preview.
- 📺 YouTube Unhook: hide recommendations, Shorts shelves, sidebar suggestions, and end screens.
- 🖼 Picture-in-Picture: pop the largest video on the current tab into PiP.
- `{}` JSON Formatter: format pure JSON response pages with highlighting and collapsible sections.
- 🔊 Volume Booster: amplify audio and video from 100–500%, saved per site. Brave Origin/Chromium captures the tab's final audio output for DRM-friendly processing; Firefox uses the Web Audio API on page media.

## Install

### Brave / Chromium / Microsoft Edge

1. Download or clone this repo.
2. Open your browser's extensions page:
   - Brave: `brave://extensions/`
   - Microsoft Edge: `edge://extensions/`
   - Chrome / Chromium: `chrome://extensions/`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `superlevels` folder.

In managed Microsoft Edge profiles, your organization can block unpacked extensions, force extension allowlists, or lock the JavaScript content setting. When that happens, the extension reports the blocked/managed state instead of failing silently.

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` from this folder.

Firefox 140 or newer is supported through an MV3 background-script fallback. The JS toggle may be unavailable because Firefox does not expose Chromium's `contentSettings.javascript` API.

After loading the extension, reload any already-open media tab before using Volume Booster. Some DRM-protected or cross-origin media can reject Web Audio processing; Superlevels reports that failure instead of silently changing the player.

On Brave Origin/Chromium 116 or newer, Volume Booster uses `tabCapture` and an offscreen audio graph. Captured tab audio is connected back to the default output so playback continues after the popup closes. Setting the slider to 100% stops capture and restores normal tab playback.

## Audit Notes

- No analytics, tracking, or network phone-home.
- Settings stay local in `chrome.storage.local`.
- Redirect tracing strips usernames, passwords, hashes, and query-string values before display/copy.
- Source is intentionally small enough to review directly.

## License

MIT
