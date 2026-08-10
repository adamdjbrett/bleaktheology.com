import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

let meta = {};
let authors = [];
try {
	meta = loadYaml(readFileSync(fileURLToPath(new URL("./metadata.yaml", import.meta.url)), "utf8")) || {};
	authors = loadYaml(readFileSync(fileURLToPath(new URL("./authors.yaml", import.meta.url)), "utf8")) || [];
} catch {
	meta = {};
	authors = [];
}

const base = String(meta.url || "").replace(/\/+$/, "");
const language = meta.language || "en";
const absolute = (url) => !url || String(url).startsWith("http") ? url : base + url;
const organizationMeta = meta.organization || {};
const organizationId = `${base}/#organization`;
const websiteId = `${base}/#website`;
const blogId = `${base}/#blog`;
const people = authors.map((author) => {
	const url = `${base}/author/${author.slug}/`;
	const person = {
		"@type": "Person",
		"@id": `${url}#person`,
		name: author.name,
		url,
	};
	if (author.bio) person.description = author.bio;
	if (author.profile_image) person.image = absolute(author.profile_image);
	if (author.location) person.homeLocation = { "@type": "Place", name: author.location };
	const profiles = [author.website, author.bluesky, author.instagram, author.mastodon, author.blog].filter(Boolean);
	if (profiles.length) person.sameAs = profiles;
	return person;
});

const organization = {
	"@type": "Organization",
	"@id": organizationId,
	name: organizationMeta.name || meta.title,
	url: organizationMeta.url || `${base}/`,
};
if (meta.logo || meta.icon) organization.logo = { "@type": "ImageObject", url: absolute(meta.logo || meta.icon) };
if (organizationMeta.email) organization.email = organizationMeta.email;
if (organizationMeta.telephone) organization.telephone = organizationMeta.telephone;
if (organizationMeta.address) {
	organization.address = {
		"@type": "PostalAddress",
		streetAddress: organizationMeta.address.street,
		addressLocality: organizationMeta.address.locality,
		addressRegion: organizationMeta.address.region,
		postalCode: organizationMeta.address.postal_code,
		addressCountry: organizationMeta.address.country,
	};
}
const sameAs = (meta.social_accounts || []).map((account) => account.href).filter((href) => /^https?:\/\//.test(href));
if (sameAs.length) organization.sameAs = sameAs;

const publisher = { "@id": organizationId };
const website = {
	"@type": "WebSite",
	"@id": websiteId,
	name: meta.title,
	url: `${base}/`,
	description: meta.description,
	inLanguage: language,
	publisher,
	potentialAction: {
		"@type": "SearchAction",
		target: { "@type": "EntryPoint", urlTemplate: `${base}/search/?q={search_term_string}` },
		"query-input": "required name=search_term_string",
	},
};
const blog = {
	"@type": "Blog",
	"@id": blogId,
	name: meta.title,
	url: `${base}/`,
	description: meta.description,
	inLanguage: language,
	publisher,
	isPartOf: { "@id": websiteId },
};
if (people.length) blog.author = people.map((person) => ({ "@id": person["@id"] }));

export default {
	base,
	language,
	publisher,
	organization,
	website,
	blog,
	people,
	blogId,
	siteGraph: { "@context": "https://schema.org", "@graph": [organization, website, blog, ...people] },
};
