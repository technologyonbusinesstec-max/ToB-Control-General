// presupuesto.js
document.addEventListener('DOMContentLoaded', () => {
  const iframe  = document.getElementById('sheets-iframe');
  const fallback = document.getElementById('iframe-fallback');

  // If iframe fails to load after 8 seconds, show fallback
  const timer = setTimeout(() => {
    if (fallback) fallback.style.display = 'flex';
  }, 8000);

  if (iframe) {
    iframe.addEventListener('load', () => clearTimeout(timer));
    iframe.addEventListener('error', () => {
      clearTimeout(timer);
      if (fallback) fallback.style.display = 'flex';
    });
  }
});
