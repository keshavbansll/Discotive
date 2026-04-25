/**
 * @fileoverview /api/scrape-og — Discotive Zeitgeist Metadata Scraper
 * @runtime Vercel Edge (preferred) — Node.js fallback
 * @description Bypasses client-side CORS. Parses OG + Twitter meta from any URL.
 *              Cached heavily to minimize cold-fetch spend on reads.
 *
 * Cache Strategy: s-maxage=86400 (24hr CDN), stale-while-revalidate=3600 (1hr SWR)
 * Timeout: 2.5s hard abort — graceful fallback enforced on client side.
 */

export const config = { runtime: "edge" };

const PLATFORM_MAP = {
  "twitter.com": "twitter",
  "x.com": "twitter",
  "linkedin.com": "linkedin",
  "instagram.com": "instagram",
  "github.com": "github",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
};

function detectPlatform(urlStr) {
  try {
    const host = new URL(urlStr).hostname.replace("www.", "");
    for (const [key, val] of Object.entries(PLATFORM_MAP)) {
      if (host.includes(key)) return val;
    }
    return "external";
  } catch {
    return "external";
  }
}

function extractMeta(html, urlStr) {
  const get = (pattern) => {
    const m = html.match(pattern);
    return m
      ? m[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .trim()
      : null;
  };

  const title =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    get(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<title[^>]*>([^<]+)<\/title>/i) ||
    null;

  const description =
    get(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{0,300})["']/i,
    ) ||
    get(
      /<meta[^>]+content=["']([^"']{0,300})["'][^>]+property=["']og:description["']/i,
    ) ||
    get(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i,
    ) ||
    null;

  const image =
    get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    get(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    null;

  const siteName =
    get(
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    get(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    ) ||
    null;

  // Twitter-specific: author handle
  const twitterCreator =
    get(
      /<meta[^>]+name=["']twitter:creator["'][^>]+content=["']([^"']+)["']/i,
    ) || null;

  return {
    title,
    description,
    image,
    siteName,
    twitterCreator,
    platform: detectPlatform(urlStr),
    url: urlStr,
    scrapedAt: Date.now(),
  };
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Security: only allow http/https
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Protocol not allowed");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2400); // 2.4s — gives 100ms buffer before client 2.5s timeout

  try {
    const res = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Discotivebot/1.0; +https://discotive.in)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: `Upstream returned ${res.status}`,
          platform: detectPlatform(targetUrl),
          url: targetUrl,
        }),
        {
          status: 200, // Return 200 so client can show fallback gracefully
          headers: responseHeaders(),
        },
      );
    }

    // Only read first 50KB — meta tags are always in the <head>
    const reader = res.body?.getReader();
    let html = "";
    let bytes = 0;
    const MAX = 50 * 1024;

    if (reader) {
      const decoder = new TextDecoder();
      while (bytes < MAX) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytes += value.byteLength;
        // Stop once we've passed </head> — no need for body
        if (html.includes("</head>") || html.includes("<body")) break;
      }
      reader.cancel();
    }

    const meta = extractMeta(html, parsedUrl.href);

    return new Response(JSON.stringify(meta), {
      status: 200,
      headers: responseHeaders(),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: isTimeout ? "timeout" : "fetch_failed",
        platform: detectPlatform(targetUrl),
        url: targetUrl,
      }),
      {
        status: 200,
        headers: responseHeaders(),
      },
    );
  }
}

function responseHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    "Access-Control-Allow-Origin": "*",
  };
}
