export default {
	tags: ["pages"],
	layout: "layouts/page.njk",
	permalink: "/{{ slug or page.fileSlug }}/",
};
