function escape(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export default class {
  data() {
    return {
      pagination: { data: "redirects", size: 1, alias: "redirect" },
      permalink: (data) => data.redirect.url.endsWith("/") ? `${data.redirect.url}index.html` : data.redirect.url,
      eleventyAllowMissingExtension: true,
      eleventyExcludeFromCollections: true
    };
  }

  render({ redirect, metadata }) {
    const target = escape(redirect.target);
    return `<!doctype html><html lang="${escape(metadata.language)}"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"><title>Moved - ${escape(metadata.title)}</title></head><body><p><a href="${target}">Continue to ${escape(metadata.title)}</a></p></body></html>`;
  }
}
