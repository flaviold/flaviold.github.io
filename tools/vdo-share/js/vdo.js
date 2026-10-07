(function (ns) {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

  function generateStreamId(length = 12) {
    // Rejection sampling keeps every character equally likely.
    const limit = 256 - (256 % ALPHABET.length);
    let id = "";
    while (id.length < length) {
      for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
        if (byte < limit && id.length < length) id += ALPHABET[byte % ALPHABET.length];
      }
    }
    return id;
  }

  function isValidStreamId(id) {
    return typeof id === "string" && ID_PATTERN.test(id);
  }

  // params: list of [key, value]; a null value renders a bare flag (e.g. "&cleanoutput").
  function buildUrl(params) {
    const query = params
      .map(([key, value]) => (value == null ? key : `${key}=${encodeURIComponent(value)}`))
      .join("&");
    return `${ns.config.VDO_BASE}?${query}`;
  }

  function pushUrl(streamId, label) {
    const params = [["push", streamId]];
    if (label) params.push(["label", label]);
    return buildUrl(params);
  }

  function viewUrl(streamId, { noaudio = true, novideo = false, clean = true } = {}) {
    const params = [["view", streamId]];
    if (clean) params.push(["cleanoutput", null]);
    if (noaudio) params.push(["noaudio", null]);
    if (novideo) params.push(["novideo", null]);
    return buildUrl(params);
  }

  ns.vdo = { generateStreamId, isValidStreamId, pushUrl, viewUrl };
})(window.VDOShare);
