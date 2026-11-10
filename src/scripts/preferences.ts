// Adapt inherited page surfaces once, while keeping original artwork intact.
const surfaces = document.querySelectorAll<HTMLElement>(
  '.site-header .page-section, .site-header .menu-block, .sub-menu, .mobile-menu, ' +
    '#site-main .page-section, #site-main .container, #site-main .column, ' +
    '#site-main .flex-group, #site-main .accordion, #site-main .copy-block, ' +
    '#site-main .heading-text, .site-article, .os-workspace, .os-workspace-list',
);
for (const element of surfaces) {
  const style = getComputedStyle(element);
  if (style.backgroundImage.includes('url(')) {
    element.dataset.themeArtwork = '';
    continue;
  }
  const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
  const painted = channels.length >= 3 && (channels[3] ?? 1) > 0.05;
  if (!style.backgroundImage.includes('gradient(') && !painted) continue;
  element.dataset.themeSurface = element.classList.contains('page-section') ? 'section' : 'panel';
  if (painted && channels.slice(0, 3).every((channel) => channel > 190))
    element.dataset.themeOriginallyLight = '';
}

function updateThemeControls(announce = false) {
  const light = document.documentElement.dataset.theme === 'light';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    const label = `Switch to ${light ? 'dark' : 'light'} mode`;
    button.hidden = false;
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = light ? '#f5f7fc' : '#07090d';
  if (announce) {
    const status = document.querySelector('[data-theme-announcement]');
    if (status) status.textContent = `${light ? 'Light' : 'Dark'} mode enabled`;
  }
}
updateThemeControls();
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('site-theme', theme);
    } catch {}
    updateThemeControls(true);
  });
}
window.addEventListener('storage', (event) => {
  if (event.key !== 'site-theme') return;
  document.documentElement.dataset.theme = event.newValue === 'light' ? 'light' : 'dark';
  updateThemeControls();
});

const languageSelector = document.querySelector<HTMLSelectElement>('[data-language-select]');
let translator: Promise<typeof import('./translate')> | undefined;
function translateSelection(language: string) {
  translator ||= import('./translate');
  void translator
    .then((module) => module.changeLanguage(language))
    .catch(() => {
      translator = undefined;
      if (languageSelector) languageSelector.value = 'en';
      const status = document.querySelector<HTMLElement>('[data-translation-status]');
      if (status) {
        status.hidden = false;
        status.textContent = 'Translation unavailable. Showing English. Please try again later.';
      }
    });
}
languageSelector?.addEventListener('change', () => translateSelection(languageSelector.value));
try {
  const language = localStorage.getItem('site-language');
  if (languageSelector && language && ['de', 'it', 'es', 'fr'].includes(language)) {
    languageSelector.value = language;
    translateSelection(language);
  }
} catch {}
