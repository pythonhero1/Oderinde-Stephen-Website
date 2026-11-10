# Approved design reference library

Saved from the owner's ten original screenshots on 10 November 2026. These are the visual references for future reusable Astro components. This library records the designs; it does not mean all ten have already been implemented as reusable components. No public page was changed while saving this library.

## How to reuse

- Match the relevant screenshot's composition, image placement, proportions, typography, colour accents, borders, radii and spacing. Do not replace it with a new interpretation of a dark theme.
- Preserve the page's existing images, text, links, sections and order unless the owner explicitly requests a content change. Never substitute a photo with a new icon or illustration to make styling easier.
- Keep the colourful pricing and case-study graphics. Their colours are intentional; do not recolour them blue just because the surrounding theme is blue.
- Choose the matching template when needed, rather than adding every template to every page. When converting a section to a component, preserve its content through props and slots.
- On narrow screens stack split sections in reading order, let cards wrap into fewer columns, keep images proportional, and wrap buttons and text without overflow. Preserve every item; do not hide items to make them fit. The screenshots specify desktop appearance; mobile adaptations still need visual checking.
- Compare the implementation to the original reference at a comparable width before describing it as a match. Do not assume the current Astro page is the approved reference.

## Template catalogue

| ID / reusable name | Reference | Elements to preserve |
| --- | --- | --- |
| 01 · SplitHero | [Original screenshot](references/01-split-hero.png) | Left eyebrow, bold white/blue headline, paragraph and two buttons; full original image on the right; separate full-width benefit strip below. Pricing screenshot uses the original purple/yellow artwork. |
| 02 · ReviewStrip | [Original screenshot](references/02-review-strip.png) | Small tracked “Rated on” label; four horizontal dark cards with original platform icons, platform names and review area; subtle grey borders and rounded corners. Review figures must come from supplied real profile data, not the template's illustrative stars. |
| 03 · ConnectedFlowCards | [Original screenshot](references/03-connected-flow-cards.png) | Four gradient cards; icon and circular number at the top; spaced uppercase label, title and description; green-dot outcome pill at the bottom; connector arrows between cards. |
| 04 · SectionHeading | [Original screenshot](references/04-section-heading.png) | Centred, tracked blue monospace eyebrow; white headline with selected blue words; centred muted description with a controlled line length. |
| 05 · PlatformStrip | [Original screenshot](references/05-platform-strip.png) | Centred heading and introduction above a balanced row of the original twelve neon platform graphics. Keep every supplied platform graphic; wrap on mobile. |
| 06 · PricingPromo | [Original screenshot](references/06-pricing-promo.png) | Two separate side-by-side panels: gradient bordered text card on the left, large original purple/yellow pricing image on the right. Eyebrow, white/blue title, description, starting-price line and two buttons. Do not merge into one generic panel. |
| 07 · GuidanceFAQ | [Original screenshot](references/07-guidance-faq.png) | Narrow illustrated guidance card on the left with blue glow, growth icon, question-mark background, pill label, heading, description, three chips and full-width CTA. Wider FAQ column on the right; rounded charcoal rows, light text and right-aligned plus/minus controls. |
| 08 · CaseStudyHero | [Original screenshot](references/08-case-study-hero.png) | Large split hero with bold white/blue title, original red/blue case-study image, two buttons, project-count block, and full-width benefit strip. Use the actual project count. |
| 09 · ProjectCTA | [Original screenshot](references/09-project-cta.png) | Large rounded outlined panel; original vivid blue background artwork and illustrated person at the lower right; centred eyebrow pill, white/blue heading, description, two buttons and related links. Position mobile artwork so text remains readable without dropping it. |
| 10 · PricingCards | [Original screenshot](references/10-pricing-cards.png) | Three tall gradient cards with blue outlines; purple monospace category, bold white title, description, starting-price label and large price, full-width blue CTA, scope label, blue outlined check icons and fine-print note. Keep the original prices and wording unless asked to edit them. |

## Verified live homepage background

Inspected directly at [oderindestephen.com](https://oderindestephen.com/) on 10 November 2026. The screenshot references define the approved compositions; live computed values below define the observed homepage colour treatment. They are separate references because typography and sizes vary with viewport and section.

- Page base: `#07090D`.
- Hero gradient: `linear-gradient(120deg, #0C1239 0%, #000000 35%, #0C1239 100%)`.
- Alternating section gradient: `linear-gradient(-120deg, #0C1239 0%, #000000 65%, #0C1239 100%)`.
- Flow-card gradient: `linear-gradient(140deg, #0C1239 1%, #000000 55%, #0C1239 100%)`.
- Flow-card border: `1px solid rgba(37, 99, 235, 0.5)`; radius `20px`; shadow `0 2px 18px rgba(43, 51, 104, 0.3)`.
- Review-card surface: `#0E1219`; border `1px solid rgba(48, 56, 71, 0.9)`; radius `18px`.
- Primary button and homepage hero emphasis: `#2563EB`; button radius `10px`.
- Hero text: `#F5F7FC`; section-heading white: `#F8FAFC`; section-label blue: `#60A5FA`.
- Observed fonts: Inter for headings/buttons, Work Sans for body copy, Space Mono for tracked section labels. Match the reference's weight per template; do not apply one weight indiscriminately.

Exact observed values are saved in [live-homepage-observations.json](live-homepage-observations.json). Reusable CSS variables are available in [theme-tokens.css](theme-tokens.css); this file is deliberately not imported into public pages yet.

## Section width standard

Verified against the Cloudflare homepage and pricing page on 10 November 2026: centre primary content rows with a maximum width of **1248px** on large screens. Use the homepage's **90% width at 1024px and below** for responsive side margins. Nested rows use 100% of their parent, without adding another outer gutter. Keep decorative full-width background layers separate from the content width.

## Existing project assets

Reuse the original assets under `src/assets/images` and `public/images`, including `Split-Tone-3D-Pricing-Badge.avif`, the platform/review icons, `ATTRACT-Icon.svg`, `CONVERT-Icon.svg`, `Flow-Arrow.svg`, `website-project-clarity-question-background.avif`, `neon-growth-chart-icon.avif`, `thoughtful-young-man-in-blue-glow.avif` and the original case-study artwork. Resolve each template's actual asset before implementation; the screenshot itself is a reference, not a flattened replacement for a section.
