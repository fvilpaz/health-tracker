const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('ht_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('ht_' + key, JSON.stringify(value)); } catch {}
  },
  remove(key) { localStorage.removeItem('ht_' + key); }
};
