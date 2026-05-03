// ============================================================
// ToB Operations Center — index.js
// Hub menu interactions
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Module card ripple effect ───────────────────────────────
  document.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', function (e) {
      // Future: navigate to module page
      // For now just show a visual ripple + pulse
      ripple(this, e);
    });

    card.addEventListener('mouseenter', function () {
      const icon = this.querySelector('.card-icon');
      if (icon) icon.style.transform = 'scale(1.1) rotate(-5deg)';
    });

    card.addEventListener('mouseleave', function () {
      const icon = this.querySelector('.card-icon');
      if (icon) icon.style.transform = '';
    });
  });

});

// ── Ripple helper ─────────────────────────────────────────────
function ripple(element, event) {
  const existing = element.querySelector('.ripple-el');
  if (existing) existing.remove();

  const circle = document.createElement('span');
  const rect   = element.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height) * 1.5;

  circle.classList.add('ripple-el');
  circle.style.cssText = `
    position: absolute;
    width: ${size}px; height: ${size}px;
    left: ${event.clientX - rect.left - size / 2}px;
    top:  ${event.clientY - rect.top  - size / 2}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    transform: scale(0);
    animation: rippleAnim 0.6s linear forwards;
    pointer-events: none;
    z-index: 0;
  `;

  element.style.position = 'relative';
  element.appendChild(circle);

  circle.addEventListener('animationend', () => circle.remove());
}

// Inject ripple keyframes once
const style = document.createElement('style');
style.textContent = `
  @keyframes rippleAnim {
    to { transform: scale(1); opacity: 0; }
  }
`;
document.head.appendChild(style);
