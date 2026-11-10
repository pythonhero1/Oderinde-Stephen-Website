# Oderinde Stephen — Astro on Cloudflare

This site is an independent static Astro project. Its pages, blog posts, images, styles and browser interactions live in this repository. There is no WordPress backend, REST sync, PHP server or database. Building does not contact WordPress. The previous WordPress publisher has been disabled and removed from the active project.

The original saved page structure and styling from before the recent redesign are retained as local HTML and static assets. This preserves the existing design rather than replacing it with a new component theme. Historical Divi class names in these files are styling hooks; they do not require a WordPress installation to serve the site. Unfinished sections in the original design still need content review before launch.

## Run locally

Use Node.js 22.23.4 or newer.

```sh
npm ci
npm run dev
```

No backend environment variables or WordPress login are required.

## Edit an existing page

Page content is in `src/content/pages/`. For example:

- `home.html`: homepage text and sections
- `contact.html`: original contact layout and fields
- `pricing.html`: pricing page
- `case-study--samuel-edmond-stone-landing-page.html`: individual project content

Edit text or images inside the existing elements to preserve their appearance. Page titles and search descriptions are in `src/content/pages.json`. Shared navigation and footer are in `src/design/shared/`. Page-specific document shells and original styling references are in `src/design/layouts/`. Uploaded images, fonts, scripts and styles are local under `public/assets/`.

## Write a blog post

```sh
npm run new:post -- "Your article title"
```

This creates a Markdown draft in `src/content/blog/`. Open it, edit its title, description and content, and change `draft: true` to `draft: false` when ready. Published articles appear in `/insights/` and the sitemap automatically. Keep the `slug` unique; it controls the article's address.

Use `## Heading` for sections, `**bold**` for emphasis, `[link text](https://example.com)` for links, and `![Image description](/assets/my-image.jpg)` for an image saved at `public/assets/my-image.jpg`.

For a new normal page using the existing shared shell:

1. Add `src/content/pages/my-page.html` with the page's HTML content.
2. Add an entry to `src/content/pages.json`: `{"path":"my-page","title":"My Page","description":"A useful search description.","type":"page","layoutKey":"article","contentKey":"my-page"}`.
3. Add the page link to the shared navigation if it should appear there.

For a fully custom layout, add a normal `.astro` page under `src/pages/` instead. Match the existing site styles and update navigation and sitemap coverage when introducing custom routes.

## Contact email

Formspree continues delivering enquiries to `Contact@oderindestephen.com`, as requested. The public endpoint and verified state are in `src/config/contact.json`. The original form layout is retained; browser validation and Formspree replace the previous PHP submission handler. Formspree is the only contact-form processing service; no WordPress connection is used.

## SEO and review status

`src/config/site.json` sets the public origin, profile links and indexing policy. Titles, descriptions, canonical URLs, social metadata and structured data are generated locally. The sitemap includes local pages and published Markdown posts.

The preview deliberately has `indexable: false`, `noindex, follow` metadata and a disallowing robots.txt. Enable indexing only as part of the approved main-domain launch. Traffic analytics are not configured yet.

## Publish the review preview

```sh
npm test
npm run deploy:preview
```

This builds and validates the site, then uploads to the existing Cloudflare project `oderinde-stephen-preview` on its `main` branch. Cloudflare CLI sign-in is required. The review URL is https://oderinde-stephen-preview.pages.dev. It does not attach or change `oderindestephen.com`.

Commit and push source changes to https://github.com/pythonhero1/Oderinde-Stephen-Website as well. A GitHub push alone does not deploy this Direct Upload Pages project. Deployment currently uses the command above; unattended GitHub deployment would need a separate workflow and a scoped Cloudflare credential.

The existing hosted and local WordPress installations are preserved as backups. They are no longer content sources for Astro. Retiring those hosting installations and changing the main domain are separate launch actions.

## Checks

```sh
npm test
npm run build
npm run validate
```

Checks cover preservation of the original main-page structure, independent local rendering, original form delivery, individual project content, blog routes and draft creation. The build validator checks local assets, internal links and section anchors; its report is `reports/link-audit.json`.
