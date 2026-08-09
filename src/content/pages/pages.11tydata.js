export default {
  tags: ["pages"],
  layout: "layouts/page.njk",
  eleventyComputed: { permalink: (data) => data.metadata.permalinks.page.replace("{slug}", data.slug || data.page.fileSlug) }
};
