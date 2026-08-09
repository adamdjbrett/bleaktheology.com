function permalink(data) {
  const value = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Posts require a YYYY-MM-DD date: ${data.page.inputPath}`);
  const [year, month, day] = value.split("-");
  return data.metadata.permalinks.post
    .replace("{year}", year)
    .replace("{month}", month)
    .replace("{day}", day)
    .replace("{slug}", data.slug || data.page.fileSlug);
}

export default {
  tags: ["posts"],
  layout: "layouts/post.njk",
  eleventyComputed: { permalink }
};
