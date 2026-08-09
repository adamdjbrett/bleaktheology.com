# Bleak Theology

Build Awesome (Eleventy 4) preserves the public archive in `src/public/`, publishes it at the original WordPress routes, and generates category/tag archives plus Pagefind search. Site-wide values live in `src/_data/metadata.yml`.

Dates use the `America/New_York` timezone to preserve the WordPress publication calendar.

- `npm run build` builds and verifies `_site/`.
- `npm run serve` starts the local site.
- Add future posts to `src/content/posts/` with `title`, `date: YYYY-MM-DD`, optional `slug`, `categories`, and `postTags`; their permalink is always `/YYYY/MM/DD/slug/`.
- Add future pages to `src/content/pages/` with `title` and optional `slug`; their permalink is always `/slug/`.
- Manage future posts, pages, uploads, and site settings through [Pages CMS](https://app.pagescms.org/); its repository configuration is `.pages.yml`.
