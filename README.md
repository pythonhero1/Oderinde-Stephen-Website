# Oderinde Stephen — Astro portfolio

A static Astro website hosted on Cloudflare Pages. Pages use native Astro components, blog posts use Astro content collections and Markdown, and enquiries go to the verified Formspree endpoint. There is no WordPress backend, theme runtime, jQuery or client-side framework.

## Start locally

Use Node.js 22.23.4 or newer.

```sh
npm ci
npm run dev
```

## Project structure

| Location                       | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `src/content/pages/*.astro`    | Editable pages and project case studies                   |
| `src/content/pages.json`       | Page addresses, titles, descriptions and theme selection  |
| `src/content/blog/*.md`        | Blog articles and draft status                            |
| `src/content.config.ts`        | Validation rules for article metadata                     |
| `src/components/content/`      | Shared headings, text, buttons, columns, images and FAQs  |
| `src/components/site/`         | Navigation, footer, contact form and search metadata      |
| `src/layouts/SiteLayout.astro` | Shared page document and site shell                       |
| `src/styles/`                  | Local design styles, layout rules and named design tokens |
| `src/assets/images/`           | Source images optimized by Astro at build time            |
| `public/images/`               | Static backgrounds, SVGs and animated images              |
| `public/fonts/`                | Locally hosted fonts and small icon subsets               |
| `src/scripts/ui.ts`            | Dependency-free menu, FAQ and workspace-demo interactions |

The page structures, typography and colors retain the saved design. The previous exported HTML document assembly, generated configuration, vendor scripts, plugin folders and builder metadata have been removed. Some original content sections are still unfinished and marked for review.

## Edit a page

Edit the corresponding `.astro` file in `src/content/pages/`. Components describe the layout directly: `PageSection`, `Container`, `Column`, `Heading`, `TextBlock`, `ButtonLink` and `ResponsiveImage`. Update the page's title and search description in `src/content/pages.json`.

Navigation links live in `src/components/site/MenuLinks.astro`. The footer and contact form are their own components. Public profile links and the production origin are in `src/config/site.json`; existing page links use those configured destinations.

## Add a page

1. Create a component in `src/content/pages/`, for example `MyPage.astro`.
2. Add a record to `src/content/pages.json` with a unique `path`, `title`, `description`, `type: "page"`, `component: "MyPage"`, `style: "article"` and the same `bodyClass` as the Insights page.
3. Add a navigation link if the page should appear in the menu.

The page is generated automatically and included in the sitemap. For a new visual layout, add its stylesheet under `src/styles/pages/` and use its filename without `.css` as the record's `style` value.

## Write an article

```sh
npm run new:post -- "Your article title"
```

This creates a Markdown draft in `src/content/blog/`. Edit the title, description and content, then change `draft: true` to `draft: false` to publish it. Keep each slug unique. Astro validates the metadata, renders the article, and updates Insights and the sitemap.

Use `## Heading`, `**bold**`, `[link text](https://example.com)` and ordinary Markdown lists. Save a blog image in `public/images/` and reference it as `![Description](/images/my-image.avif)`. For existing page images, add the source to `src/assets/images/` and use `ResponsiveImage`; Astro generates appropriately sized WebP/AVIF versions and reserves their dimensions.

## Contact delivery

`src/config/contact.json` contains the verified Formspree endpoint. It delivers enquiries to `Contact@oderindestephen.com`. The form uses native HTML validation, accessible field labels and direct submission to Formspree. No website server or database processes the message.

## Performance

- Static pages and metadata are generated during the build.
- No jQuery, theme scripts, plugin scripts, hydration framework or exported document parser is shipped.
- A small browser script handles the menu, FAQs and the optional workspace illustration.
- Images use responsive sizes; below-the-fold images load lazily.
- Fonts are hosted locally; icon fonts contain only the characters the site uses.
- Build output is checked for unused assets, missing links, legacy dependencies and payload budgets.

`reports/performance.json` records the current homepage payload. `reports/performance-before.json` records the starting export for comparison. These measure file sizes; they are not Lighthouse scores or guarantees of network load time.

## Check and publish

```sh
npm run format:check
npm test
npm run validate
npm run deploy:preview
```

`npm test` builds first and tests the generated pages, content preservation, contact form, blog, FAQs and draft creation. The build generates optimized images and removes unreferenced generated assets. Its first image optimization pass takes longer; subsequent builds reuse the image cache. `npm run validate` audits internal links and local assets, then enforces the homepage budgets of 30 KB compressed HTML, 40 KB compressed stylesheets and 8 KB browser JavaScript.

For a single publishing command, `npm run deploy:preview` runs the build/tests and validation before deploying. Cloudflare CLI authentication is required. It updates the existing review project at https://oderinde-stephen-preview.pages.dev and does not change `oderindestephen.com`.

Source repository: https://github.com/pythonhero1/Oderinde-Stephen-Website. Commit and push source changes as well. This Direct Upload Cloudflare project currently deploys through the command above; a GitHub push alone does not publish it.

The review build remains excluded from indexing through `src/config/site.json`. Enable indexing only with the approved main-domain launch. Existing WordPress installations and private migration backups are separate from this source and are not used by the site. Traffic analytics are not configured yet.

### Display and language preferences

The header provides light/dark mode and English, German, Italian, Spanish and French language choices. Dark is the default. Choices are remembered on the visitor's device. Translation loads only after selection; the original English content, URLs, metadata and structured data remain the source for SEO. Automatically translated copy should be reviewed before relying on exact wording; this feature does not create separate indexed language pages.

Automatic translation uses Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`) through the Pages `AI` binding in `wrangler.jsonc`. `npm run build` generates an allowlist of published text in `.generated/translation-strings.json`. The endpoint accepts only these keys, never contact form entries. Translated phrases are cached at the edge. If the free daily allowance is exhausted or the service fails, visitors see the original English with an explanatory message. No paid plan was enabled. The website and Formspree form work independently of translation.

Use `npm run build` before deploying or running the Pages Functions locally. Astro's development server supports theme testing; use `wrangler pages dev dist` for the translation function (the AI binding executes remotely). Production deploys use the existing `npm run deploy:preview` command.
