import { readFileSync } from "node:fs";

const source = readFileSync("src/public/index.html", "utf8");
const sectionStart = source.indexOf('<div class="section-content section-content-c">');
const footerStart = source.indexOf('<footer id="typology-footer"');

function escape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function rootRelative(html) {
  return html.replace(/\b(href|src)=(['"])(?!https?:|\/|#|data:|mailto:|tel:|javascript:)([^'"]+)\2/gi, (_match, attr, quote, value) => {
    const clean = value.replace(/^(?:\.\.\/)+/, "").replace(/^\.\//, "");
    return `${attr}=${quote}/${clean}${quote}`;
  });
}

function card(post, metadata) {
  const categories = (post.categories || []).map((item) => `<a href="${escape(item.url)}" rel="category tag">${escape(item.name)}</a>`).join(", ");
  return `<article class="typology-post typology-layout-c col-lg-6 text-center post-image-off"><header class="entry-header"><h2 class="entry-title h4"><a href="${escape(post.url)}">${escape(post.displayTitle || post.title || "Untitled")}</a></h2><div class="entry-meta"><div class="meta-item meta-author">By ${escape(metadata.author.name)}</div>${categories ? `<div class="meta-item meta-category">In ${categories}</div>` : ""}<div class="meta-item meta-date"><time datetime="${escape(post.date)}">${escape(post.date.slice(0, 10))}</time></div></div><div class="post-letter">${escape((post.displayTitle || post.title || "U").trim().at(0) || "U")}</div></header></article>`;
}

export function archivePage(page, metadata) {
  const title = `${page.type}: ${page.name}`;
  const previous = page.pageNumber > 1 ? (page.pageNumber === 2 ? page.url : `${page.url}page/${page.pageNumber - 1}/`) : "";
  const next = page.pageNumber < page.pageCount ? `${page.url}page/${page.pageNumber + 1}/` : "";
  const navigation = previous || next ? `<div class="typology-pagination"><nav class="navigation"><div class="nav-links">${previous ? `<a class="prev" href="${previous}">Previous</a>` : ""}${next ? `<a class="next" href="${next}">Next</a>` : ""}</div></nav></div>` : "";
  const content = `<div class="section-content section-content-c"><div class="typology-posts">${page.posts.map((post) => card(post, metadata)).join("\n")}</div>${navigation}</div></div>`;
  let html = source.slice(0, sectionStart) + content + source.slice(footerStart);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)} - ${escape(metadata.title)}</title>`);
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escape(metadata.url)}${escape(page.outputUrl)}" />`);
  html = html.replace(/<link rel="next"[^>]*>\s*/, next ? `<link rel="next" href="${escape(metadata.url)}${escape(next)}" />\n` : "");
  html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escape(metadata.url)}${escape(page.outputUrl)}" />`);
  html = html.replace('<h1 class="entry-title">Latest stories</h1>', `<h1 class="entry-title">${escape(title)}</h1>`);
  html = html.replace('<div class="cover-letter">L</div>', `<div class="cover-letter">${escape(page.type.at(0))}</div>`);
  return rootRelative(html);
}
