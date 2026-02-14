# Our Food Challenge

Food-focused country planner site built with Eleventy and deployed on Cloudflare Pages.

Live site: https://our-food-challenge.pages.dev

## What this project does today

- Publishes a static site with pages for countries we want to cook from.
- Uses Markdown posts in `src/posts/` as the source of truth.
- Shows flags for each country via FlagCDN.
- Shows regional vector maps with country highlighting using `jsvectormap`.
- Supports map fallback for tiny islands/microstates using front matter `mapFocus` coordinates.
- Outputs static HTML into `build/` for Cloudflare Pages.

## Core behavior and data model

Each post in `src/posts/*.md` can include:

- `title`
- `iso` (2-letter country code)
- `dishes`, `sweets`, `possibles`, `possiblesweets`
- `mapFocus` (optional):
  - `coords: [lat, lng]`
  - `scale: number`

If `mapFocus` exists, maps focus on coordinates. Otherwise they focus by region code.

## Tech stack

- Eleventy 2
- Nunjucks layouts
- Cloudflare Pages deploy
- `eleventy-plugin-seo`
- `jsvectormap` (CDN)

## Key project files

- `src/_includes/layouts/home.njk` - Home page table and map rendering
- `src/_includes/layouts/post.njk` - Individual country page rendering
- `src/seo.json` - Site title/description/canonical/image config
- `.eleventy.js` - Build config, SEO URL logic, collections
- `scripts/validate-post-maps.js` - Build-time map metadata warnings
- `public/style.css` - Site styling and typography

## Build and deploy

### Local

- Install: `npm install`
- Dev server: `npm start`
- Production build: `npm run build`

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `build`
- Node: `20+`

## SEO setup

- Canonical/base URL is set in `src/seo.json` as `https://our-food-challenge.pages.dev`
- Social preview image is configured in `src/seo.json` `image`
- Codespaces previews override URL at build-time in `.eleventy.js`

## Comments (Utterances)

- Comments are enabled on post pages via `utteranc.es` in `src/_includes/layouts/post.njk`.
- Repository used for comment threads: `stretchyboy/our-food-challenge`.
- Thread mapping: `issue-term="pathname"` (one GitHub issue per post URL).
- Label used for created issues: `comments`.

### Moderation

- Open the repository Issues tab to review comment threads.
- Moderate by editing/locking/closing the underlying GitHub issue.
- Keep or filter by the `comments` label to manage comment-only issues.

## Current constraints

- Some social networks prefer PNG for `og:image`; current social card is SVG unless `public/social-card.png` is generated.
- Tiny countries may not exist as selectable world polygons; those need `mapFocus` coordinates.

## Next wave candidates

1. Generate and commit `public/social-card.png` for maximum social compatibility.
2. Add a small script to suggest `mapFocus` defaults from country metadata.
3. Normalize all post front matter fields (consistent ordering and optional field docs).
4. Improve home table UX (sort/filter by region or status).
5. Replace remaining CDN dependencies with self-hosted assets where practical.

## Review checklist for next changes

- Is every post using correct `iso`?
- Do tiny-island posts have `mapFocus`?
- Does `npm run build` produce no warnings we care about?
- Does deployed SEO metadata show correct canonical/image?
