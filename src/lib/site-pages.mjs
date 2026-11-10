export function getSitePages(pages) {
  const home = pages.find(page => page.path === '');
  if (!home) return pages;
  const extra = [
    { path: 'insights', title: 'Website Insights', type: 'collection' },
    { path: 'privacy', title: 'Privacy & Project Enquiries', type: 'privacy' },
  ].filter(page => !pages.some(existing => existing.path === page.path));
  return [...pages, ...extra.map(page => ({ ...home, ...page, id: page.path, content: '', contentSource: 'rest-api' }))];
}
