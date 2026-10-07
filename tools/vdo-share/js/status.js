// Detects whether someone is publishing on a stream ID.
// A hidden VDO.Ninja viewer iframe (no video, no audio) is opened for each share; VDO.Ninja posts
// {action: "view-connection", value: true} to the parent once it connects to the publisher.
(function (ns) {
  const cfg = ns.config;
  const pending = new Map(); // iframe contentWindow -> finish(active)
  let container = null;

  window.addEventListener("message", (event) => {
    if (event.origin !== cfg.VDO_ORIGIN) return;
    const finish = pending.get(event.source);
    const data = event.data;
    if (finish && data && data.action === "view-connection" && data.value === true) finish(true);
  });

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "probe-container";
      container.setAttribute("aria-hidden", "true");
      document.body.appendChild(container);
    }
    return container;
  }

  function probe(streamId) {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.src = ns.vdo.viewUrl(streamId, { novideo: true, noaudio: true });
      iframe.allow = "autoplay";
      iframe.tabIndex = -1;
      getContainer().appendChild(iframe);

      const win = iframe.contentWindow;
      let timer = null;
      const finish = (active) => {
        if (!pending.has(win)) return;
        pending.delete(win);
        clearTimeout(timer);
        iframe.remove();
        resolve(active);
      };
      pending.set(win, finish);
      timer = setTimeout(() => finish(false), cfg.PROBE_WINDOW_MS);
    });
  }

  // getIds(): stream IDs to check; onResult(id, "active" | "inactive").
  function createMonitor(getIds, onResult) {
    let running = false;

    async function check(ids) {
      await Promise.all(ids.map((id) => probe(id).then((active) => onResult(id, active ? "active" : "inactive"))));
    }

    async function cycle() {
      if (running || document.hidden) return;
      running = true;
      try {
        await check(getIds());
      } finally {
        running = false;
      }
    }

    function start() {
      cycle();
      setInterval(cycle, cfg.POLL_INTERVAL_MS);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) cycle();
      });
    }

    return { start, checkNow: (id) => check([id]) };
  }

  ns.status = { probe, createMonitor };
})(window.VDOShare);
