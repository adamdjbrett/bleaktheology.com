require "date"
require "pathname"
require "psych"
require "rexml/document"
require "uri"

def front_matter(path)
  source = path.read
  header = source[/\A---\s*\n(.*?)\n---\s*\n/m, 1] or abort "Missing front matter: #{path}"
  Psych.safe_load(header, permitted_classes: [Date, Time], aliases: true)
end

def normalized(value)
  value.to_s.gsub(/[“”]/, '"').gsub(/[‘’]/, "'").gsub(/[–—]/, "-").gsub("…", "...").gsub(/\s+/, " ").strip
end

xml = REXML::Document.new(File.read("bleaktheology.WordPress.2026-08-07.xml"))
items = []
REXML::XPath.each(xml, "//item") do |item|
  next unless item.elements["wp:status"]&.text == "publish"
  items << item if %w[post page].include?(item.elements["wp:post_type"]&.text)
end

posts = Pathname("src/posts").glob("*.html").to_h do |path|
  data = front_matter(path)
  [data.fetch("permalink"), [path, data]]
end
xml_posts = items.select { |item| item.elements["wp:post_type"].text == "post" }
abort "WordPress/source post count mismatch: #{xml_posts.length}/#{posts.length}" unless xml_posts.length == 279 && posts.length == 279

xml_posts.each do |item|
  url = URI(item.elements["link"].text).path.sub(%r{(?<!/)\z}, "/")
  path, data = posts.fetch(url) { abort "Missing source post for #{url}" }
  title = item.elements["title"]&.text.to_s
  actual_title = data.fetch("wordpress_title", data.fetch("title"))
  abort "Title drift at #{url}" unless normalized(actual_title) == normalized(title)
  date = item.elements["wp:post_date"].text.split.first.tr("-", "/")
  abort "Date drift at #{url}" unless url.start_with?("/#{date}/")
  expected = Hash.new { |hash, key| hash[key] = [] }
  item.elements.each("category") do |term|
    expected[term.attributes["domain"]] << term.text.to_s if %w[category post_tag].include?(term.attributes["domain"])
  end
  actual = {
    "category" => data.fetch("categories", []).map { |term| term.fetch("name") },
    "post_tag" => data.fetch("postTags", []).map { |term| term.fetch("name") }
  }
  actual.each { |type, names| abort "#{type} drift at #{url}" unless names.sort == expected[type].sort }
  abort "Missing built post #{url}" unless Pathname("_site").join(url.delete_prefix("/"), "index.html").file?
end

%w[about-bleak-theology podcast other-writings-in-other-places].each do |slug|
  item = items.find { |entry| entry.elements["wp:post_type"].text == "page" && entry.elements["wp:post_name"]&.text == slug }
  abort "Missing WordPress page #{slug}" unless item
  data = front_matter(Pathname("src/pages/#{slug}.html"))
  abort "Page title drift: #{slug}" unless data.fetch("title") == item.elements["title"]&.text.to_s
end

puts "Verified 279 posts and 3 pages against the WordPress XML export"
