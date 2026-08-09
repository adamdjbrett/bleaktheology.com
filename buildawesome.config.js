import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const metadata = load(readFileSync("src/_data/metadata.yml", "utf8"));
const timeZone = metadata.timezone;
process.env.TZ = timeZone;
const archive = JSON.parse(readFileSync("src/_data/archive.json", "utf8"));
const pageSize = metadata.pagination.size;
let memoizedPosts;
const memoizedTaxonomies = new Map();

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function futurePosts(collectionApi) {
  return collectionApi.getFilteredByTag("posts").map((item) => ({
    title: item.data.title || "",
    displayTitle: item.data.title || "Untitled",
    date: new Date(item.data.date).toISOString(),
    url: item.url,
    categories: (item.data.categories || []).map((name) => ({ name, url: `${metadata.paths.categories}${slugify(name)}/` })),
    tags: (item.data.postTags || []).map((name) => ({ name, url: `${metadata.paths.tags}${slugify(name)}/` })),
    excerpt: item.data.description || ""
  }));
}

function posts(collectionApi) {
  if (memoizedPosts) return memoizedPosts;
  const values = [...archive.posts, ...futurePosts(collectionApi)].sort((a, b) => b.date.localeCompare(a.date));
  const duplicate = values.find((post, index) => values.findIndex((other) => other.url === post.url) !== index);
  if (duplicate) throw new Error(`Duplicate post URL: ${duplicate.url}`);
  return memoizedPosts = values;
}

function taxonomies(collectionApi, field, basePath) {
  if (memoizedTaxonomies.has(field)) return memoizedTaxonomies.get(field);
  const groups = new Map();
  for (const post of posts(collectionApi)) {
    for (const term of post[field] || []) {
      const value = typeof term === "string" ? { name: term, url: `${basePath}${slugify(term)}/` } : term;
      const group = groups.get(value.url) || { name: value.name, url: value.url, posts: [] };
      group.posts.push(post);
      groups.set(value.url, group);
    }
  }
  const values = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  memoizedTaxonomies.set(field, values);
  return values;
}

function taxonomyPages(collectionApi) {
  return [
    ...taxonomies(collectionApi, "categories", metadata.paths.categories).map((item) => ({ ...item, type: "Category" })),
    ...taxonomies(collectionApi, "tags", metadata.paths.tags).map((item) => ({ ...item, type: "Tag" }))
  ].flatMap((item) => {
    const chunks = Array.from({ length: Math.ceil(item.posts.length / pageSize) }, (_, index) => ({
      ...item,
      posts: item.posts.slice(index * pageSize, (index + 1) * pageSize),
      pageNumber: index + 1,
      pageCount: Math.ceil(item.posts.length / pageSize),
      outputUrl: index ? `${item.url}page/${index + 1}/` : item.url
    }));
    return chunks;
  });
}

function listingPages(collectionApi) {
  const values = posts(collectionApi);
  const chunks = (base, type, name, skipFirst = false) => Array.from({ length: Math.ceil(values.length / pageSize) }, (_, index) => ({
    type,
    name,
    url: base,
    posts: values.slice(index * pageSize, (index + 1) * pageSize),
    pageNumber: index + 1,
    pageCount: Math.ceil(values.length / pageSize),
    outputUrl: index ? `${base}page/${index + 1}/` : base
  })).slice(skipFirst ? 1 : 0);
  return [
    ...chunks(metadata.paths.home, "Archive", "Latest stories", true),
    ...chunks(metadata.author.path, "Author", metadata.author.name)
  ];
}

export default function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", () => {
    memoizedPosts = undefined;
    memoizedTaxonomies.clear();
  });
  eleventyConfig.addDataExtension("yml", load);
  eleventyConfig.addDataExtension("yaml", load);
  eleventyConfig.addFilter("readableDate", (value) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone }).format(new Date(value)));
  eleventyConfig.addFilter("dateToRfc3339", (value) => new Date(value).toISOString());
  eleventyConfig.addPassthroughCopy({ "src/public": "." });

  eleventyConfig.addCollection("posts", posts);
  eleventyConfig.addCollection("pages", (api) => [...archive.pages, ...api.getFilteredByTag("pages")]);
  eleventyConfig.addCollection("categories", (api) => taxonomies(api, "categories", metadata.paths.categories));
  eleventyConfig.addCollection("tags", (api) => taxonomies(api, "tags", metadata.paths.tags));
  eleventyConfig.addCollection("archivePages", (api) => [...taxonomyPages(api), ...listingPages(api)]);

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["md", "njk", "11ty.js"],
    htmlTemplateEngine: false,
    markdownTemplateEngine: "njk"
  };
}
