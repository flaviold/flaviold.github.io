window.VDOShare = window.VDOShare || {};

VDOShare.config = {
  VDO_BASE: "https://vdo.ninja/",
  VDO_ORIGIN: "https://vdo.ninja",
  STORAGE_KEY: "vdoShares:v1",
  TOUR_DONE_KEY: "vdoShares:tourDone:v1",
  // How often every share is probed for a live publisher.
  POLL_INTERVAL_MS: 30000,
  // How long a single probe waits for the publisher before reporting "inactive".
  PROBE_WINDOW_MS: 10000,
};

// Custom analytics event (no-op when /js/analytics.js is missing). Never pass share IDs.
VDOShare.track = function (name, data) {
  if (window.siteTrack) window.siteTrack(name, data);
};
