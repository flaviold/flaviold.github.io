(function (ns) {
  const { createApp, markRaw } = Vue;
  const cfg = ns.config;
  const { t } = ns.i18n;
  const { track } = ns;

  const NOTICE_MS = 6000;
  const EMPTY_STATE = { me: {}, hostId: null, isHost: false, limit: 0, roster: [], shares: [], sharing: false, shareKind: null, live: false, pending: false };

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("s");
  const linkHasPassword = params.get("pw") === "1";
  const hashPassword = new URLSearchParams(window.location.hash.slice(1)).get("k");
  const storageKey = cfg.SESSION_KEY_PREFIX + sessionId;

  let client = null; // SessionClient, kept out of Vue's reactivity

  // <video> bound to a MediaStream.
  const VideoView = {
    props: { stream: { type: Object, required: true }, muted: Boolean },
    template: `<video autoplay playsinline></video>`,
    mounted() {
      this.apply();
    },
    watch: {
      stream() {
        this.apply();
      },
      muted(value) {
        this.$el.muted = value;
      },
    },
    methods: {
      apply() {
        const el = this.$el;
        el.muted = this.muted;
        if (el.srcObject !== this.stream) el.srcObject = this.stream;
        el.play().catch(() => {});
      },
    },
  };

  function initialPhase(stored) {
    if (!ns.isValidId(sessionId)) return "error";
    return stored ? "connecting" : "join";
  }

  createApp({
    data() {
      const stored = ns.isValidId(sessionId) ? ns.storage.get(sessionStorage, storageKey) : null;
      return {
        phase: initialPhase(stored), // join | connecting | session | error
        errorKey: ns.isValidId(sessionId) ? null : "error.invalid",
        stored,
        form: { nickname: ns.storage.get(localStorage, cfg.NICKNAME_KEY) || "", password: "" },
        formError: null,
        needsPassword: linkHasPassword && !hashPassword,
        nicknameMax: cfg.NICKNAME_MAX,
        snap: null, // SessionClient snapshot
        streamsVersion: 0, // bumped when remote streams change (MediaStreams are not reactive)
        focused: null,
        unmuted: {},
        copied: null,
        notice: null, // i18n key
        wasGuest: false,
      };
    },

    computed: {
      ui() {
        return this.snap || EMPTY_STATE;
      },

      password() {
        return this.stored ? this.stored.password : "";
      },

      tiles() {
        this.streamsVersion; // dependency: remote streams changed
        if (!this.snap || !client) return [];
        return this.snap.shares.map((peerId) => {
          const isMe = peerId === this.snap.me.peerId;
          const stream = isMe ? client.localStream : client.streams.get(peerId) || null;
          return {
            peerId,
            nickname: this.nicknameOf(peerId),
            isMe,
            mirror: isMe && this.snap.shareKind === "camera", // a self view reads naturally mirrored
            stream: stream && markRaw(stream),
            hasAudio: Boolean(stream && stream.getAudioTracks().length),
          };
        });
      },

      focusedTile() {
        return this.tiles.some((tile) => tile.peerId === this.focused) ? this.focused : null;
      },

      gridStyle() {
        const n = this.tiles.length;
        if (this.focusedTile) return { "--others": Math.max(n - 1, 1) };
        const cols = Math.ceil(Math.sqrt(n));
        return { "--cols": cols, "--rows": Math.ceil(n / cols) };
      },

      isFull() {
        return this.ui.shares.length >= this.ui.limit;
      },

      shareDisabled() {
        return !this.snap || this.snap.pending || (!this.snap.sharing && this.isFull);
      },
    },

    mounted() {
      if (this.phase === "connecting") this.connect();
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.focused = null;
      });
    },

    methods: {
      nicknameOf(peerId) {
        const entry = this.ui.roster.find((p) => p.peerId === peerId);
        return entry ? entry.nickname : "";
      },

      join() {
        const nickname = ns.cleanNickname(this.form.nickname);
        if (!nickname) {
          this.formError = "create.nicknameRequired";
          return;
        }
        ns.storage.set(localStorage, cfg.NICKNAME_KEY, nickname);
        this.stored = {
          creator: false,
          nickname,
          password: hashPassword || this.form.password,
        };
        ns.storage.set(sessionStorage, storageKey, this.stored);
        this.connect();
      },

      connect() {
        this.phase = "connecting";
        const stored = this.stored;
        // A fresh peer ID per connection: after a reload the signaling server may still hold the old one.
        client = new ns.SessionClient({ sessionId, ...stored, peerId: ns.randomId(10) });

        client.on("change", () => {
          this.snap = client.snapshot();
          if (this.snap.hostId && !this.snap.isHost) this.wasGuest = true;
        });
        client.on("streams", () => this.streamsVersion++);
        client.on("joined", () => {
          this.phase = "session";
          this.snap = client.snapshot();
          track("session-joined", { role: stored.creator ? "creator" : "guest" });
          if (stored.fresh) {
            // A reload must not create a second host: from now on the creator waits for the session first.
            this.stored = { ...stored, fresh: false };
            ns.storage.set(sessionStorage, storageKey, this.stored);
          }
        });
        client.on("error", (reason) => {
          if (reason === "publish") {
            this.showNotice("error.publish");
            return;
          }
          this.phase = "error";
          this.errorKey = "error.notFound";
          track("join-failed", { reason });
        });
        client.on("denied", (reason) => {
          this.showNotice(reason === "timeout" ? "notice.timeout" : "notice.denied");
          track("share-denied", { reason });
        });
        client.on("share-ended", (reason) => {
          if (reason === "host") this.showNotice("notice.stoppedByHost");
          track("share-stopped", { reason });
        });
        client.on("host-changed", () => {
          if (!client.isHost) return;
          if (this.wasGuest) this.showNotice("notice.nowHost");
          if (this.wasGuest) track("host-changed");
        });

        client.start().catch(() => {
          this.phase = "error";
          this.errorKey = "error.notFound";
          track("join-failed", { reason: "connect" });
        });
      },

      retry() {
        // Back to the form, so a mistyped password can be fixed.
        try {
          sessionStorage.removeItem(storageKey);
        } catch (e) {
          // Nothing stored.
        }
        this.form.nickname = this.stored ? this.stored.nickname : this.form.nickname;
        this.stored = null;
        this.errorKey = null;
        this.phase = "join";
      },

      async leave() {
        if (client) await client.leave();
        try {
          sessionStorage.removeItem(storageKey);
        } catch (e) {
          // Nothing stored.
        }
        track("session-left");
        window.location.href = "./";
      },

      // kind: "screen" | "camera"
      async share(kind) {
        if (!client) return;
        try {
          await client.startShare(kind);
        } catch (e) {
          // The person cancelled the picker or denied the permission.
          if (kind === "camera" && e && e.name !== "AbortError") this.showNotice("notice.cameraDenied");
          return;
        }
        if (client.localStream) {
          const audio = client.localStream.getAudioTracks().length > 0;
          if (!audio) this.showNotice(kind === "camera" ? "notice.noMic" : "notice.noAudio");
          track("share-started", { kind, audio });
        }
      },

      async stopShare() {
        if (!client) return;
        await client.stopShare("self");
      },

      hostStop(peerId) {
        if (!client) return;
        client.hostStopShare(peerId);
        track("host-stopped-share");
      },

      toggleFocus(peerId) {
        this.focused = this.focusedTile === peerId ? null : peerId;
        if (this.focused) track("tile-focused");
      },

      toggleMute(peerId) {
        this.unmuted = { ...this.unmuted, [peerId]: !this.unmuted[peerId] };
      },

      rename() {
        if (!client) return;
        const value = window.prompt(t("session.renamePrompt"), client.me.nickname);
        const nickname = ns.cleanNickname(value);
        if (!nickname) return;
        client.rename(nickname);
        ns.storage.set(localStorage, cfg.NICKNAME_KEY, nickname);
        this.stored = { ...this.stored, nickname };
        ns.storage.set(sessionStorage, storageKey, this.stored);
        track("nickname-changed");
      },

      inviteUrl(withPassword) {
        const url = new URL(`session.html?s=${sessionId}${this.password ? "&pw=1" : ""}`, window.location.href).href;
        return withPassword && this.password ? `${url}#k=${encodeURIComponent(this.password)}` : url;
      },

      async copyLink(withPassword) {
        const text = this.inviteUrl(withPassword);
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {
          window.prompt(t("session.copyPrompt"), text);
          return;
        }
        track("invite-copied", { withPassword });
        this.copied = withPassword ? "linkPassword" : "link";
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => { this.copied = null; }, 1500);
      },

      showNotice(key) {
        this.notice = key;
        clearTimeout(this.noticeTimer);
        this.noticeTimer = setTimeout(() => { this.notice = null; }, NOTICE_MS);
      },
    },
  })
    .use(ns.i18n.plugin("app.title"))
    .component("video-view", VideoView)
    .mount("#app");
})(window.VDOShare2);
