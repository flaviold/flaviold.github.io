(function (ns) {
  const { createApp } = Vue;

  const SPLIT_MIN = 10;
  const SPLIT_MAX = 90;
  const THUMB_MIN_WIDTH = 160;
  const THUMB_MIN_HEIGHT = 90;
  const THUMB_MARGIN = 16;
  const CONTROLS_IDLE_MS = 2500;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const { track } = ns;

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("a");
    const b = params.get("b");
    if (!a || !b) return { error: "view.errorMissing" };
    if (!ns.vdo.isValidStreamId(a) || !ns.vdo.isValidStreamId(b)) return { error: "view.errorInvalid" };
    return { a, b };
  }

  createApp({
    data() {
      const params = readParams();
      return {
        error: params.error || null, // i18n key
        urls: params.error ? {} : { a: ns.vdo.viewUrl(params.a), b: ns.vdo.viewUrl(params.b) },
        layout: "row", // "row" (side by side) | "col" (stacked)
        mode: "split", // "split" | "thumb-a" | "thumb-b"
        swapped: false, // split mode only: B shown first
        split: 50, // size of the first visible feed, in %
        thumb: null, // { x, y, w, h } in px, relative to the stage
        dragging: null, // "split" | "move" | "resize"
        controlsVisible: true,
        hoveringControls: false,
        isFullscreen: false,
      };
    },

    computed: {
      isThumbMode() {
        return this.mode !== "split";
      },
    },

    mounted() {
      if (this.error) track("display-error", { reason: this.error === "view.errorMissing" ? "missing" : "invalid" });
      this.showControls();
      window.addEventListener("resize", this.clampThumb);
      document.addEventListener("fullscreenchange", () => {
        this.isFullscreen = !!document.fullscreenElement;
      });
    },

    methods: {
      // "first" | "second" in split mode, "main" | "thumb" in thumbnail mode.
      feedRole(feed) {
        if (this.isThumbMode) return this.mode === `thumb-${feed}` ? "thumb" : "main";
        return (feed === "a") !== this.swapped ? "first" : "second";
      },

      feedStyle(feed) {
        const role = this.feedRole(feed);
        if (role === "first") return { order: 1, flex: `0 0 calc(${this.split}% - 3px)` };
        if (role === "second") return { order: 3, flex: "1 1 0" };
        if (role === "thumb" && this.thumb) {
          const { x, y, w, h } = this.thumb;
          return { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` };
        }
        return {};
      },

      setLayout(layout) {
        if (layout === this.layout) return;
        this.layout = layout;
        track("display-layout", { layout: layout === "row" ? "side-by-side" : "stacked" });
      },

      setMode(mode) {
        if (mode === this.mode) return;
        this.mode = mode;
        track("display-mode", { mode });
        if (mode !== "split" && !this.thumb) this.resetThumb();
      },

      swap() {
        track("display-swap");
        if (this.mode === "thumb-a") this.mode = "thumb-b";
        else if (this.mode === "thumb-b") this.mode = "thumb-a";
        else this.swapped = !this.swapped;
      },

      resetThumb() {
        const rect = this.$refs.stage.getBoundingClientRect();
        const w = Math.max(THUMB_MIN_WIDTH, rect.width * 0.25);
        const h = (w * 9) / 16;
        this.thumb = { x: rect.width - w - THUMB_MARGIN, y: rect.height - h - THUMB_MARGIN, w, h };
      },

      clampThumb() {
        if (!this.thumb || !this.$refs.stage) return;
        const rect = this.$refs.stage.getBoundingClientRect();
        const w = clamp(this.thumb.w, THUMB_MIN_WIDTH, rect.width);
        const h = clamp(this.thumb.h, THUMB_MIN_HEIGHT, rect.height);
        this.thumb = {
          w,
          h,
          x: clamp(this.thumb.x, 0, rect.width - w),
          y: clamp(this.thumb.y, 0, rect.height - h),
        };
      },

      // A full-screen shield covers the iframes while dragging, otherwise they swallow pointer events.
      startDrag(event, kind) {
        event.preventDefault();
        const rect = this.$refs.stage.getBoundingClientRect();
        const start = { x: event.clientX, y: event.clientY, thumb: this.thumb && { ...this.thumb } };
        this.dragging = kind;

        const onMove = (e) => {
          if (kind === "split") {
            const ratio = this.layout === "row"
              ? (e.clientX - rect.left) / rect.width
              : (e.clientY - rect.top) / rect.height;
            this.split = clamp(ratio * 100, SPLIT_MIN, SPLIT_MAX);
          } else if (kind === "move") {
            this.thumb = {
              ...start.thumb,
              x: clamp(start.thumb.x + e.clientX - start.x, 0, rect.width - start.thumb.w),
              y: clamp(start.thumb.y + e.clientY - start.y, 0, rect.height - start.thumb.h),
            };
          } else if (kind === "resize") {
            this.thumb = {
              ...start.thumb,
              w: clamp(start.thumb.w + e.clientX - start.x, THUMB_MIN_WIDTH, rect.width - start.thumb.x),
              h: clamp(start.thumb.h + e.clientY - start.y, THUMB_MIN_HEIGHT, rect.height - start.thumb.y),
            };
          }
        };
        const onUp = () => {
          this.dragging = null;
          track("display-resize", { kind });
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      },

      showControls() {
        this.controlsVisible = true;
        clearTimeout(this.controlsTimer);
        this.controlsTimer = setTimeout(() => {
          if (!this.hoveringControls && !this.dragging) this.controlsVisible = false;
        }, CONTROLS_IDLE_MS);
      },

      toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
        else {
          document.documentElement.requestFullscreen().catch(() => {});
          track("display-fullscreen");
        }
      },
    },
  })
    .use(ns.i18n.plugin("view.title"))
    .mount("#app");
})(window.VDOShare);
