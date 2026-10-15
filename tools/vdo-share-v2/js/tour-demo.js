// Animated demo engine for the guided tours: a fake cursor runs one script per tour step, in a loop.
// Each page supplies its own steps: [{ reset(vm), script(d, vm) }]. The engine drives vm.cursor
// ({ x, y, visible, clicking }); everything else is up to the page's reset/script.
(function (ns) {
  const MOVE_MS = 700;
  const CLICK_MS = 220;
  const AFTER_CLICK_MS = 450;
  const TYPE_MS = 90;
  const LOOP_PAUSE_MS = 1800;
  const STOP = Symbol("stop");

  ns.createTourDemo = function (steps) {
    let playToken = 0;

    async function play(vm, step) {
      const token = ++playToken;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const alive = () => token === playToken && vm.tourOpen;
      const { reset, script } = steps[step];

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
        await vm.$nextTick();
        await wait(AFTER_CLICK_MS);
      }

      // Appends text to vm[field] one character at a time.
      async function type(field, text) {
        for (const char of text) {
          vm[field] += char;
          await wait(TYPE_MS);
        }
      }

      const d = { click, type, wait };
      reset(vm); // synchronous, so the tour positions itself against the demo content
      try {
        do {
          await wait(500);
          await script(d, vm);
          await wait(LOOP_PAUSE_MS);
          if (!reduced) reset(vm);
        } while (!reduced);
      } catch (e) {
        if (e !== STOP) throw e;
      }
    }

    return {
      play,
      stop() {
        playToken++;
      },
    };
  };
})(window.VDOShare2);
