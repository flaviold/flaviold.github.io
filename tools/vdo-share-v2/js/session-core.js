// One participant in a VDO Share v2 session. Everything goes over WebRTC through the VDO.Ninja SDK:
//
// - Control connection (always on): data-only announce as "c_<peerId>" + autoConnect mesh in the
//   session room. Carries the session protocol and views other participants' screens.
// - Media connection (only while sharing): publishes the screen as "s_<peerId>". A separate
//   connection is needed because one SDK connection can publish a single stream, and the
//   data-only announce already counts as one.
//
// Session state ({ hostId, limit, roster, shares }) is owned by the host and replicated to everyone.
// roster is the join order; the host is always roster[0], so when the host leaves every participant
// independently promotes the next one, with no election messages and no reliance on clocks.
//
// Protocol messages: { t: "vs2:<type>", from: peerId, ... } (the sender is always in the payload;
// the SDK's own sender fields are not reliable across connection directions).
(function (ns) {
  const cfg = ns.config;
  const PREFIX = "vs2:";
  // Without constraints browsers capture 640x480 and crop wider webcams to 4:3. Ask for HD and
  // forbid cropping, so the camera's native mode closest to it is used with its own aspect ratio.
  const CAMERA_VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, resizeMode: "none" };

  class SessionClient {
    // options: { sessionId, password, nickname, peerId, creator, fresh, limit }
    constructor(options) {
      this.sessionId = options.sessionId;
      this.password = options.password || undefined;
      this.me = { peerId: options.peerId, nickname: options.nickname };
      this.creator = Boolean(options.creator);
      this.fresh = Boolean(options.fresh); // creator arriving straight from the create page
      this.initialLimit = options.limit || cfg.LIMIT_DEFAULT;

      this.state = null; // { hostId, limit, roster: [{ peerId, nickname }], shares: [peerId] }
      this.lastSeen = new Map(); // peerId -> timestamp of the last message
      this.streams = new Map(); // peerId -> remote MediaStream
      this.viewing = new Set(); // "s_" stream IDs requested from the SDK
      this.localStream = null; // our captured screen or camera
      this.shareKind = null; // "screen" | "camera" while sharing
      this.media = null; // media SDK connection while publishing
      this.pending = null; // { tries, timer } while waiting for the host to grant a share slot
      this.joined = false;
      this.closed = false;
      this.handlers = {};
      this.timers = [];
      this.onPageHide = () => this.send("bye");
    }

    // Events: change, streams, joined, error(reason), denied(reason), share-ended(reason), host-changed
    on(event, handler) {
      (this.handlers[event] = this.handlers[event] || []).push(handler);
    }

    emit(event, data) {
      (this.handlers[event] || []).forEach((handler) => handler(data));
    }

    get room() {
      return `vs2_${this.sessionId}`;
    }

    get isHost() {
      return Boolean(this.state) && this.state.hostId === this.me.peerId;
    }

    snapshot() {
      const s = this.state || { hostId: null, limit: this.initialLimit, roster: [], shares: [] };
      return {
        me: { ...this.me },
        hostId: s.hostId,
        isHost: this.isHost,
        limit: s.limit,
        roster: s.roster.map((p) => ({ ...p })),
        shares: [...s.shares],
        sharing: Boolean(this.localStream),
        shareKind: this.shareKind,
        live: Boolean(this.media),
        pending: Boolean(this.pending),
      };
    }

    // ---------- Lifecycle ----------

    async start() {
      const ctl = new VDONinjaSDK({ password: this.password });
      this.ctl = ctl;
      ctl.addEventListener("dataReceived", (e) => this.onData(e.detail && e.detail.data));
      ctl.addEventListener("track", (e) => this.onTrack(e.detail));
      ctl.addEventListener("videoaddedtoroom", (e) => this.maybeView(e.detail && e.detail.streamID));
      ctl.addEventListener("listing", (e) => {
        const list = (e.detail && e.detail.list) || [];
        list.forEach((item) => this.maybeView(typeof item === "string" ? item : item && item.streamID));
      });

      await ctl.autoConnect({
        room: this.room,
        password: this.password,
        streamID: `c_${this.me.peerId}`,
        label: this.me.nickname,
        mode: "half",
        filter: { prefix: "c_" },
      });
      window.addEventListener("pagehide", this.onPageHide);

      if (this.creator && this.fresh) {
        this.becomeHost();
      } else {
        this.send("hello", { nickname: this.me.nickname });
        this.later(this.creator ? cfg.CREATOR_WAIT_MS : cfg.JOIN_TIMEOUT_MS, () => {
          if (this.state) return;
          if (this.creator) this.becomeHost();
          else this.fail("not-found");
        });
      }

      this.every(cfg.HEARTBEAT_MS, () => this.heartbeat());
    }

    async leave() {
      if (this.closed) return;
      this.send("bye");
      await this.stopShare("leave", { silent: true });
      this.close();
    }

    close() {
      this.closed = true;
      this.timers.forEach((t) => (t.interval ? clearInterval(t.id) : clearTimeout(t.id)));
      this.timers = [];
      if (this.pending) clearTimeout(this.pending.timer);
      window.removeEventListener("pagehide", this.onPageHide);
      if (this.ctl) this.ctl.disconnect();
    }

    fail(reason) {
      this.close();
      this.emit("error", reason);
    }

    later(ms, fn) {
      this.timers.push({ id: setTimeout(fn, ms) });
    }

    every(ms, fn) {
      this.timers.push({ id: setInterval(fn, ms), interval: true });
    }

    send(type, extra) {
      if (!this.ctl) return;
      try {
        this.ctl.sendData({ t: PREFIX + type, from: this.me.peerId, ...extra });
      } catch (e) {
        // Channel not ready yet; heartbeat/hello retries cover it.
      }
    }

    heartbeat() {
      this.send("ping");
      // Not in a session state yet (or not listed in it): keep announcing ourselves.
      if (!this.state || !this.inRoster(this.me.peerId)) this.send("hello", { nickname: this.me.nickname });
      if (!this.state) return;
      const now = Date.now();
      for (const { peerId } of this.state.roster) {
        if (peerId === this.me.peerId) continue;
        if (!this.lastSeen.has(peerId)) this.lastSeen.set(peerId, now); // grace period for new entries
        else if (now - this.lastSeen.get(peerId) > cfg.PEER_TIMEOUT_MS) this.removePeer(peerId);
      }
    }

    // ---------- Protocol ----------

    onData(msg) {
      if (!msg || typeof msg.t !== "string" || !msg.t.startsWith(PREFIX)) return;
      if (!ns.isValidId(msg.from) || msg.from === this.me.peerId || this.closed) return;
      this.lastSeen.set(msg.from, Date.now());
      const toMe = msg.to === this.me.peerId;

      switch (msg.t.slice(PREFIX.length)) {
        case "hello":
          if (this.isHost) this.admit(msg.from, msg.nickname);
          break;
        case "state":
          this.onState(msg);
          break;
        case "bye":
          this.removePeer(msg.from);
          break;
        case "share-request":
          if (this.isHost) this.handleShareRequest(msg.from);
          break;
        case "share-grant":
          if (toMe) this.onGrant();
          break;
        case "share-deny":
          if (toMe) this.onDeny(msg.reason);
          break;
        case "share-stopped":
          this.onShareStopped(msg.from);
          break;
        case "stop-share":
          if (toMe && this.state && msg.from === this.state.hostId) this.stopShare("host");
          break;
        case "nickname":
          if (this.isHost) this.admit(msg.from, msg.nickname);
          break;
        default:
          break; // "ping" and unknown types only refresh lastSeen
      }
    }

    inRoster(peerId) {
      return Boolean(this.state) && this.state.roster.some((p) => p.peerId === peerId);
    }

    nicknameOf(peerId) {
      const entry = this.state && this.state.roster.find((p) => p.peerId === peerId);
      return entry ? entry.nickname : "";
    }

    // Host: add a participant to the roster (or update its nickname) and publish the new state.
    admit(peerId, nickname) {
      const clean = ns.cleanNickname(nickname) || "Guest";
      const entry = this.state.roster.find((p) => p.peerId === peerId);
      if (entry) entry.nickname = clean;
      else this.state.roster.push({ peerId, nickname: clean });
      this.lastSeen.set(peerId, Date.now());
      this.broadcastState();
    }

    broadcastState() {
      const { hostId, limit, roster, shares } = this.state;
      this.send("state", { hostId, limit, roster, shares });
      this.emit("change");
    }

    onState(msg) {
      if (msg.from !== msg.hostId || !Array.isArray(msg.roster) || !Array.isArray(msg.shares)) return;

      if (this.isHost && msg.hostId !== this.me.peerId) {
        // Two hosts (e.g. a returning creator raced an existing session): the smaller ID wins.
        if (msg.hostId > this.me.peerId) {
          this.broadcastState();
          return;
        }
      }

      const wasHost = this.isHost;
      const roster = msg.roster
        .filter((p) => p && ns.isValidId(p.peerId))
        .map((p) => ({ peerId: p.peerId, nickname: ns.cleanNickname(p.nickname) || "Guest" }));
      const limit = Math.min(Math.max(Number(msg.limit) || cfg.LIMIT_DEFAULT, cfg.LIMIT_MIN), cfg.LIMIT_MAX);
      const shares = msg.shares.filter((id) => roster.some((p) => p.peerId === id));
      this.state = { hostId: msg.hostId, limit, roster, shares };

      // Screens that are no longer part of the session.
      for (const peerId of [...this.streams.keys()]) if (!shares.includes(peerId)) this.dropStream(peerId);

      const listed = shares.includes(this.me.peerId);
      if (this.media && !listed && !this.pending) this.stopShare("host"); // host removed our share
      else if (!this.localStream && listed) this.send("share-stopped"); // stale entry (e.g. after reload)

      if (!this.inRoster(this.me.peerId)) this.send("hello", { nickname: this.me.nickname });
      if (this.pending && this.pending.hostId !== msg.hostId) this.requestShare(); // host changed meanwhile
      if (wasHost && !this.isHost) this.emit("host-changed");
      this.markJoined();
      this.emit("change");
    }

    markJoined() {
      if (this.joined) return;
      this.joined = true;
      this.emit("joined");
    }

    becomeHost() {
      if (!this.state) {
        this.state = {
          hostId: this.me.peerId,
          limit: this.initialLimit,
          roster: [{ ...this.me }],
          shares: this.localStream && this.media ? [this.me.peerId] : [],
        };
      } else {
        this.state.hostId = this.me.peerId;
        this.state.roster = [
          ...this.state.roster.filter((p) => p.peerId === this.me.peerId),
          ...this.state.roster.filter((p) => p.peerId !== this.me.peerId),
        ];
      }
      this.markJoined();
      this.broadcastState();
      this.emit("host-changed");
      if (this.pending) this.requestShare();
    }

    removePeer(peerId) {
      this.lastSeen.delete(peerId);
      this.dropStream(peerId);
      if (!this.state || !this.inRoster(peerId)) return;
      const wasHost = this.state.hostId === peerId;
      this.state.roster = this.state.roster.filter((p) => p.peerId !== peerId);
      this.state.shares = this.state.shares.filter((id) => id !== peerId);

      if (wasHost) {
        const next = this.state.roster[0];
        if (next && next.peerId === this.me.peerId) {
          this.becomeHost();
          return;
        }
        this.state.hostId = next ? next.peerId : null; // provisional until the new host speaks
        if (this.pending) this.requestShare();
        this.emit("change");
      } else if (this.isHost) {
        this.broadcastState();
      } else {
        this.emit("change");
      }
    }

    // ---------- Sharing ----------

    // kind: "screen" | "camera". Must be called from a user gesture: the capture APIs need one, so
    // the media is captured first and the share slot is requested afterwards.
    async startShare(kind = "screen") {
      if (this.localStream || !this.state) return;
      if (this.state.shares.length >= this.state.limit) {
        this.emit("denied", "limit");
        return;
      }
      const stream = kind === "camera"
        ? await navigator.mediaDevices.getUserMedia({ video: CAMERA_VIDEO, audio: true })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (this.closed || this.localStream) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.localStream = stream;
      this.shareKind = kind;
      stream.getVideoTracks().forEach((t) => t.addEventListener("ended", () => this.stopShare("browser")));
      this.requestShare();
      this.emit("change");
    }

    requestShare() {
      if (!this.localStream) return;
      if (this.pending) clearTimeout(this.pending.timer);
      const tries = this.pending ? this.pending.tries + 1 : 1;
      const hostId = this.state && this.state.hostId;
      this.pending = { tries, hostId, timer: null };

      if (this.isHost) {
        this.handleShareRequest(this.me.peerId);
        return;
      }
      this.send("share-request");
      this.pending.timer = setTimeout(() => {
        if (!this.pending) return;
        if (this.pending.tries < 2) this.requestShare();
        else this.onDeny("timeout");
      }, cfg.REQUEST_TIMEOUT_MS);
    }

    // Host only. Requests are handled one at a time on the host, so the limit can't be exceeded.
    handleShareRequest(peerId) {
      const shares = this.state.shares;
      const granted = shares.includes(peerId) || shares.length < this.state.limit;
      if (granted && !shares.includes(peerId)) shares.push(peerId);

      if (peerId === this.me.peerId) {
        if (granted) {
          this.broadcastState();
          this.onGrant();
        } else {
          this.onDeny("limit");
        }
        return;
      }
      if (granted) {
        this.broadcastState();
        this.send("share-grant", { to: peerId });
      } else {
        this.send("share-deny", { to: peerId, reason: "limit" });
      }
    }

    async onGrant() {
      if (!this.pending) return;
      clearTimeout(this.pending.timer);
      this.pending = null;
      if (!this.localStream) {
        this.send("share-stopped");
        return;
      }
      if (this.media) return;
      const media = new VDONinjaSDK({ password: this.password });
      this.media = media;
      this.emit("change");
      try {
        await media.connect();
        await media.publish(this.localStream, { room: this.room, streamID: `s_${this.me.peerId}`, label: this.me.nickname });
      } catch (e) {
        await this.stopShare("error");
        this.emit("error", "publish");
      }
    }

    onDeny(reason) {
      if (this.pending) clearTimeout(this.pending.timer);
      this.pending = null;
      if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
      this.shareKind = null;
      this.emit("denied", reason);
      this.emit("change");
    }

    // reason: "self" | "browser" | "host" | "leave" | "error"
    async stopShare(reason, { silent = false } = {}) {
      if (!this.localStream && !this.media && !this.pending) return;
      if (this.pending) clearTimeout(this.pending.timer);
      this.pending = null;
      if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
      this.shareKind = null;
      const media = this.media;
      this.media = null;

      if (this.state) this.state.shares = this.state.shares.filter((id) => id !== this.me.peerId);
      if (this.isHost) this.broadcastState();
      else this.send("share-stopped");
      if (!silent) this.emit("share-ended", reason);
      this.emit("change");

      if (media) {
        try {
          media.stopPublishing();
          await media.disconnect();
        } catch (e) {
          // Already gone.
        }
      }
    }

    onShareStopped(peerId) {
      this.dropStream(peerId);
      if (!this.state || !this.state.shares.includes(peerId)) return;
      this.state.shares = this.state.shares.filter((id) => id !== peerId);
      if (this.isHost) this.broadcastState();
      else this.emit("change");
    }

    // Host only: end someone else's share.
    hostStopShare(peerId) {
      if (!this.isHost) return;
      if (peerId === this.me.peerId) {
        this.stopShare("self");
        return;
      }
      this.state.shares = this.state.shares.filter((id) => id !== peerId);
      this.dropStream(peerId);
      this.send("stop-share", { to: peerId });
      this.broadcastState();
    }

    rename(nickname) {
      const clean = ns.cleanNickname(nickname);
      if (!clean || clean === this.me.nickname) return;
      this.me.nickname = clean;
      if (this.isHost) this.admit(this.me.peerId, clean);
      else this.send("nickname", { nickname: clean });
    }

    // ---------- Remote screens ----------

    maybeView(streamID) {
      if (!this.ctl || this.closed || typeof streamID !== "string" || !streamID.startsWith("s_")) return;
      if (streamID === `s_${this.me.peerId}` || this.viewing.has(streamID)) return;
      this.viewing.add(streamID);
      this.ctl.view(streamID, { audio: true, video: true }).catch(() => this.viewing.delete(streamID));
    }

    onTrack(detail) {
      const { track, streamID } = detail || {};
      if (!track || typeof streamID !== "string" || !streamID.startsWith("s_")) return;
      const peerId = streamID.slice(2);
      let stream = this.streams.get(peerId);
      if (!stream) {
        stream = new MediaStream();
        this.streams.set(peerId, stream);
      }
      stream.getTracks().filter((t) => t.kind === track.kind).forEach((t) => stream.removeTrack(t));
      stream.addTrack(track);
      // Tracks also end when the SDK swaps a connection internally and delivers new ones, so an ended
      // track only hides the stream if nothing live replaced it shortly after. It never stops viewing:
      // real removals come from the protocol (share-stopped, state, peer leaving).
      track.addEventListener("ended", () => {
        setTimeout(() => {
          const current = this.streams.get(peerId);
          if (current === stream && stream.getTracks().every((t) => t.readyState === "ended")) {
            this.streams.delete(peerId);
            this.emit("streams");
          }
        }, 2000);
      });
      this.emit("streams");
    }

    dropStream(peerId) {
      const streamID = `s_${peerId}`;
      if (this.viewing.delete(streamID) && this.ctl) {
        try {
          this.ctl.stopViewing(streamID);
        } catch (e) {
          // Not viewing anymore.
        }
      }
      if (this.streams.delete(peerId)) this.emit("streams");
    }
  }

  ns.SessionClient = SessionClient;
})(window.VDOShare2);
