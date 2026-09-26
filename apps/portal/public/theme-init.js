(function () {
  var mode = 'system';
  try { mode = localStorage.getItem('cvs-garage-theme') || 'system'; } catch (_) { /* Storage may be restricted. */ }
  var dark = mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
