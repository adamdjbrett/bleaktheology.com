// Drafts remain editable in Pages CMS but never receive output URLs or appear
// in Eleventy collections. The build preprocessor also skips their rendering.
export default {
	permalink: false,
	eleventyExcludeFromCollections: true,
};
