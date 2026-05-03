// ingresos.js
document.addEventListener('DOMContentLoaded', () => {
  // Hover shimmer on action cards
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const accent = card.dataset.accent;
      if (accent) card.style.setProperty('--card-accent', `var(--accent-${accent})`);
    });
  });
});
