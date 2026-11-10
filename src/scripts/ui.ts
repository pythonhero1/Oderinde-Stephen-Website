// Progressive enhancements: page content and enquiry submission work without JavaScript.
import './preferences';
for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-menu-toggle]')) {
  toggle.addEventListener('click', () => {
    const navigation = toggle.closest('.mobile-navigation');
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navigation?.classList.toggle('is-open', open);
    navigation?.classList.toggle('is-closed', !open);
  });
}

for (const accordion of document.querySelectorAll<HTMLElement>('[data-accordion]')) {
  const button = accordion.querySelector<HTMLButtonElement>('.accordion-trigger');
  const content = accordion.querySelector<HTMLElement>('.accordion-content');
  if (!button || !content) continue;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    content.hidden = !open;
    accordion.classList.toggle('is-open', open);
    accordion.classList.toggle('is-closed', !open);
  });
}

// The workspace illustration is an interactive demo, not a customer account portal.
const workspaceItems = document.querySelectorAll<HTMLElement>('.os-nav-item, .os-workspace-item');
const panels = ['overview', 'milestones', 'files', 'invoices', 'support'];
const selectPanel = (panel: string) => {
  for (const item of workspaceItems) item.classList.toggle('active', item.dataset.panel === panel);
};
for (const item of workspaceItems)
  item.addEventListener('click', () => selectPanel(item.dataset.panel || 'overview'));
const autoButton = document.querySelector<HTMLButtonElement>('#osAutoScroll');
let timer: ReturnType<typeof setInterval> | undefined;
let panelIndex = 2;
autoButton?.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
    autoButton.textContent = 'AUTO SCROLL ↑';
  } else {
    autoButton.textContent = 'STOP AUTO SCROLL';
    timer = setInterval(
      () => selectPanel(panels[(panelIndex = (panelIndex + 1) % panels.length)]),
      1800,
    );
  }
});
const reviewButton = document.querySelector<HTMLButtonElement>('.os-review-button');
reviewButton?.addEventListener('click', () => {
  reviewButton.textContent = 'REVIEW READY ✓';
});
