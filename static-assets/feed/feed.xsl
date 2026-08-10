<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:atom="http://www.w3.org/2005/Atom"
    exclude-result-prefixes="atom">
  <xsl:output method="html" encoding="utf-8" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <xsl:variable name="feed-title" select="/atom:feed/atom:title | /rss/channel/title"/>
    <xsl:variable name="feed-description" select="/atom:feed/atom:subtitle | /rss/channel/description"/>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="$feed-title"/> — Web feed</title>
        <style>
          :root { color-scheme: light dark; font-family: Georgia, serif; }
          body { max-width: 48rem; margin: 0 auto; padding: 3rem 1.5rem; line-height: 1.6; }
          header { border-bottom: 1px solid currentColor; margin-bottom: 2rem; padding-bottom: 1.5rem; }
          h1, h2 { line-height: 1.15; }
          article + article { border-top: 1px solid color-mix(in srgb, currentColor 25%, transparent); margin-top: 2rem; padding-top: 2rem; }
          a { color: inherit; text-decoration-thickness: .08em; text-underline-offset: .15em; }
          .meta { font-family: system-ui, sans-serif; font-size: .875rem; opacity: .72; }
        </style>
      </head>
      <body>
        <header>
          <p class="meta">Bleak Theology web feed</p>
          <h1><xsl:value-of select="$feed-title"/></h1>
          <p><xsl:value-of select="$feed-description"/></p>
          <p class="meta">Subscribe by copying this page’s URL into an RSS or Atom reader.</p>
        </header>
        <main>
          <xsl:choose>
            <xsl:when test="/atom:feed">
              <xsl:apply-templates select="/atom:feed/atom:entry"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:apply-templates select="/rss/channel/item"/>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="atom:entry">
    <article>
      <h2><a href="{atom:link[not(@rel) or @rel='alternate'][1]/@href}"><xsl:value-of select="atom:title"/></a></h2>
      <p class="meta"><xsl:value-of select="atom:published"/></p>
      <p><xsl:value-of select="atom:summary"/></p>
    </article>
  </xsl:template>

  <xsl:template match="item">
    <article>
      <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
      <p class="meta"><xsl:value-of select="pubDate"/></p>
      <p><xsl:value-of select="description"/></p>
    </article>
  </xsl:template>
</xsl:stylesheet>
