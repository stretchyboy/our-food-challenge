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
- `mapFocus` (optional):
  - `coords: [lat, lng]`
  - `scale: number`

Recipe planning data is now sourced from GitHub Issues into `src/_data/issueFoods.json` at build time.

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
- Sync issue labels: `npm run sync:issue-labels`
- Sync issue data: `npm run sync:issue-foods`
- Production build: `npm run build`

### Issue labels for recipe triage

- Required workflow label: `recipe-suggestion`
- Decision labels: `accepted`, `rejected`
- Course labels: `starter`, `main`, `dessert`
- Dietary labels: `vegetarian`, `vegan`, `fish`, `shellfish`, `gluten-free`, `onion-free`
- Adaptation label: `requires-adaptation`
- Reserved system label: `comments` (used by Utterances discussion threads)

Important:
- GitHub issue forms in `.github/ISSUE_TEMPLATE/*` only appear from the repository **default branch**.
- If this work is on a feature branch, merge it to default branch before testing the form UI at `/issues/new`.
- Labels are synced automatically by `npm run sync:issue-labels` (also run as part of `npm run build`) when `GITHUB_TOKEN` or `GH_TOKEN` is set with repo permissions.

### How a recipe issue shows on a page

1. Create a new issue with the `Recipe suggestion` form.
2. Set `Country page path` to the exact post path (example: `/posts/bahamas/`).
3. Keep label `recipe-suggestion`.
4. Add a course label (`starter`, `main`, or `dessert`).
5. Set decision label:
  - `accepted` -> shows in "Dishes we will cook" (or "Sweets we will cook" for `dessert`)
  - no decision label -> shows in "Possible Dishes" (or "Possible Sweet Dishes" for `dessert`)
  - `rejected` -> not shown on page
6. Run `npm run build` (or `npm run sync:issue-foods`) to refresh `src/_data/issueFoods.json`.
7. Eleventy reads `issueFoods[page.url]` in `src/_includes/layouts/post.njk` and renders those sections.

Notes:
- `comments` issues from Utterances are ignored by the recipe sync.
- The page path must match exactly (including trailing slash).

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
