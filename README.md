# 🚀 SuperLevels Privacy Fork

This is a privacy-hardened fork of SuperLevels, tuned for Brave, Microsoft Edge, and Firefox.

A browser extension that replaces several separate extensions with one open-source, auditable package.

Most Chrome extensions are closed-source malware/spyware-filled garbage that form a massive security risk. This one is open source and you can read and check the source code (with AI) before you install it, and customize it to your liking!

## Demo

![SuperLevels Demo](demo.gif)

## Security

Before installing any Chrome extension, you should verify it's safe. This extension is fully open source so you can audit every line of code yourself — or let AI do it for you:

1. Clone this repo or point your AI tool at the source code
2. Use [Cursor](https://cursor.sh), [Claude Code](https://claude.ai/claude-code), [Codex](https://openai.com/index/openai-codex/), or any AI coding tool
3. Ask it: *"Analyze this Chrome extension for security vulnerabilities, malware, spyware, data exfiltration, and any suspicious behavior"*
4. Read the report before you install

You should do this for **every** Chrome extension you use. Most extensions are closed-source and can't be audited — this one can.

## Privacy Hardening In This Fork

- Removed music recognition, ACRCloud upload code, stored ACR credentials, and the `tabCapture` permission.
- Disabled Tab Cleaner and its recently closed URL history. The code is commented for later restoration.
- Removed Google Search/Images injections, including Google Maps links and View Image.
- Limited page access to `http://*/*` and `https://*/*` instead of `<all_urls>`.
- Made cookie banner handling opt-in and reject/necessary/close-first instead of accept-all.
- Redacted redirect query-string values before showing or copying redirect chains.
- Disabled local pushes to the original upstream remote; pushes go to this fork through `origin`.

## Features

### 🚮 Tab Cleaner
Disabled in this fork. The code is kept commented for later restoration, but it no longer runs, closes tabs, or stores recently closed URLs.

### 🍪 Cookie Editor
Full cookie manager for the current site. View, edit, add, and delete cookies. Export cookies as JSON. Expand any cookie to see and modify all fields including domain, path, SameSite, secure, and httpOnly flags.

### 🔀 Redirect Tracer
See every redirect hop your browser took to reach the current page. Shows status codes (301, 302, 307, etc.) with a visual chain. Copy the full redirect chain to clipboard.

### 🌙 Dark Mode
Instant dark mode for any website using CSS filter inversion. Adjustable brightness. Toggle per-site or globally. Images and videos are automatically re-inverted so they look normal.

### 𝕏 X Dim Mode
Custom dim theme for X/Twitter with 7 color palettes: Dim, Slate, Jade, Plum, Dusk, Ember, or a custom hue. Live preview in the popup.

### ⚡ JS Toggle
Disable JavaScript per-site with one click. Useful for debugging, reading articles without popups, or testing progressive enhancement. Page reloads automatically.

### 🚫 GDPR Cookie Banner Hider
Off by default. When enabled, hides cookie banners and prefers reject, decline, necessary-only, or close buttons instead of accept-all actions.

### 🎨 Live CSS Editor
Write custom CSS for any website, applied in real-time as you type. Saved per-domain. Supports tab key for indentation.

### 📺 YouTube Unhook
Removes YouTube distractions: no homepage feed, no sidebar suggestions, no end screen overlays, no Shorts. Search still works — just no algorithmic recommendations.

### 🖼 Picture-in-Picture
Pop the largest video on the current tab into a floating PiP window with one click.

### {} JSON Formatter
Auto-detects pure JSON response pages and formats them with syntax highlighting, collapsible sections, and a dark theme. Copy or view raw with one click. Never triggers on regular HTML pages.

## Install

### Brave / Chromium / Microsoft Edge

1. Download or clone this repo
2. Open your browser's extensions page:
   - Brave: `brave://extensions/`
   - Microsoft Edge: `edge://extensions/`
   - Chrome / Chromium: `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `superlevels` folder

In managed Microsoft Edge profiles, your organization can block unpacked extensions, force extension allowlists, or lock the JavaScript content setting. When that happens, the extension now reports the blocked/managed state instead of failing silently. The reliable fix for policy blocks is still an IT allowlist or policy change.

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `manifest.json` from this folder

Firefox support is best-effort for this MV3 fork. Most features use standard WebExtension APIs; the JS toggle may be unavailable if `contentSettings.javascript` is not exposed by your Firefox build.

## Privacy

- **No data collection.** Settings stay local in `chrome.storage.local`.
- **No analytics, no tracking, no phone-home.**
- Music recognition, ACRCloud upload, tab audio capture, Google Search/Images injection, and tab-cleaner URL history are removed or disabled in this fork.
- Redirect tracing redacts query-string values before showing or copying URLs.
- All source code is right here. Read it, audit it, fork it.

## License

MIT
