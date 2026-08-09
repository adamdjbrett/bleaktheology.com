require "json"
require "nokogiri"
require "pathname"
require "uri"

root = Pathname("src/public")

def wordpress_path(href, type)
  path = URI(href).path
  path = path[path.index("/#{type}/")..] if path.include?("/#{type}/")
  path.sub(%r{index\.html$}, "").sub(%r{(?<!/)$}, "/")
end

posts = root.glob("[0-9][0-9][0-9][0-9]/[0-9][0-9]/[0-9][0-9]/*/index.html").sort.map do |path|
  document = Nokogiri::HTML(path.read)
  article = document.at_css('article.typology-single-post[id^="post-"]') or abort "Missing article: #{path}"
  schema = JSON.parse(document.at_css("script.aioseo-schema").text).fetch("@graph")
  posting = schema.find { |node| node["@type"] == "BlogPosting" } or abort "Missing BlogPosting: #{path}"
  relative = path.relative_path_from(root).to_s.delete_suffix("index.html")
  title = document.at_css("#typology-cover h1.entry-title")&.text&.strip.to_s
  categories = document.css("#typology-cover .meta-item.meta-category a").map do |link|
    { "name" => link.text.strip, "url" => wordpress_path(link["href"], "category") }
  end.uniq
  tags = article.css('.entry-content .entry-tags a[rel="tag"]').map do |link|
    { "name" => link.text.strip, "url" => wordpress_path(link["href"], "tag") }
  end.uniq
  excerpt = document.at_css('meta[name="description"]')&.[]("content").to_s
  {
    "title" => title,
    "displayTitle" => title.empty? ? excerpt.split(/[.!?]/, 2).first.to_s : title,
    "date" => posting.fetch("datePublished"),
    "url" => "/#{relative}",
    "slug" => path.dirname.basename.to_s,
    "postId" => article["id"],
    "author" => "Burke",
    "categories" => categories,
    "tags" => tags,
    "excerpt" => excerpt
  }
end

page_paths = %w[about-bleak-theology podcast other-writings-in-other-places]
pages = page_paths.map do |slug|
  document = Nokogiri::HTML(root.join(slug, "index.html").read)
  { "title" => document.at_css("h1.entry-title")&.text&.strip.to_s, "url" => "/#{slug}/", "slug" => slug }
end

abort "Expected 279 posts, found #{posts.length}" unless posts.length == 279
File.write("src/_data/archive.json", JSON.pretty_generate({ "posts" => posts, "pages" => pages }) + "\n")
puts "Imported #{posts.length} posts, #{pages.length} pages, #{posts.flat_map { |p| p['categories'] }.map { |c| c['url'] }.uniq.length} categories, #{posts.flat_map { |p| p['tags'] }.map { |t| t['url'] }.uniq.length} tags"
