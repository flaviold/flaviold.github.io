(function (ns) {
  const key = () => ns.config.STORAGE_KEY;

  function load() {
    try {
      const shares = JSON.parse(localStorage.getItem(key()) || "[]");
      return Array.isArray(shares) ? shares.filter((s) => s && ns.vdo.isValidStreamId(s.streamId)) : [];
    } catch (e) {
      return [];
    }
  }

  function save(shares) {
    try {
      localStorage.setItem(key(), JSON.stringify(shares));
    } catch (e) {
      console.error("Could not save shares", e);
    }
  }

  function add(label) {
    const share = { streamId: ns.vdo.generateStreamId(), label: label || "", createdAt: Date.now() };
    const shares = load();
    shares.unshift(share);
    save(shares);
    return share;
  }

  function remove(streamId) {
    save(load().filter((s) => s.streamId !== streamId));
  }

  function updateLabel(streamId, label) {
    save(load().map((s) => (s.streamId === streamId ? { ...s, label } : s)));
  }

  ns.storage = { load, add, remove, updateLabel };
})(window.VDOShare);
