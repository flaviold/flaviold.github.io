(function (ns) {
  const { createApp } = Vue;
  const cfg = ns.config;
  const { track } = ns;

  // title/text are i18n keys.
  const TOUR_STEPS = [
    { target: '[data-tour="nickname"]', title: "tour.create.nickname.title", text: "tour.create.nickname.text" },
    { target: '[data-tour="limit"]', title: "tour.create.limit.title", text: "tour.create.limit.text" },
    { target: '[data-tour="password"]', title: "tour.create.password.title", text: "tour.create.password.text" },
    { target: '[data-tour="start"]', title: "tour.create.start.title", text: "tour.create.start.text" },
  ];

  const DEMO_NICKNAME = "Alice";
  const tourDemo = ns.createTourDemo([
    {
      reset: (vm) => Object.assign(vm, { nickname: "", limit: cfg.LIMIT_DEFAULT, password: "" }),
      script: async (d) => {
        await d.click('[data-demo="nickname"]');
        await d.type("nickname", DEMO_NICKNAME);
      },
    },
    {
      reset: (vm) => Object.assign(vm, { nickname: DEMO_NICKNAME, limit: cfg.LIMIT_DEFAULT, password: "" }),
      script: async (d, vm) => {
        await d.click('[data-demo="limit-up"]', () => vm.changeLimit(1));
        await d.click('[data-demo="limit-up"]', () => vm.changeLimit(1));
        await d.click('[data-demo="limit-down"]', () => vm.changeLimit(-1));
      },
    },
    {
      reset: (vm) => Object.assign(vm, { nickname: DEMO_NICKNAME, limit: cfg.LIMIT_DEFAULT + 1, password: "" }),
      script: async (d) => {
        await d.click('[data-demo="password"]');
        await d.type("password", "secret");
      },
    },
    {
      reset: (vm) => Object.assign(vm, { nickname: DEMO_NICKNAME, limit: cfg.LIMIT_DEFAULT + 1, password: "secret" }),
      script: async (d) => {
        await d.click('[data-demo="start"]');
      },
    },
  ]);

  function isTourDone() {
    return ns.storage.get(localStorage, cfg.TOUR_CREATE_KEY) === 1;
  }

  createApp({
    data() {
      return {
        nickname: ns.storage.get(localStorage, cfg.NICKNAME_KEY) || "",
        limit: cfg.LIMIT_DEFAULT,
        password: "",
        error: null, // i18n key
        nicknameMax: cfg.NICKNAME_MAX,
        limitMin: cfg.LIMIT_MIN,
        limitMax: cfg.LIMIT_MAX,
        limitWarn: cfg.LIMIT_WARN_ABOVE,
        tourSteps: TOUR_STEPS,
        tourOpen: !isTourDone(),
        cursor: { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: false, clicking: false },
      };
    },

    // created(), not mounted(): the tour child mounts first and its first demo step resets the form.
    created() {
      if (this.tourOpen) this.beginTour("auto");
    },

    methods: {
      track,

      changeLimit(delta) {
        this.limit = Math.min(Math.max((Number(this.limit) || cfg.LIMIT_DEFAULT) + delta, cfg.LIMIT_MIN), cfg.LIMIT_MAX);
      },

      clampLimit() {
        this.changeLimit(0);
      },

      start() {
        if (this.tourOpen) return;
        const nickname = ns.cleanNickname(this.nickname);
        if (!nickname) {
          this.error = "create.nicknameRequired";
          return;
        }
        this.clampLimit();
        ns.storage.set(localStorage, cfg.NICKNAME_KEY, nickname);

        const sessionId = ns.randomId(16);
        // The password stays in this tab's sessionStorage instead of the URL.
        ns.storage.set(sessionStorage, cfg.SESSION_KEY_PREFIX + sessionId, {
          creator: true,
          fresh: true,
          limit: this.limit,
          password: this.password,
          nickname,
        });
        track("session-created", { limit: this.limit, password: Boolean(this.password) });
        window.location.href = `session.html?s=${sessionId}${this.password ? "&pw=1" : ""}`;
      },

      startTour() {
        this.tourOpen = true;
        this.beginTour("button");
      },

      beginTour(trigger) {
        this.formBeforeTour = { nickname: this.nickname, limit: this.limit, password: this.password };
        track("tour-started", { page: "create", trigger });
      },

      playTourDemo(step) {
        tourDemo.play(this, step);
      },

      // result: { completed, step } from the tour component.
      closeTour(result) {
        track(result.completed ? "tour-completed" : "tour-skipped", { page: "create", step: result.step + 1 });
        tourDemo.stop();
        this.tourOpen = false;
        Object.assign(this, this.formBeforeTour);
        this.cursor.visible = false;
        ns.storage.set(localStorage, cfg.TOUR_CREATE_KEY, 1);
      },
    },
  })
    .use(ns.i18n.plugin("app.title"))
    .component("tour-overlay", ns.TourOverlay)
    .mount("#app");
})(window.VDOShare2);
