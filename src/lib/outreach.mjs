import { parse, parseFragment, serialize } from 'parse5';
import site from '../config/site.json' with { type: 'json' };

const attr = (n, name) => n.attrs?.find(a => a.name === name)?.value;
const has = (n, cls) => (attr(n, 'class') || '').split(/\s+/).includes(cls);
const text = n => n.nodeName === '#text' ? n.value : (n.childNodes || []).map(text).join('');
const plain = value => text(parseFragment(value || '')).replace(/\s+/g, ' ').trim();
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function walk(n, fn) { fn(n); for (const c of [...(n.childNodes || [])]) walk(c, fn); }
function find(n, fn) { if (fn(n)) return n; for (const c of n.childNodes || []) { const result = find(c, fn); if (result) return result; } }
function set(n, name, value) { n.attrs ||= []; n.attrs = n.attrs.filter(a => a.name !== name); if (value !== null) n.attrs.push({ name, value: String(value) }); }
function remove(n) { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(c => c !== n); }
function replace(n, html) { const nodes = parseFragment(html).childNodes; for (const c of nodes) c.parentNode = n.parentNode; const parent = n.parentNode; const index = parent.childNodes.indexOf(n); parent.childNodes.splice(index, 1, ...nodes); }
function inner(n, html) { n.childNodes = parseFragment(html).childNodes; for (const c of n.childNodes) c.parentNode = n; }
function ancestor(n, predicate) { for (let p = n.parentNode; p; p = p.parentNode) if (predicate(p)) return p; }

const projects = {
  'case-study/pipe-patch-pro-amazon-listing-website': { name: 'Pipe Patch Pro', image: 'pipe-patch-pro-product-website-case-study-feature-image-1080x608.avif' },
  'case-study/samuel-edmond-stone-landing-page': { name: 'Samuel Edmond Stone', image: 'samuel-edmondstone-homeless-trilogy-wordpress-website-1024x576.avif' },
  'case-study/einbruchschutz-baumgaertner-modernizing-website-redesign-case-study': { name: 'Einbruchschutz Baumgaertner', image: 'einbruchschutz-baumgaertner-wordpress-security-homepage-1080x540.avif' },
  'case-study/bau-helden-website-redesign-case-study': { name: 'Bau-Helden', image: 'bau-helden-wordpress-construction-homepage-1080x540.avif' },
  'case-study/born-accelerators-case-study-website': { name: 'BORN Accelerators', image: 'born-accelerators-bilingual-wordpress-homepage-de-en-1024x512.gif' },
  'case-study/agentur-ostwest-turning-an-outdated-agency-site-into-a-clean-bilingual-portfolio': { name: 'Agentur Ostwest', image: 'agentur-ostwest-bilingual-wordpress-homepage-1024x512.gif' },
};
const descriptions = {
  '': 'Business websites, e-commerce and connected digital systems by Oderinde Stephen. Explore real project case studies, starting prices and ways to discuss your project.',
  contact: 'Discuss your website, e-commerce or automation project with Oderinde Stephen. Send a project brief, email directly or book a strategy call.',
  'business-website-development': 'Professional business website development focused on clear services, responsive design and customer enquiries. Explore projects and discuss your website with Oderinde Stephen.',
  'business-website-solutions': 'Explore website, e-commerce, redesign and business-system solutions. Find a practical starting point for your project with Oderinde Stephen.',
  insights: 'Practical articles from Oderinde Stephen about websites, WordPress, e-commerce and choosing digital tools for your business.',
  privacy: 'How project enquiries are handled, which services process contact information, and how to contact Oderinde Stephen about your information.',
};
const replacements = {
  '/portfolio/': '/case-studies/', '/solutions/': '/business-website-solutions/',
  '/wordpress-development/': '/business-website-development/',
  '/e-commerce-development/': '/business-website-solutions/#solution-paths',
  '/website-redesign/': '/business-website-solutions/#solution-paths',
  '/client-portals-business-systems/': '/business-website-solutions/#solution-paths',
  '/shopify-development/': '/business-website-solutions/#platforms',
  '/woocommerce-development/': '/business-website-solutions/#platforms',
};

function semanticContent(html) {
  let headingSeen = false;
  function render(n) {
    if (n.nodeName === '#text') return escape(n.value.replace(/[\uE000-\uF8FF]/g, ''));
    if (has(n, 'et_pb_section') && /Rating · Reviews/.test(text(n))) return '';
    if (['script', 'style', 'iframe'].includes(n.tagName) || has(n, 'et_pb_icon')) return '';
    const body = (n.childNodes || []).map(render).join('');
    if (!n.tagName) return body;
    if (/^h[1-6]$/.test(n.tagName)) {
      const tag = n.tagName === 'h1' ? 'h2' : n.tagName;
      // The case-study title is provided once in the article hero.
      if (n.tagName === 'h1' && !headingSeen) { headingSeen = true; return ''; }
      return `<${tag}>${body}</${tag}>`;
    }
    if (n.tagName === 'a') return `<a href="${escape(attr(n, 'href') || '/contact/')}">${body}</a>`;
    if (n.tagName === 'img') return `<img src="${escape(attr(n, 'src') || '')}" alt="${escape(attr(n, 'alt') || '')}" loading="lazy" decoding="async">`;
    if (['p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption'].includes(n.tagName)) return `<${n.tagName}>${body}</${n.tagName}>`;
    if (n.tagName === 'br') return '<br>';
    if (!plain(body)) return '';
    if (has(n, 'et_pb_section')) return `<section class="outreach-story-section">${body}</section>`;
    if (has(n, 'et_pb_row')) return `<div class="outreach-story-grid">${body}</div>`;
    if (has(n, 'et_pb_column')) return `<div class="outreach-story-column">${body}</div>`;
    return body;
  }
  return render(parseFragment(html));
}

function article(page, description) {
  const project = projects[page.path];
  const image = project ? `/wp-content/uploads/2026/09/${project.image}` : '';
  const label = page.type === 'case-study' ? 'PROJECT CASE STUDY' : 'WEBSITE INSIGHTS';
  const date = page.type === 'post' && page.modified ? `<p class="outreach-date">Updated ${escape(page.modified.slice(0, 10))}</p>` : '';
  const body = page.type === 'case-study' ? semanticContent(page.content) : page.content;
  return `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><nav aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/${project ? 'case-studies' : 'insights'}/">${project ? 'Case studies' : 'Insights'}</a></nav><header class="outreach-article-hero"><p class="outreach-eyebrow">${label}</p><h1>${escape(plain(page.title))}</h1><p class="outreach-lead">${escape(description)}</p>${date}</header>${image ? `<figure class="outreach-project-image"><img src="${image}" alt="${escape(project.name)} website project" width="1080" height="608" fetchpriority="high" decoding="async"></figure>` : ''}<article class="outreach-story">${body}</article><aside class="outreach-project-cta"><p class="outreach-eyebrow">LET’S DISCUSS YOUR PROJECT</p><h2>Have a similar challenge?</h2><p>Tell me about your business, what you need and where you want to go next.</p><a class="outreach-button" href="/contact/">Discuss my project <span aria-hidden="true">↗</span></a><a class="outreach-text-link" href="${site.booking}">Book a strategy call</a></aside></div></main>`;
}

export function insightsContent(pages) {
  const posts = pages.filter(p => p.type === 'post').sort((a, b) => b.modified.localeCompare(a.modified));
  return `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><header class="outreach-article-hero"><p class="outreach-eyebrow">PRACTICAL IDEAS FOR YOUR WEBSITE</p><h1>Website insights for better business decisions.</h1><p class="outreach-lead">Notes on choosing the right platform, improving your website and building digital systems around your business.</p></header><div class="outreach-post-grid">${posts.map(p => `<article class="outreach-post-card"><p class="outreach-eyebrow">WEBSITES & STRATEGY</p><h2><a href="/${p.path}/">${escape(plain(p.title))}</a></h2><p>${escape(plain(find(parseFragment(p.content), n => n.tagName === 'p') ? text(find(parseFragment(p.content), n => n.tagName === 'p')) : p.title).slice(0, 230))}</p><a class="outreach-text-link" href="/${p.path}/">Read article ↗</a></article>`).join('')}</div></div></main>`;
}

export const privacyContent = `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><header class="outreach-article-hero"><p class="outreach-eyebrow">YOUR INFORMATION</p><h1>Privacy & project enquiries</h1></header><article class="outreach-story"><h2>Information you choose to share</h2><p>The contact form asks for your name, email address, required service and project message. Company, budget and timeline details are optional. This information is used to respond to your enquiry and discuss the project.</p><h2>Services used by this website</h2><p>The public website is hosted on Cloudflare. Contact form submissions are processed through <a href="https://formspree.io/legal/privacy-policy/">Formspree</a> and delivered by email. If you book a call, the scheduling process is handled by <a href="https://cal.com/privacy">Cal.com</a>. Those services have their own privacy policies.</p><h2>Contact and requests</h2><p>Please avoid including passwords, payment details or other sensitive information in an initial enquiry. For questions about information you have shared, or to request correction or deletion, email <a href="mailto:${site.email}">${site.email}</a>.</p></article></div></main>`;

function servicesContent(page) {
  const content = parseFragment(page.content);
  const title = plain(text(find(content, n => n.tagName === 'h1') || {})) || plain(page.title);
  const first = find(content, n => has(n, 'et_pb_section'));
  const image = attr(find(first || content, n => n.tagName === 'img') || {}, 'src');
  const paragraphs = []; walk(first || content, n => { if (n.tagName === 'p') paragraphs.push(plain(text(n))); });
  const intro = paragraphs.sort((a, b) => b.length - a.length)[0] || ''; 
  if (first) remove(first);
  return `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><header class="outreach-article-hero"><p class="outreach-eyebrow">WEBSITES & BUSINESS SOLUTIONS</p><h1>${escape(title)}</h1><p class="outreach-lead">${escape(intro)}</p><a class="outreach-button" href="/contact/">Discuss your project ↗</a></header>${image ? `<figure class="outreach-service-image"><img src="${escape(image)}" alt="Website design and development" loading="eager"></figure>` : ''}<article class="outreach-story">${semanticContent(serialize(content)).replace('Start with the problem you recognise. Each route takes you to a focused page explaining the right solution in more detail.', 'Start with the problem you recognise, explore the options below, then share your requirements to define the right scope.')}</article><aside class="outreach-project-cta"><h2>Find the right starting point.</h2><p>Tell me about your goals and we can define the scope together.</p><a class="outreach-button" href="/contact/">Send a project brief ↗</a><a class="outreach-text-link" href="/pricing/">Explore starting prices</a></aside></div></main>`;
}

function projectsContent(pages) {
  return `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><header class="outreach-article-hero"><p class="outreach-eyebrow">CASE STUDIES & CLIENT PROJECTS</p><h1>Real websites. Practical business solutions.</h1><p class="outreach-lead">Explore six projects, the challenges behind them and the work delivered — from product websites to bilingual business platforms.</p></header><div class="outreach-post-grid">${Object.entries(projects).map(([path, project]) => { const page = pages.find(p => p.path === path); return `<article class="outreach-post-card outreach-project-card"><a href="/${path}/"><img src="/wp-content/uploads/2026/09/${project.image}" alt="${escape(project.name)} website project" width="1080" height="608" loading="lazy"></a><p class="outreach-eyebrow">PROJECT CASE STUDY</p><h2><a href="/${path}/">${escape(project.name)}</a></h2><p>${escape(plain(page?.title || project.name))}</p><a class="outreach-text-link" href="/${path}/">View case study ↗</a></article>`; }).join('')}</div></div></main>`;
}

function contactContent() {
  return `<main id="main-content" class="outreach-article"><div class="outreach-article-wrap"><header class="outreach-article-hero"><p class="outreach-eyebrow">LET’S BUILD SOMETHING THAT WORKS</p><h1>Tell me about your project.</h1><p class="outreach-lead">Whether you need a business website, an online store or a better way to connect your systems, share your goals and we can work out the next step.</p></header><div class="outreach-contact-grid"><section class="outreach-contact-panel" aria-labelledby="brief-title"><h2 id="brief-title">Send your project brief</h2><p>Fields marked * are required.</p><form class="et_pb_contact_form outreach-contact-form" method="post"><div class="outreach-form-row"><label>Your name *<input type="text" data-original_id="yourname" name="name" autocomplete="name" required></label><label>Email address *<input type="email" data-original_id="emailaddress" name="email" autocomplete="email" required></label></div><label>Company or website <span>(optional)</span><input type="text" data-original_id="companyorwebsiteoptional" name="company" autocomplete="organization"></label><label>What do you need? *<select data-original_id="servicerequired" name="service" required><option value="">Choose a service</option><option>Business website</option><option>E-commerce / online store</option><option>Website redesign</option><option>Automation & business systems</option><option>Not sure yet — I’d like advice</option></select></label><div class="outreach-form-row"><label>Budget <span>(optional)</span><input type="text" data-original_id="projectbudgetoptional" name="budget" placeholder="Your budget or range"></label><label>Timeline <span>(optional)</span><input type="text" data-original_id="preferredtimelineoptional" name="timeline" placeholder="When would you like to launch?"></label></div><label>Tell me about your project *<textarea data-original_id="tellmeaboutyourproject" name="message" rows="7" required placeholder="What does your business do, what do you need, and what would a successful project look like?"></textarea></label><button type="submit" class="outreach-button">Send project brief ↗</button><p class="outreach-form-privacy">Your details are used to respond to your enquiry. <a href="/privacy/">Privacy information</a>.</p></form></section><aside class="outreach-contact-options"><section><p class="outreach-eyebrow">PREFER A CONVERSATION?</p><h2>Let’s talk it through.</h2><p>Book a strategy call to discuss your goals, platform options and what your project needs.</p><a class="outreach-button" href="${site.booking}">Book a strategy call ↗</a></section><section><h2>Contact directly</h2><a href="mailto:${site.email}">${site.email}</a><a href="tel:+447848149224">+44 7848 149224</a></section><section><h2>Find me on</h2><a href="${site.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a><a href="${site.upwork}" target="_blank" rel="noopener">Upwork ↗</a><a href="${site.fiverr}" target="_blank" rel="noopener">Fiverr ↗</a></section></aside></div></div></main>`;
}

function footer() {
  return `<footer class="outreach-footer"><div class="outreach-footer-inner"><div><a class="outreach-wordmark" href="/">ODERINDE STEPHEN</a><p>Websites, e-commerce & connected business systems.</p><a href="mailto:${site.email}">${site.email}</a></div><nav aria-label="Footer"><a href="/business-website-solutions/">Solutions</a><a href="/case-studies/">Case studies</a><a href="/pricing/">Pricing</a><a href="/insights/">Insights</a><a href="/contact/">Contact</a></nav><nav aria-label="Professional profiles"><a href="${site.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a><a href="${site.upwork}" target="_blank" rel="noopener">Upwork ↗</a><a href="${site.fiverr}" target="_blank" rel="noopener">Fiverr ↗</a><a href="${site.booking}">Book a call ↗</a></nav></div><div class="outreach-footer-bottom"><span>© ${new Date().getFullYear()} Oderinde Stephen</span><a href="/privacy/">Privacy</a><a href="#page-container">Back to top ↑</a></div></footer>`;
}

function header(logo) {
  const links = '<a href="/business-website-solutions/">Solutions</a><a href="/case-studies/">Work</a><a href="/pricing/">Pricing</a><a href="/#about">About</a><a href="/insights/">Insights</a><a href="/contact/">Contact</a>';
  return `<header class="outreach-header"><div class="outreach-header-inner"><a class="outreach-logo" href="/" aria-label="Oderinde Stephen — home">${logo ? `<img src="${escape(logo)}" width="52" height="52" alt="Oderinde Stephen" loading="eager">` : 'OS'}</a><nav class="outreach-desktop-nav" aria-label="Main navigation">${links}</nav><a class="outreach-header-book" href="${site.booking}">Book a call ↗</a><details class="outreach-mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">${links}<a href="${site.booking}">Book a call ↗</a></nav></details></div></header>`;
}

export function prepareOutreach(html, page, pages = []) {
  const root = parse(html);
  const head = find(root, n => n.tagName === 'head');
  const main = find(root, n => attr(n, 'id') === 'main-content');
  const oldDescription = attr(find(root, n => n.tagName === 'meta' && attr(n, 'name') === 'description') || {}, 'content');
  const firstParagraph = find(parseFragment(page.content || ''), n => n.tagName === 'p');
  const description = descriptions[page.path] || (page.type === 'post' ? plain(firstParagraph ? text(firstParagraph) : page.title).slice(0, 160) : oldDescription || plain(page.title).slice(0, 160));
  if (main && (page.type === 'case-study' || page.type === 'post')) replace(main, article(page, description));
  if (main && page.type === 'collection') replace(main, insightsContent(pages));
  if (main && page.type === 'privacy') replace(main, privacyContent);
  if (main && page.path === 'contact') replace(main, contactContent());
  if (main && page.path.startsWith('business-website-')) replace(main, servicesContent(page));
  if (main && page.path === 'case-studies') replace(main, projectsContent(pages));
  const oldHeader = find(root, n => has(n, 'et-l--header'));
  if (oldHeader) replace(oldHeader, header(attr(find(oldHeader, n => n.tagName === 'img') || {}, 'src')));
  const oldFooter = find(root, n => has(n, 'et-l--footer'));
  if (oldFooter) replace(oldFooter, footer());
  // Editorial pages use a small static layout and native navigation; no Divi runtime is needed.
  if (page.path === 'contact' || page.path.startsWith('business-website-') || page.path === 'case-studies' || ['case-study', 'post', 'collection', 'privacy'].includes(page.type)) {
    walk(root, n => {
      if (n.tagName === 'style' || n.tagName === 'script' || (n.tagName === 'link' && attr(n, 'rel') === 'stylesheet')) remove(n);
    });
  }

  if (page.path === '') {
    const ids = { et_pb_section_4: 'work', et_pb_section_5: 'about', et_pb_section_6: 'process', et_pb_section_11: 'faq' };
    walk(root, n => { for (const [cls, id] of Object.entries(ids)) if (has(n, cls)) set(n, 'id', id); });
    const guide = find(root, n => has(n, 'et_pb_section_8'));
    if (guide && /Get the Free Checklist/.test(text(guide))) remove(guide);
    const insights = find(root, n => has(n, 'et_pb_section_9'));
    if (insights) inner(insights, `<div class="outreach-home-insights"><p class="outreach-eyebrow">WEBSITE INSIGHTS</p><h2>Practical ideas for your next website decision.</h2>${insightsContent(pages).match(/<div class="outreach-post-grid">[\s\S]*<\/div><\/div><\/main>/)?.[0].replace(/<\/div><\/main>$/, '') || '<a href="/insights/">Browse insights →</a>'}</div>`);
    walk(root, n => {
      if (has(n, 'et_pb_row') && /G2/.test(text(n)) && /Trustpilot/.test(text(n)) && /Clutch/.test(text(n)) && !/I build digital systems/.test(text(n))) remove(n);
      if (has(n, 'et_pb_text') && plain(text(n)) === 'RATED ON') remove(n);
    });
  }
  if (page.path === 'business-website-solutions') {
    const paths = find(root, n => /^h[1-6]$/.test(n.tagName) && /Which situation/.test(text(n)));
    if (paths) set(ancestor(paths, n => (has(n, 'et_pb_section') || has(n, 'outreach-story-section'))) || paths, 'id', 'solution-paths');
    const platforms = find(root, n => /^h[1-6]$/.test(n.tagName) && /platform-specific/.test(text(n)));
    if (platforms) set(ancestor(platforms, n => (has(n, 'et_pb_section') || has(n, 'outreach-story-section'))) || platforms, 'id', 'platforms');
  }

  walk(root, n => {
    if (n.tagName === 'img') { set(n, 'decoding', 'async'); if (!attr(n, 'loading')) set(n, 'loading', 'lazy'); }
    if (n.tagName !== 'a') return;
    const label = plain(text(n));
    let href = attr(n, 'href');
    if (/^H\.$/.test(label)) inner(n, 'Home');
    if (/^(?:Open |Start a Conversation on )?Upwork(?: Profile)?$/i.test(label)) href = site.upwork;
    else if (/^(?:Open |Start a Conversation on )?Fiverr(?: Profile)?$/i.test(label)) href = site.fiverr;
    else if (/Book (?:a |Your )?(?:Strategy )?Call/i.test(label)) href = site.booking;
    else if (/More About|Learn More About|^About$/i.test(label)) href = '/#about';
    else if (/^(?:View |Explore |All |Full |Selected )*(?:My Work|Selected Work|Full Portfolio|Portfolio|Case Studies)$/i.test(label)) href = '/case-studies/';
    else if (/Insights|Browse All Insights/.test(label)) href = '/insights/';
    else if (/Create Client Account|Start (?:a |Your )?Project|Ask a Project Question/.test(label) && (!href || href === '/' || href === '#')) { href = '/contact/'; if (/Create Client Account/.test(label)) inner(n, 'Discuss your project'); }
    else if (/Explore Business Solutions/.test(label)) href = '/business-website-solutions/';
    else if (/Request a Quote/.test(label)) href = '/contact/';
    else if (label === 'Explore Packages') href = '/pricing/#packages';
    if (href && replacements[href]) {
      const destination = replacements[href];
      if (page.path === 'business-website-solutions' && destination.startsWith('/business-website-solutions/#')) {
        href = '/contact/';
        inner(n, escape(label.replace(/^Explore /, 'Discuss ').replace('This Platform', 'this platform')));
      } else href = destination;
    }
    if (href?.startsWith('/services/')) href = replacements[href.replace('/services', '')] || '/business-website-solutions/';
    if (href?.startsWith('/insights/') && href !== '/insights/' && !pages.some(p => `/${p.path}/` === href)) href = '/insights/';
    if (href?.startsWith('/case-study/') && /Vist live Website|Visit live Website/i.test(label)) inner(n, 'View case study ↗');
    if (!href || href === '#') {
      if (/Home/.test(label)) href = '/';
      else if (label) href = '/contact/';
    }
    if (href?.startsWith('#') && !find(root, target => attr(target, 'id') === href.slice(1))) href = /portfolio|work|case/i.test(href) ? '/case-studies/' : '/contact/';
    if (href) set(n, 'href', href);
    if (attr(n, 'target') === '_blank') set(n, 'rel', 'noopener noreferrer');
  });
  let primaryHeadingSeen = false;
  walk(find(root, n => attr(n, 'id') === 'main-content') || {}, n => {
    if (n.tagName !== 'h1') return;
    if (primaryHeadingSeen) { n.tagName = 'h2'; n.nodeName = 'h2'; }
    primaryHeadingSeen = true;
  });
  const primaryImage = find(find(root, n => attr(n, 'id') === 'main-content') || {}, n => n.tagName === 'img');
  if (primaryImage) { set(primaryImage, 'loading', 'eager'); set(primaryImage, 'fetchpriority', 'high'); }
  if (page.path === 'pricing') { const section = find(root, n => n.tagName === 'h2' && /Website & Digital Solutions Pricing/.test(plain(text(n)))); if (section) set(ancestor(section, n => has(n, 'et_pb_section')) || section, 'id', 'packages'); }
  // Restore real links for Divi card headings that previously looked clickable but did nothing.
  walk(root, n => {
    if (!/^h[1-6]$/.test(n.tagName) || plain(text(n)) !== 'View Case Study' || ancestor(n, p => p.tagName === 'a')) return;
    const card = ancestor(n, p => (has(p, 'et_pb_group') || has(p, 'et_pb_column')) && !!find(p, c => c.tagName === 'img'));
    if (!card) return;
    const project = Object.entries(projects).find(([, p]) => text(card).toLowerCase().includes(p.name.toLowerCase()));
    if (project) inner(n, `<a class="outreach-card-link" href="/${project[0]}/">View case study ↗</a>`);
  });

  if (head) {
    const canonical = `${site.origin}/${page.path ? page.path + '/' : ''}`;
    const title = `${plain(page.title).replace(/\s*\|\s*Oderinde Stephen$/, '')} | Oderinde Stephen`;
    head.childNodes = head.childNodes.filter(n => n.tagName !== 'title' && !(n.tagName === 'meta' && ['description', 'robots', 'twitter:title', 'twitter:description'].includes(attr(n, 'name'))) && !(n.tagName === 'meta' && ['og:title', 'og:description', 'og:url'].includes(attr(n, 'property'))) && !(n.tagName === 'link' && attr(n, 'rel') === 'canonical') && !(n.tagName === 'script' && attr(n, 'type') === 'application/ld+json'));
    const schema = { '@context': 'https://schema.org', '@type': page.type === 'post' ? 'BlogPosting' : page.type === 'case-study' ? 'Article' : 'WebPage', name: plain(page.title), headline: plain(page.title), description, url: canonical, author: { '@type': 'Person', name: site.name, url: `${site.origin}/#about`, sameAs: [site.linkedin, site.upwork, site.fiverr] } };
    const nodes = parseFragment(`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${site.indexable ? 'index, follow' : 'noindex, follow'}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><link rel="stylesheet" href="/styles/outreach.css"><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`).childNodes;
    for (const n of nodes) n.parentNode = head;
    head.childNodes.push(...nodes);
    if (projects[page.path]) {
      const image = `${site.origin}/wp-content/uploads/2026/09/${projects[page.path].image}`;
      walk(head, n => { if (n.tagName === 'meta' && (attr(n, 'property') === 'og:image' || attr(n, 'name') === 'twitter:image')) set(n, 'content', image); });
    }
  }
  const body = find(root, n => n.tagName === 'body');
  if (body) set(body, 'class', `${attr(body, 'class') || ''} outreach-preview`);
  return serialize(root);
}
