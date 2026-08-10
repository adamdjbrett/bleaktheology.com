export default {
	tags: ["posts"],
	layout: "layouts/post.njk",
	eleventyComputed: {
		permalink(data) {
			if (data.permalink) return data.permalink;
			const match = data.page.fileSlug.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
			if (!match) throw new Error(`Post filename must start YYYY-MM-DD: ${data.page.inputPath}`);
			return `/${match[1]}/${match[2]}/${match[3]}/${data.slug || match[4]}/`;
		},
	},
};
