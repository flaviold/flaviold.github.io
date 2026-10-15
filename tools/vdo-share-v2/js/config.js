window.VDOShare2 = window.VDOShare2 || {};

VDOShare2.config = {
  // Simultaneous screen shares per session (it is a P2P mesh: every screen is uploaded once per viewer).
  LIMIT_DEFAULT: 4,
  LIMIT_MIN: 1,
  LIMIT_MAX: 8,
  LIMIT_WARN_ABOVE: 6,
  NICKNAME_MAX: 30,

  NICKNAME_KEY: "vdoShare2:nickname", // localStorage
  SESSION_KEY_PREFIX: "vdoShare2:session:", // sessionStorage, + session ID
  TOUR_CREATE_KEY: "vdoShare2:tourCreate:v1",

  HEARTBEAT_MS: 4000, // ping interval on the data channel
  PEER_TIMEOUT_MS: 15000, // a participant silent for this long is dropped
  JOIN_TIMEOUT_MS: 15000, // no session state by then: wrong password or nobody there
  CREATOR_WAIT_MS: 4000, // a returning creator waits this long for an existing host
  REQUEST_TIMEOUT_MS: 5000, // share request without answer is retried once
};

(function (ns) {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const ID_PATTERN = /^[A-Za-z0-9]{6,32}$/;

  // Uniform random alphanumeric ID (rejection sampling, as in v1's generateStreamId).
  ns.randomId = function (length) {
    const limit = 256 - (256 % ALPHABET.length);
    let id = "";
    while (id.length < length) {
      for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
        if (byte < limit && id.length < length) id += ALPHABET[byte % ALPHABET.length];
      }
    }
    return id;
  };

  ns.isValidId = (id) => typeof id === "string" && ID_PATTERN.test(id);

  ns.cleanNickname = (value) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, ns.config.NICKNAME_MAX) : "";

  ns.storage = {
    get(store, key) {
      try {
        return JSON.parse(store.getItem(key));
      } catch (e) {
        return null;
      }
    },
    set(store, key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
      } catch (e) {
        // Storage unavailable: the app still works for this page view.
      }
    },
  };

  // Custom analytics event (no-op when /js/analytics.js is missing). Never pass session IDs or passwords.
  ns.track = function (name, data) {
    if (window.siteTrack) window.siteTrack(name, data);
  };
})(window.VDOShare2);
