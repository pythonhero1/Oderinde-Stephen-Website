# Oderinde Stephen — Astro + WordPress

Astro serves the public frontend. WordPress remains the content editor. Content is read from the public WordPress REST API at `https://cms.oderindestephen.com`, saved as a versioned snapshot, and built into static pages. The latest local WordPress copy has been restored to that separate online CMS. The older main-domain WordPress site is preserved until the Astro frontend is ready for its domain switch.

## Requirements

- Node.js 22.23.4 or newer
- Access to the online WordPress CMS when refreshing content

## Local development

```sh
npm ci
cp .env.example .env
npm run sync:wordpress
npm run dev
```

.env.example points to `https://cms.oderindestephen.com`. Leave `WORDPRESS_PUBLIC_DIR` unset for the online CMS so public assets come from the same online source. For local-only development, both settings can point to the same Local site. `.env` is ignored by Git; no WordPress login is required for published content.

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

The six case studies now render their individual authored WordPress content in a shared lightweight article layout, correcting the source Theme Builder template that displayed Pipe Patch Pro on every project. Blog posts, services, the project index, insights index, contact and privacy pages also use lightweight layouts. The home and pricing pages retain their Divi presentation. Shared navigation and footer are rendered consistently across the site. Edit project and article text in WordPress; layout, profile links and preview SEO settings are maintained in this repository.

An older export received an empty WordPress response for the blog. A reconstructed article layout is retained in `migration/layout-fallbacks.json` as an explicit fallback for that route; the latest sync recovered its normal WordPress view. `migration/sync-report.json` records any fallback use and template-managed pages.

Real Upwork and Fiverr profiles are configured in `src/config/site.json`. Placeholder review badges and the unfinished checklist download are hidden in the review build. The automatic Mac publisher is currently paused; a hosted publishing workflow and traffic analytics are not configured yet.

## Contact enquiries

The form is configured for Formspree's free plan (currently 50 submissions/month), delivering to `Contact@oderindestephen.com`. Create/claim the form in the intended Formspree account and verify that recipient address. Put its public `https://formspree.io/f/...` endpoint in `src/config/contact.json` and set `verified` to `true` only after the destination shows Verified in Formspree, then build and publish. No API key is needed.

Until an endpoint is configured, the submit button stays disabled and the email link remains available. After configuration the form uses native browser validation and Formspree's submission/confirmation flow. WordPress nonces, the old Divi captcha, and Divi's PHP submission script are removed; Formspree provides its own server-side spam handling. The existing design and fields remain in place, with company, budget and timeline optional.

## Automatic local publishing

Cloudflare CLI authentication and the first end-to-end publication have been verified on the original Mac. On a new Mac, authenticate Cloudflare and check a manual publication before installing the background service.

```sh
npm run check:publisher
npm run publish:wordpress
npm run install:publisher
```

The first command checks connectivity without changing anything. The second exports, tests, builds, validates, commits generated content/assets, pushes to GitHub and deploys to the existing preview project. After one successful manual publish, the installer creates a macOS login agent that checks every 60 seconds. It keeps an official Node runtime under the ignored `.tools/` directory so a temporary runtime cleanup will not break the service. Logs and last successful publication are stored under ignored `.local/`.

The current publisher still runs on your Mac, which must be awake, signed in and online. Local WordPress no longer needs to run when the source is the online CMS. When WordPress is unavailable, publication waits and retries; the existing hosted preview stays live. Publishing updates the Pages preview; it does not attach the public domain. Publishing while the Mac is asleep/offline still requires a hosted build workflow and deployment credentials; hosting WordPress online alone does not move the publisher online.

Published pages/posts/case studies are detected through their REST API modification metadata, including additions, deletions and route changes. The companion `wordpress/astro-local-publisher` notifier is retained only in this Mac's Local site and was excluded from the online CMS. It is installed locally as `wp-content/mu-plugins/astro-local-publisher.php`; it signals Divi Theme Builder, menu and selected site-option changes through a timestamp file outside the public web root. It exposes no public endpoint and contains no credentials. The online CMS does not use this local marker; after changing shared Theme Builder layouts, menus or site options online, run `npm run publish:wordpress` to force a refresh. Deployments are serialized and never auto-commit unrelated source edits or overwrite GitHub changes. A failed stage is retried without treating the update as published.

To stop and disable background publishing:

```sh
npm run stop:publisher
```

Run `npm run install:publisher` to re-enable it. Do not move or delete this project folder while the agent is enabled.

## GitHub and Cloudflare preview

Published review site: https://oderinde-stephen-preview.pages.dev

The current Pages project was created using Direct Upload from the Cloudflare dashboard. It serves the locally built static output independently of the local WordPress server.

Repository: https://github.com/pythonhero1/Oderinde-Stephen-Website

The main custom domain is intentionally not connected to Pages. Its older WordPress site is preserved. Only the new `cms` DNS record was added for the migrated backend. Search indexing is discouraged on the CMS copy. The review build deliberately uses `noindex, follow` and a disallowing robots.txt. Before attaching the public domain, set `indexable` to true in `src/config/site.json`, rebuild and verify the resulting robots metadata and sitemap. Public canonical URLs already use oderindestephen.com.

To build from this repository in Cloudflare Pages, choose the Astro preset, build command `npm run build`, output folder `dist`, and Node.js `22.23.4` or newer. This uses the committed snapshot, so WordPress can remain local.

For a locally built preview upload using Cloudflare's CLI:

```sh
npx wrangler login
npx wrangler pages project create oderinde-stephen-preview --production-branch main
npm run deploy:preview
```

This uploads to the `preview` branch of a separate Pages project. It does not attach `oderindestephen.com` or change any DNS records. Reuse the existing preview project after its initial creation. Account authentication is required. If automatic builds from GitHub are preferred, create a Git-integrated Pages project in Cloudflare first; a Direct Upload project cannot later be converted to Git integration.

After changing online WordPress content, refresh, review, commit and push the updated snapshot/assets, then deploy again. A hosted publishing workflow can be configured separately using the online CMS and scoped Cloudflare deployment credentials.

## Validation

```sh
npm test
npm run build
npm run validate
```

Tests cover REST pagination and errors, content insertion, URL rewriting, contact delivery configuration, individual case studies, profile links, blog navigation and preview SEO metadata. The validator checks all generated routes, local assets, internal links and section anchors. Unpublished service links currently lead to the relevant available solutions sections.
