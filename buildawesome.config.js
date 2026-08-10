import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import pluginTOC from "@uncenter/eleventy-plugin-toc";
import pluginFilters from "./_config/filters.js";
import { normalizeTerms, publicPostTags } from "./_config/taxonomy.js";
import { convertWordPressCaptions } from "./_config/wordpress-caption.js";

export default async function (buildAwesomeConfig) {
	buildAwesomeConfig.addDataExtension("yaml", loadYaml);
	buildAwesomeConfig.addGlobalData("siteAuthors", () =>
		loadYaml(readFileSync("src/_data/authors.yaml", "utf8")) || [],
	);

	buildAwesomeConfig.addPreprocessor("drafts", "*", (data) => {
		const inDrafts = data.page?.inputPath?.includes("/src/_drafts/");
		if (process.env.ELEVENTY_RUN_MODE === "build" && (inDrafts || data.published === false)) {
			return false;
		}
	});

	buildAwesomeConfig.addPassthroughCopy({ "./src/assets": "/assets" });
	for (const name of ["audio.buzzsprout.com", "comments", "external", "feed", "storage.buzzsprout.com", "www.azleg.gov"]) {
		buildAwesomeConfig.addPassthroughCopy({ [`./static-assets/${name}`]: `/${name}` });
	}
	buildAwesomeConfig.addPassthroughCopy({ "./static-assets/wp-content/uploads": "/wp-content/uploads" });
	buildAwesomeConfig.addPassthroughCopy({ "./static-assets/wp-content/uploads/favicon/favicon.ico": "/favicon.ico" });
	buildAwesomeConfig.addWatchTarget("src/assets/css/**/*.css");
	buildAwesomeConfig.addWatchTarget("src/assets/js/**/*.js");
	buildAwesomeConfig.addPlugin(pluginFilters);
	buildAwesomeConfig.addPlugin(pluginTOC, {
		tags: ["h2", "h3", "h4"],
		wrapper: (items) =>
			`<nav id="toc" class="post-toc" aria-labelledby="toc-title"><h2 id="toc-title">Contents</h2>${items}</nav>`,
	});

	const markdown = markdownIt({ html: true, linkify: true, typographer: true })
		.use(markdownItFootnote)
		.use(markdownItAnchor, {
			level: [2, 3, 4],
			slugify: (value) => buildAwesomeConfig.getFilter("slugify")(value),
		});
	markdown.core.ruler.before("block", "wordpress-caption", (state) => {
		state.src = convertWordPressCaptions(state.src);
	});
	buildAwesomeConfig.setLibrary("md", markdown);

	let contentCache;
	const content = (api) => {
		if (contentCache) return contentCache;
		const posts = api.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
		const pages = api.getFilteredByTag("pages");
		const buildTerms = (type) => {
			const groups = new Map();
			for (const post of posts) {
				const values = type === "tag" ? publicPostTags(post.data) : post.data.categories;
				for (const term of normalizeTerms(values, type, (value) => buildAwesomeConfig.getFilter("slugify")(value))) {
					const key = term.url.toLowerCase();
					const group = groups.get(key) || { ...term, posts: [] };
					group.posts.push(post);
					groups.set(key, group);
				}
			}
			return [...groups.values()]
				.map((term) => ({ ...term, count: term.posts.length }))
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
		};
		contentCache = { posts, pages, tags: buildTerms("tag"), categories: buildTerms("category") };
		return contentCache;
	};
	const pageSize = 5;
	const paged = (term, type) => Array.from({ length: Math.ceil(term.posts.length / pageSize) }, (_, index) => ({
		...term,
		type,
		posts: term.posts.slice(index * pageSize, (index + 1) * pageSize),
		pageNumber: index + 1,
		pageCount: Math.ceil(term.posts.length / pageSize),
		outputUrl: index ? `${term.url}page/${index + 1}/` : term.url,
	}));

	buildAwesomeConfig.on("eleventy.before", () => { contentCache = undefined; });
	buildAwesomeConfig.addCollection("posts", (api) => content(api).posts);
	buildAwesomeConfig.addCollection("pages", (api) => content(api).pages);
	buildAwesomeConfig.addCollection("tags", (api) => content(api).tags);
	buildAwesomeConfig.addCollection("topics", (api) => content(api).tags);
	buildAwesomeConfig.addCollection("categories", (api) => content(api).categories);
	buildAwesomeConfig.addCollection("taxonomyPages", (api) => [
		...content(api).tags.flatMap((term) => paged(term, "Tag")),
		...content(api).categories.flatMap((term) => paged(term, "Category")),
	]);
	buildAwesomeConfig.addCollection("listingPages", (api) => {
		const values = content(api).posts;
		const pages = (url) => Array.from({ length: Math.ceil(values.length / pageSize) - 1 }, (_, index) => ({
			url,
			posts: values.slice((index + 1) * pageSize, (index + 2) * pageSize),
			pageNumber: index + 2,
			pageCount: Math.ceil(values.length / pageSize),
			outputUrl: `${url}page/${index + 2}/`,
		}));
		return [...pages("/"), ...pages("/author/admin/")];
	});

	buildAwesomeConfig.on("eleventy.after", ({ dir }) => {
		if (process.env.ELEVENTY_RUN_MODE !== "build") return;
		const executable = resolve("node_modules", ".bin", process.platform === "win32" ? "pagefind.cmd" : "pagefind");
		execFileSync(executable, ["--site", dir.output, "--glob", "**/*.html"], { stdio: "inherit" });
	});
}

export const config = {
	templateFormats: ["md", "njk", "html", "11ty.js"],
	markdownTemplateEngine: "njk",
	htmlTemplateEngine: false,
	dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
};
