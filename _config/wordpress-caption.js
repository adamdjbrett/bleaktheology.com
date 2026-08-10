export function convertWordPressCaptions(markdown) {
	return String(markdown).replace(
		/\[caption(?:\s+[^\]]*)?\]\s*(<img\b[^>]*>)\s*([\s\S]*?)\s*\[\/caption\]/gi,
		'<figure class="wp-caption">$1<figcaption>$2</figcaption></figure>',
	);
}
