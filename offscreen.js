const captures = new Map();

function normalizedGain(percent) {
  return Math.max(1, Math.min(5, (Number(percent) || 100) / 100));
}

function captureResponse(tabId, capture) {
  return {
    supported: true,
    active: Boolean(capture),
    tabId,
    percent: capture?.percent || 100,
  };
}

function stopCapture(tabId) {
  const capture = captures.get(tabId);
  if (!capture) return captureResponse(tabId, null);

  captures.delete(tabId);
  for (const track of capture.stream.getTracks()) {
    track.stop();
  }
  capture.source.disconnect();
  capture.gain.disconnect();
  capture.context.close().catch(() => {});
  return captureResponse(tabId, null);
}

async function startCapture(tabId, streamId, percent) {
  stopCapture(tabId);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const gain = context.createGain();
  const capture = { context, source, gain, stream, percent };

  gain.gain.setValueAtTime(normalizedGain(percent), context.currentTime);
  source.connect(gain);
  gain.connect(context.destination);
  captures.set(tabId, capture);

  for (const track of stream.getTracks()) {
    track.addEventListener("ended", () => {
      if (captures.get(tabId) === capture) stopCapture(tabId);
    }, { once: true });
  }

  await context.resume();
  return captureResponse(tabId, capture);
}

function setCaptureGain(tabId, percent) {
  const capture = captures.get(tabId);
  if (!capture) return captureResponse(tabId, null);

  capture.percent = percent;
  capture.gain.gain.setTargetAtTime(
    normalizedGain(percent),
    capture.context.currentTime,
    0.015,
  );
  capture.context.resume().catch(() => {});
  return captureResponse(tabId, capture);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== "superlevels-offscreen") return undefined;

  if (msg.type === "volume_capture_query") {
    sendResponse(captureResponse(msg.tabId, captures.get(msg.tabId)));
    return undefined;
  }
  if (msg.type === "volume_capture_gain") {
    sendResponse(setCaptureGain(msg.tabId, msg.percent));
    return undefined;
  }
  if (msg.type === "volume_capture_stop") {
    sendResponse(stopCapture(msg.tabId));
    return undefined;
  }
  if (msg.type === "volume_capture_start") {
    startCapture(msg.tabId, msg.streamId, msg.percent)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          supported: true,
          active: false,
          error: err?.message || "Could not process captured tab audio.",
        });
      });
    return true;
  }

  return undefined;
});
