import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, normalize } from "node:path";
import { load as loadYaml } from "js-yaml";

const output = "_site";
const files = (root) => readdirSync(root, { recursive: true }).filter((name) => statSync(join(root, name)).isFile());
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const frontMatter = (path) => loadYaml(readFileSync(path, "utf8").match(/^---\s*\n([\s\S]*?)\n---/)[1]);
const routeFile = (url) => url.endsWith("/") ? join(output, url, "index.html") : join(output, url);
const forbidden = /i\d\.wp\.com|widgets\.wp\.com|stats\.wp\.com|jetpack\.wordpress\.com|public-api\.wordpress\.com|v0\.wordpress\.com|s0\.wp\.com|\/wp-content\/plugins\/jetpack|secure\.gravatar\.com\/js\/gprofiles/i;

for (const name of ["index.html", "search/index.html", "tags/index.html", "categories/index.html", "feed.xml", "feed/feed.rss", "sitemap.xml", "robots.txt", "pagefind/pagefind-entry.json"]) {
	if (!existsSync(join(output, name))) throw new Error(`Missing required output: /${name}`);
}

const posts = readdirSync("src/posts").filter((name) => name.endsWith(".html")).map((name) => frontMatter(join("src/posts", name)));
if (posts.length !== 279) throw new Error(`Expected 279 posts, found ${posts.length}`);
const postUrls = new Set();
for (const post of posts) {
	if (!/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(post.permalink)) throw new Error(`Post URL drift: ${post.permalink}`);
	if (postUrls.has(post.permalink)) throw new Error(`Duplicate post URL: ${post.permalink}`);
	postUrls.add(post.permalink);
	if (!existsSync(routeFile(post.permalink))) throw new Error(`Missing post: ${post.permalink}`);
}

for (const value of readFileSync("src/_data/urls.txt", "utf8").trim().split(/\r?\n/)) {
	const url = new URL(value).pathname;
	if (!existsSync(routeFile(url))) throw new Error(`Missing canonical URL: ${url}`);
}
for (const redirect of JSON.parse(readFileSync("src/_data/redirects.json", "utf8"))) {
	if (!existsSync(routeFile(redirect.url))) throw new Error(`Missing redirect route: ${redirect.url}`);
	if (!existsSync(routeFile(redirect.target)) && !existsSync(join(output, redirect.target))) throw new Error(`Missing redirect target: ${redirect.target}`);
}

const terms = new Map();
for (const post of posts) for (const [type, values] of [["category", post.categories], ["tag", post.postTags]]) {
	for (const term of values || []) {
		const key = `${type}:${term.url}`;
		terms.set(key, { type, ...term, count: (terms.get(key)?.count || 0) + 1 });
	}
}
for (const term of terms.values()) {
	if (!existsSync(routeFile(term.url))) throw new Error(`Missing taxonomy: ${term.url}`);
	for (let page = 2; page <= Math.ceil(term.count / 5); page++) {
		if (!existsSync(routeFile(`${term.url}page/${page}/`))) throw new Error(`Missing taxonomy page: ${term.url}page/${page}/`);
	}
}
for (let page = 2; page <= Math.ceil(posts.length / 5); page++) {
	for (const base of ["/", "/author/admin/"]) if (!existsSync(routeFile(`${base}page/${page}/`))) throw new Error(`Missing archive page: ${base}page/${page}/`);
}

for (const prefix of ["audio.buzzsprout.com", "comments", "external", "feed", "storage.buzzsprout.com", "www.azleg.gov", "wp-content/uploads"]) {
	for (const name of files(join("static-assets", prefix))) {
		const target = join(output, prefix, name);
		if (!existsSync(target) || digest(join("static-assets", prefix, name)) !== digest(target)) throw new Error(`Changed retained asset: /${prefix}/${name}`);
	}
}

const htmlFiles = files(output).filter((name) => name.endsWith(".html"));
const canonicalUrls = new Set();
const missing = new Set();
for (const name of files(output).filter((name) => /\.(?:css|html|js|json|txt|xml)$/i.test(name))) {
	const source = readFileSync(join(output, name), "utf8");
	if (forbidden.test(source)) throw new Error(`Forbidden Jetpack dependency: ${name}`);
	if (!name.endsWith(".html")) continue;
	for (const json of source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json[1]);
	const canonical = source.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
	if (canonical && !name.startsWith("wp-admin/") && !name.endsWith("/index")) {
		if (canonicalUrls.has(canonical)) throw new Error(`Duplicate canonical URL: ${canonical}`);
		canonicalUrls.add(canonical);
	}
	for (const match of source.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) {
		const value = match[1].replaceAll("&amp;", "&");
		if (/^(?:#|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)) continue;
		let url;
		try { url = new URL(value, `https://www.bleaktheology.com/${name.replace(/index\.html$/, "")}`); } catch { continue; }
		if (!["bleaktheology.com", "www.bleaktheology.com"].includes(url.hostname)) continue;
		const pathname = decodeURIComponent(url.pathname);
		const target = normalize(join(output, pathname));
		if (!existsSync(target) && !existsSync(join(target, "index.html"))) missing.add(`${name}: ${pathname}`);
	}
}
for (const name of files(output).filter((name) => name.endsWith(".css"))) {
	const css = readFileSync(join(output, name), "utf8");
	for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) {
		const value = match[1].split(/[?#]/)[0];
		if (/^(?:data:|https?:|\/\/)/i.test(value)) continue;
		const target = value.startsWith("/") ? join(output, value) : join(output, dirname(name), value);
		if (!existsSync(normalize(target))) missing.add(`${name}: ${value}`);
	}
}
if (missing.size) throw new Error(`Broken local references:\n${[...missing].join("\n")}`);

const representative = readFileSync(routeFile("/2011/03/16/troubled-sleep/"), "utf8");
for (const marker of ["gh-breadcrumbs", "gh-post-taxonomy", "data-pagefind-body", "wp-block-group", "#organization", "h-entry", "p-author h-card", "citation_title", "citation_author", "citation_publication_date", "DC.creator", "DC.subject"]) {
	if (!representative.includes(marker)) throw new Error(`Missing themed post feature: ${marker}`);
}
const home = readFileSync(join(output, "index.html"), "utf8");
for (const marker of ["h-card", "DC.title", "DC.description", "DC.identifier", "DC.relation.isPartOf"]) {
	if (!home.includes(marker)) throw new Error(`Missing site metadata: ${marker}`);
}
const header = home.match(/<header id="gh-head"[\s\S]*?<\/header>/)?.[0] || "";
for (const marker of ["Proudly generated by Eleventy (Build Awesome) v", 'href="/feed.xml"', 'href="/feed/feed.rss"', 'href="/feed/feed.json"']) {
	if (!header.includes(marker)) throw new Error(`Missing header publication detail: ${marker}`);
}
const graph = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "null");
const graphTypes = new Set((graph?.["@graph"] || []).map((item) => item["@type"]));
for (const type of ["Organization", "WebSite", "Blog", "Person"]) {
	if (!graphTypes.has(type)) throw new Error(`Missing schema.org ${type} node`);
}
if (!representative.includes('/author/admin/#person')) throw new Error("BlogPosting author does not reference the canonical Person node");
const search = readFileSync(join(output, "search/index.html"), "utf8");
if (!search.includes("<pagefind-input") || search.includes("pagefind-ui.js")) throw new Error("Search is not Pagefind Component UI-only");

console.log(`Verified 279 dated posts, 3 pages, ${terms.size} taxonomies, ${htmlFiles.length} HTML files, Pagefind, redirects, retained assets, and zero broken internal links.`);
