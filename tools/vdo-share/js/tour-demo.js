// Animated demo for the guided tour: fills the list page with two mock shares and moves a fake
// cursor through each step in a loop. Drives the list app instance (vm) directly:
// vm.demo (mock data shown instead of the real list), vm.cursor, vm.newLabel, vm.copiedKey.
(function (ns) {
  const MOVE_MS = 700;
  const CLICK_MS = 220;
  const AFTER_CLICK_MS = 450;
  const TYPE_MS = 90;
  const LOOP_PAUSE_MS = 1800;
  const IDS = { camera: "DemoCamera01", screen: "DemoScreen02" };
  const STOP = Symbol("stop");

  let playToken = 0;

  function mockShare(kind) {
    return { streamId: IDS[kind], label: ns.i18n.t(`demo.${kind}`), createdAt: Date.now() };
  }

  // State each step starts from, so Back/Next always show a consistent picture.
  function initialState(step) {
    const camera = mockShare("camera");
    const screen = mockShare("screen");
    const both = [camera, screen];
    const live = { [IDS.camera]: "active", [IDS.screen]: "active" };
    switch (step) {
      case 0: return { shares: [], selected: [], statuses: {}, lastCreated: null };
      case 1: return { shares: both, selected: [], statuses: {}, lastCreated: null };
      case 2: return { shares: both, selected: [], statuses: live, lastCreated: null };
      default: return { shares: both, selected: [IDS.camera, IDS.screen], statuses: live, lastCreated: null };
    }
  }

  // One script per tour step. d: { click, type, wait, demo }
  const SCRIPTS = [
    async (d, vm) => {
      await d.click('[data-demo="label"]');
      await d.type(ns.i18n.t("demo.camera"));
      await d.click('[data-demo="generate"]', () => {
        const camera = mockShare("camera");
        d.demo().shares.unshift(camera);
        d.demo().lastCreated = camera;
        vm.newLabel = "";
      });
      await d.click('[data-demo="copy-last"]', () => { vm.copiedKey = "last"; });
    },
    async (d, vm) => {
      await d.click(`[data-demo="copy-${IDS.camera}"]`, () => { vm.copiedKey = IDS.camera; });
      await d.wait(1200); // the person opens the link and starts sharing
      d.demo().statuses[IDS.camera] = "active";
      d.demo().statuses[IDS.screen] = "inactive";
    },
    async (d) => {
      await d.click(`[data-demo="select-${IDS.camera}"]`, () => { d.demo().selected.push(IDS.camera); });
      await d.click(`[data-demo="select-${IDS.screen}"]`, () => { d.demo().selected.push(IDS.screen); });
    },
    async (d, vm) => {
      await d.click('[data-demo="copy-display"]', () => { vm.copiedKey = "display"; });
      await d.click('[data-demo="open-display"]');
    },
  ];

  async function play(vm, step) {
    const token = ++playToken;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alive = () => token === playToken && vm.tourOpen;

    const wait = async (ms) => {
      await new Promise((r) => setTimeout(r, reduced ? 0 : ms));
      if (!alive()) throw STOP;
    };

    async function moveTo(selector) {
      const target = document.querySelector(selector);
      if (!target || reduced) return;
      const r = target.getBoundingClientRect();
      vm.cursor = { ...vm.cursor, visible: true, x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 };
      await wait(MOVE_MS);
    }

    async function click(selector, effect) {
      await moveTo(selector);
      vm.cursor.clicking = true;
      await wait(CLICK_MS);
      vm.cursor.clicking = false;
      if (effect) effect();
      await wait(AFTER_CLICK_MS);
    }

    async function type(text) {
      for (const char of text) {
        vm.newLabel += char;
        await wait(TYPE_MS);
      }
    }

    const d = { click, type, wait, demo: () => vm.demo };
    const reset = () => {
      vm.demo = initialState(step);
      vm.newLabel = "";
      vm.copiedKey = null;
    };

    reset(); // synchronous, so the tour positions itself against the demo content
    try {
      do {
        await wait(500);
        await SCRIPTS[step](d, vm);
        await wait(LOOP_PAUSE_MS);
        if (!reduced) reset();
      } while (!reduced);
    } catch (e) {
      if (e !== STOP) throw e;
    }
  }

  function stop() {
    playToken++;
  }

  ns.tourDemo = { play, stop };
})(window.VDOShare);
