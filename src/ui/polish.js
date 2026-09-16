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
// Re-arming the entrance means toggling a class on the screen, which is itself a class change this
// observer is watching for. Without remembering which screens are already active, every re-arm
// would queue the callback again and the page would spin on its own bookkeeping forever, so only
// the change that actually makes a screen active re-arms it.
const activeScreens = new WeakSet();
const screenObserver = new MutationObserver((records) => {
  for (const record of records) {
    const screen = record.target;
    if (!(screen instanceof HTMLElement)) continue;
    if (!screen.classList.contains('active')) { activeScreens.delete(screen); continue; }
    if (activeScreens.has(screen)) continue;
    activeScreens.add(screen);
    if (reducedMotion.matches) continue;
    screen.classList.remove('ui-entering');
    void screen.offsetWidth;
    screen.classList.add('ui-entering');
  }
});

document.querySelectorAll('.screen').forEach((screen) => {
  if (screen.classList.contains('active')) activeScreens.add(screen);
  screenObserver.observe(screen, { attributes: true, attributeFilter: ['class'] });
});
