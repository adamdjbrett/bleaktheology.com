# Bleak Theology

Bleak Theology uses the Headline 2.0 theme on Build Awesome (Eleventy 4). The 279 imported posts are editable source files under `src/posts/`; their WordPress block markup, metadata, and `/YYYY/MM/DD/slug/` routes are preserved. Pages live in `src/pages/`, while referenced archive media lives in `static-assets/`.

Site values and the `America/New_York` publication timezone live in `src/_data/metadata.yaml`. Categories and tags are memoized once per build and retain their historical nested URLs and pagination.

- `npm run dev` starts `http://localhost:8080/`.
- `npx @awesome.com/buildawesome --serve` starts the same development server.
- `npm run build` builds `_site/`, runs Pagefind 1.5.2, checks routes/assets/links, and validates the archive against the ignored WordPress XML export.
- New post filenames must begin `YYYY-MM-DD-`; their output remains `/YYYY/MM/DD/slug/`.
- Pages CMS manages posts, pages, media, authors, navigation, metadata, and theme settings through `.pages.yml`.
