(function (ns) {
  const { createApp } = Vue;

  const TOUR_STEPS = [
    {
      target: '[data-tour="create"]',
      title: "Create a share link",
      text: "Give it an optional label and click Generate link. Send the link to the person who will share. They choose camera or screen inside VDO.Ninja.",
    },
    {
      target: '[data-tour="shares"]',
      title: "Track your shares",
      text: "Every link you create is saved in this browser. Status turns Active while someone is sharing on that link. Use Copy link, Preview or Remove on each one.",
    },
    {
      target: ['table.shares', '[data-tour="shares"]'],
      title: "Pick two feeds",
      text: "Tick the Display box on two shares. The first one you tick is feed A, the second is feed B.",
    },
    {
      target: '[data-tour="display"]',
      title: "Open the display page",
      text: "Copy or open the display link. There you can show the feeds side by side or stacked, drag the divider, or turn either feed into a movable thumbnail.",
    },
  ];

  function isTourDone() {
    try {
      return localStorage.getItem(ns.config.TOUR_DONE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  createApp({
    data() {
      return {
        shares: ns.storage.load(),
        statuses: {}, // streamId -> "active" | "inactive"; missing means still checking
        newLabel: "",
        lastCreated: null,
        selected: [], // ordered stream IDs: [A, B]
        copiedKey: null,
        pollSeconds: Math.round(ns.config.POLL_INTERVAL_MS / 1000),
        tourSteps: TOUR_STEPS,
        tourOpen: !isTourDone(),
      };
    },

    computed: {
      displayUrl() {
        if (this.selected.length !== 2) return "";
        const [a, b] = this.selected;
        return new URL(`view.html?a=${a}&b=${b}`, window.location.href).href;
      },
    },

    mounted() {
      this.monitor = ns.status.createMonitor(
        () => this.shares.map((s) => s.streamId),
        (id, status) => { this.statuses[id] = status; },
      );
      this.monitor.start();
    },

    methods: {
      pushUrl(share) {
        return ns.vdo.pushUrl(share.streamId, share.label);
      },

      previewUrl(share) {
        return ns.vdo.viewUrl(share.streamId, { noaudio: false });
      },

      createShare() {
        const share = ns.storage.add(this.newLabel);
        this.shares = ns.storage.load();
        this.lastCreated = share;
        this.newLabel = "";
        this.monitor.checkNow(share.streamId);
      },

      removeShare(share) {
        const name = share.label || share.streamId;
        if (!window.confirm(`Remove "${name}"? Its links will stop being listed here.`)) return;
        ns.storage.remove(share.streamId);
        this.shares = ns.storage.load();
        this.selected = this.selected.filter((id) => id !== share.streamId);
        delete this.statuses[share.streamId];
        if (this.lastCreated && this.lastCreated.streamId === share.streamId) this.lastCreated = null;
      },

      updateLabel(share, label) {
        ns.storage.updateLabel(share.streamId, label.trim());
        this.shares = ns.storage.load();
      },

      toggleSelect(streamId) {
        if (this.selected.includes(streamId)) {
          this.selected = this.selected.filter((id) => id !== streamId);
        } else if (this.selected.length < 2) {
          this.selected = [...this.selected, streamId];
        }
      },

      async copy(text, key) {
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {
          window.prompt("Copy this link:", text);
          return;
        }
        this.copiedKey = key;
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => { this.copiedKey = null; }, 1500);
      },

      startTour() {
        this.tourOpen = true;
      },

      closeTour() {
        this.tourOpen = false;
        try {
          localStorage.setItem(ns.config.TOUR_DONE_KEY, "1");
        } catch (e) {
          // Without storage the tour simply shows again next visit.
        }
      },

      statusText(status) {
        if (status === "active") return "Active";
        if (status === "inactive") return "Inactive";
        return "Checking…";
      },

      formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
      },
    },
  })
    .component("tour-overlay", ns.TourOverlay)
    .mount("#app");
})(window.VDOShare);
