(function (ns) {
  const { createApp } = Vue;
  const { t } = ns.i18n;

  // title/text are i18n keys.
  const TOUR_STEPS = [
    { target: '[data-tour="create"]', title: "tour.create.title", text: "tour.create.text" },
    { target: '[data-tour="shares"]', title: "tour.shares.title", text: "tour.shares.text" },
    { target: ["table.shares", '[data-tour="shares"]'], title: "tour.select.title", text: "tour.select.text" },
    { target: '[data-tour="display"]', title: "tour.display.title", text: "tour.display.text" },
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
        if (!window.confirm(t("shares.removeConfirm", { name }))) return;
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
          window.prompt(t("action.copyPrompt"), text);
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

      formatDate(timestamp) {
        return new Date(timestamp).toLocaleString(ns.i18n.locale());
      },
    },
  })
    .use(ns.i18n.plugin("list.title"))
    .component("tour-overlay", ns.TourOverlay)
    .mount("#app");
})(window.VDOShare);
