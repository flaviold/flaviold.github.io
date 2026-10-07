// Umami Cloud analytics (cookieless), shared by every page of the site.
// Exposes window.siteTrack(name, data) for custom events; it never throws and queues events
// fired before the tracker has loaded.
(function () {
  var WEBSITE_ID = "a85ef723-2d16-4a7c-b354-9886dceb8b72";
  // Only the published site is tracked, so local runs (bin/serve.sh) don't pollute the stats.
  var DOMAINS = "flaviold.github.io";

  var queue = [];

  // Belt and braces with data-exclude-search: never send query strings or hashes. The display
  // page carries share IDs in its query string, and anyone holding them could watch the feeds.
  function stripUrl(url) {
    return typeof url === "string" ? url.split(/[?#]/)[0] : url;
  }

  window.umamiBeforeSend = function (type, payload) {
    if (payload) {
      payload.url = stripUrl(payload.url);
      payload.referrer = stripUrl(payload.referrer);
    }
    return payload;
  };

  window.siteTrack = function (name, data) {
    try {
      if (window.umami) window.umami.track(name, data);
      else queue.push([name, data]);
    } catch (e) {
      // Analytics must never break the page.
    }
  };

  var script = document.createElement("script");
  script.defer = true;
  script.src = "https://cloud.umami.is/script.js";
  script.setAttribute("data-website-id", WEBSITE_ID);
  script.setAttribute("data-domains", DOMAINS);
  script.setAttribute("data-exclude-search", "true");
  script.setAttribute("data-exclude-hash", "true");
  script.setAttribute("data-before-send", "umamiBeforeSend");
  script.onload = function () {
    var pending = queue;
    queue = [];
    pending.forEach(function (event) {
      window.siteTrack(event[0], event[1]);
    });
  };
  document.head.appendChild(script);
})();
