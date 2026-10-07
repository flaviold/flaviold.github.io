// Guided tour: highlights one element per step and shows a tooltip next to it.
// steps: [{ target: selector | [selectors, first visible wins], title, text }]; title/text are i18n keys.
(function (ns) {
  const GUTTER = 16; // min distance from the viewport edge
  const GAP = 12; // space between highlight and tooltip
  const PAD = 6; // highlight padding around the target

  ns.TourOverlay = {
    props: { steps: { type: Array, required: true } },
    emits: ["close", "step"],

    data() {
      return { index: 0, spot: null, tipStyle: {} };
    },

    computed: {
      step() {
        return this.steps[this.index];
      },
      isLast() {
        return this.index === this.steps.length - 1;
      },
    },

    template: `
      <div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div v-if="spot" class="tour-spot" :style="spot"></div>
        <div v-else class="tour-backdrop"></div>
        <div ref="tip" class="tour-tip" :style="tipStyle">
          <span class="muted small">{{ $t("tour.step", { n: index + 1, total: steps.length }) }}</span>
          <h3 id="tour-title">{{ $t(step.title) }}</h3>
          <p>{{ $t(step.text) }}</p>
          <div class="tour-actions">
            <button type="button" class="link" @click="close">{{ $t("tour.skip") }}</button>
            <button v-if="index > 0" type="button" @click="go(index - 1)">{{ $t("tour.back") }}</button>
            <button ref="next" type="button" class="primary" @click="isLast ? close() : go(index + 1)">{{ isLast ? $t("tour.done") : $t("tour.next") }}</button>
          </div>
        </div>
      </div>`,

    mounted() {
      // Reposition when the highlighted content changes size (e.g. the demo adds rows).
      this.resizeObserver = new ResizeObserver(() => this.position());
      this.resizeObserver.observe(document.body);
      window.addEventListener("resize", this.position);
      window.addEventListener("scroll", this.position, true);
      document.addEventListener("keydown", this.onKey);
      this.go(0);
    },

    unmounted() {
      this.resizeObserver.disconnect();
      window.removeEventListener("resize", this.position);
      window.removeEventListener("scroll", this.position, true);
      document.removeEventListener("keydown", this.onKey);
    },

    methods: {
      target() {
        for (const selector of [].concat(this.step.target)) {
          const el = document.querySelector(selector);
          if (el && el.getClientRects().length) return el;
        }
        return null;
      },

      async go(index) {
        this.index = index;
        this.$emit("step", index);
        await this.$nextTick();
        const el = this.target();
        if (el) el.scrollIntoView({ block: "center" });
        this.position();
        if (this.$refs.next) this.$refs.next.focus();
      },

      position() {
        const tip = this.$refs.tip;
        if (!tip) return;
        const vw = document.documentElement.clientWidth;
        const vh = window.innerHeight;
        const w = tip.offsetWidth;
        const h = tip.offsetHeight;
        const el = this.target();

        if (!el) {
          this.spot = null;
          this.tipStyle = { left: `${(vw - w) / 2}px`, top: `${Math.max(GUTTER, (vh - h) / 2)}px` };
          return;
        }

        const r = el.getBoundingClientRect();
        this.spot = {
          left: `${r.left - PAD}px`,
          top: `${r.top - PAD}px`,
          width: `${r.width + 2 * PAD}px`,
          height: `${r.height + 2 * PAD}px`,
        };

        // Below the target if it fits, else above, else pinned to the bottom of the viewport.
        let top;
        if (r.bottom + PAD + GAP + h <= vh - GUTTER) top = r.bottom + PAD + GAP;
        else if (r.top - PAD - GAP - h >= GUTTER) top = r.top - PAD - GAP - h;
        else top = vh - h - GUTTER;
        const left = Math.min(Math.max(r.left, GUTTER), vw - w - GUTTER);
        this.tipStyle = { left: `${left}px`, top: `${top}px` };
      },

      onKey(event) {
        if (event.key === "Escape") this.close();
        else if (event.key === "ArrowRight" && !this.isLast) this.go(this.index + 1);
        else if (event.key === "ArrowLeft" && this.index > 0) this.go(this.index - 1);
      },

      close() {
        this.$emit("close");
      },
    },
  };
})(window.VDOShare);
