import { archivePage } from "./_includes/archive-page.js";

export default class {
  data() {
    return {
      pagination: { data: "collections.archivePages", size: 1, alias: "taxonomy" },
      permalink: (data) => `${data.taxonomy.outputUrl}index.html`,
      eleventyExcludeFromCollections: true
    };
  }

  render({ taxonomy, metadata }) {
    return archivePage(taxonomy, metadata);
  }
}
