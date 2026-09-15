// Small interaction details for the surrounding UI. Gameplay animation remains in fx.js/choreo.js.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.addEventListener('pointerdown', (event) => {
  if (reducedMotion.matches || event.button !== 0) return;
  const button = event.target.closest('button:not(:disabled)');
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const spark = document.createElement('span');
  spark.className = 'ui-spark';
  spark.setAttribute('aria-hidden', 'true');
  spark.style.left = `${event.clientX - rect.left}px`;
  spark.style.top = `${event.clientY - rect.top}px`;
  button.appendChild(spark);
  spark.addEventListener('animationend', () => spark.remove(), { once: true });
}, { passive: true });

// Give newly activated screens a fresh entrance even when the same node is reused.
const screenObserver = new MutationObserver((records) => {
  if (reducedMotion.matches) return;
  for (const record of records) {
    const screen = record.target;
    if (!(screen instanceof HTMLElement) || !screen.classList.contains('active')) continue;
    screen.classList.remove('ui-entering');
    void screen.offsetWidth;
    screen.classList.add('ui-entering');
  }
});

document.querySelectorAll('.screen').forEach((screen) => {
  screenObserver.observe(screen, { attributes: true, attributeFilter: ['class'] });
});
