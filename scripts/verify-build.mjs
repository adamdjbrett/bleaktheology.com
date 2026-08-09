import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const source = "src/public";
const output = "_site";
const files = (root) => readdirSync(root, { recursive: true }).filter((name) => statSync(join(root, name)).isFile());
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const forbidden = /i\d\.wp\.com|widgets\.wp\.com|stats\.wp\.com|jetpack\.wordpress\.com|public-api\.wordpress\.com|v0\.wordpress\.com|s0\.wp\.com|\/wp-content\/plugins\/jetpack|secure\.gravatar\.com\/js\/gprofiles/i;

for (const root of [source, output]) {
  for (const name of files(root).filter((name) => /\.(?:css|html|js|json|txt|xml)$/i.test(name))) {
    if (forbidden.test(readFileSync(join(root, name), "utf8"))) throw new Error(`Forbidden Jetpack dependency: ${root}/${name}`);
  }
}

for (const name of files(source)) {
  if (["author/", "category/", "page/"].some((prefix) => name.startsWith(prefix))) continue;
  const target = join(output, name);
  if (!existsSync(target)) throw new Error(`Missing preserved file: /${name}`);
  if (digest(join(source, name)) !== digest(target)) throw new Error(`Changed preserved file: /${name}`);
}

const urls = readFileSync("src/_data/urls.txt", "utf8").trim().split(/\r?\n/);
for (const value of urls) {
  const pathname = new URL(value).pathname;
  if (!existsSync(join(output, pathname, "index.html"))) throw new Error(`Missing canonical URL: ${pathname}`);
}

const archive = JSON.parse(readFileSync("src/_data/archive.json", "utf8"));
for (const post of archive.posts) {
  if (!/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(post.url)) throw new Error(`Post URL drift: ${post.url}`);
}
for (const term of archive.posts.flatMap((post) => [...post.categories, ...post.tags])) {
  if (!existsSync(join(output, term.url, "index.html"))) throw new Error(`Missing taxonomy URL: ${term.url}`);
}

const missingLinks = new Set();
for (const name of files(output).filter((name) => name.endsWith(".html"))) {
  const html = readFileSync(join(output, name), "utf8");
  for (const match of html.matchAll(/(?:<a\b[^>]*\bhref|<(?:img|audio|video|source)\b[^>]*\b(?:src|poster))=["']([^"']+)/gi)) {
    const value = match[1].replaceAll("&amp;", "&");
    if (/^(#|mailto:|tel:|javascript:|data:)/.test(value)) continue;
    if (/^\/\/(?:author|category|page|tag|\d{4})\//.test(value)) {
      missingLinks.add(value);
      continue;
    }
    let url;
    try { url = new URL(value, `https://www.bleaktheology.com/${name.replace(/index\.html$/, "")}`); } catch { continue; }
    if (!["bleaktheology.com", "www.bleaktheology.com"].includes(url.hostname)) continue;
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
    const target = join(output, pathname);
    const found = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, "index.html")));
    if (!found) missingLinks.add(pathname);
  }
}
if (missingLinks.size) throw new Error(`Broken internal links: ${[...missingLinks].join(", ")}`);

console.log(`Verified ${urls.length} canonical URLs, ${archive.posts.length} posts, byte-identical archived HTML/assets, and zero broken internal links.`);
