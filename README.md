# Oderinde Stephen — Astro + WordPress

Astro serves the public frontend. WordPress remains the content editor. During this local-first stage, content is read from the public WordPress REST API on your Mac, saved as a versioned snapshot, and built into static pages. Cloudflare never needs to reach a `.local` address and visitors do not need WordPress running.

## Requirements

- Node.js 22.23.4 or newer
- Your WordPress site running in Local when refreshing content

## Local development

```sh
npm ci
cp .env.example .env
npm run sync:wordpress
npm run dev
```

The initial WordPress URL is `http://oderindestephen.local`. Optional `WORDPRESS_PUBLIC_DIR` points to the Local site's `app/public` folder and speeds up copying public assets. `.env` is ignored by Git; no WordPress login is required for published content.

## Refresh after editing WordPress

Publish your changes in WordPress, then run:

```sh
npm run build:wordpress
npm run preview
```

`sync:wordpress` discovers all published pages, posts and case studies through paginated REST API collections. It retrieves each item's individual `content.rendered` so Divi's per-request class numbering stays consistent, refreshes its page shell and CSS, and copies referenced images, fonts and scripts. A failed API or asset request stops the sync instead of reporting a successful refresh.

`src/data/wordpress.json` is the versioned public snapshot. `npm run build` builds that snapshot without contacting WordPress, including on Cloudflare and CI. Use `build:wordpress` to fetch new content first. Dev-server reloads alone do not fetch WordPress changes.

## Divi compatibility

This first version keeps Divi's generated markup, styling and presentation scripts to preserve the current design; it is not a rewrite into individual Astro components. Astro inserts the REST content into the captured page shell at build time.

The six case-study pages use a Divi Theme Builder body that replaces the normal post content. For these pages the sync also refreshes the public WordPress view, because `content.rendered` alone does not include that template. Edit that display in WordPress Theme Builder. The current WordPress template displays Pipe Patch Pro content across all six case-study URLs; this pre-existing behaviour is retained, rather than silently changing those layouts.

An older export received an empty WordPress response for the blog. A reconstructed article layout is retained in `migration/layout-fallbacks.json` as an explicit fallback for that route; the latest sync recovered its normal WordPress view. `migration/sync-report.json` records any fallback use and template-managed pages.

## Contact enquiries

The preview has an email link to `Contact@oderindestephen.com`. The original Divi submit button is disabled because WordPress's PHP/AJAX form handler cannot run on a static Pages site. An email delivery backend must be configured before enabling submissions; an email recipient alone does not provide a delivery service.

## GitHub and Cloudflare preview

Repository: https://github.com/pythonhero1/Oderinde-Stephen-Website

The custom domain is intentionally not connected. The live WordPress site and its DNS remain unchanged.

To build from this repository in Cloudflare Pages, choose the Astro preset, build command `npm run build`, output folder `dist`, and Node.js `22.23.4` or newer. This uses the committed snapshot, so WordPress can remain local.

For a locally built preview upload using Cloudflare's CLI:

```sh
npx wrangler login
npx wrangler pages project create oderinde-stephen-preview --production-branch main
npm run deploy:preview
```

This uploads to the `preview` branch of a separate Pages project. It does not attach `oderindestephen.com` or change any DNS records. Reuse the existing preview project after its initial creation. Account authentication is required. If automatic builds from GitHub are preferred, create a Git-integrated Pages project in Cloudflare first; a Direct Upload project cannot later be converted to Git integration.

After changing local WordPress content, refresh, review, commit and push the updated snapshot/assets, then deploy again. Automatic publishing directly from WordPress can be configured once the backend is hosted online.

## Validation

```sh
npm test
npm run build
npm run validate
```

Tests cover REST pagination and errors, content insertion, URL rewriting, and prevention of preview form submissions. The validator checks all generated routes and local asset references. The link audit reports pre-existing links to unpublished/missing pages; these should be reviewed before attaching the live domain.
