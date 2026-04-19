/* eslint-env node */
/* global process */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SITE_URL = process.env.VITE_SITE_URL || "https://discotive.in";

const initAdmin = () => {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
};

// Explicitly define as standard Node.js serverless function to prevent Vercel auto-Edge inference
export const config = {
  runtime: "nodejs",
};

export default async function handler(req) {
  const url = new URL(req.url);
  const handle = url.searchParams.get("handle")?.toLowerCase().replace("@", "");
  if (!handle) return new Response("Not found", { status: 404 });

  try {
    initAdmin();
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .where("identity.username", "==", handle)
      .limit(1)
      .get();

    if (snap.empty)
      return new Response(fallbackHTML(SITE_URL), { headers: htmlHeaders() });

    const data = snap.docs[0].data();
    const uid = snap.docs[0].id;
    const name =
      `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim();
    const domain = data.identity?.domain || data.vision?.passion || "Operator";
    const score = data.discotiveScore?.current ?? 0;
    const tier = data.tier || "ESSENTIAL";
    const level = Math.min(Math.floor(score / 1000) + 1, 10);
    const avatar = data.identity?.avatarUrl || "";
    const bio =
      data.footprint?.bio ||
      data.professional?.bio ||
      `Level ${level} ${domain} operator on Discotive.`;

    const title = `${name} | Level ${level} ${domain} — Discotive`;
    const desc = `${bio.slice(0, 140)} · Discotive Score: ${score.toLocaleString()} · ${tier}`;
    const ogImg = `${SITE_URL}/api/og/profile?uid=${uid}&n=${encodeURIComponent(name)}&s=${score}&d=${encodeURIComponent(domain)}&t=${tier}&l=${level}`;

    const indexHTML = await fetch(`${SITE_URL}/index.html`)
      .then((r) => r.text())
      .catch(() => null);
    const base = indexHTML || DEFAULT_HTML;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        name: name,
        alternateName: handle,
        description: desc,
        jobTitle: domain,
        url: `${SITE_URL}/@${handle}`,
        image: avatar || ogImg,
      },
    };

    const injected = base
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(
        "</head>",
        `
      <meta name="description" content="${esc(desc)}" />
      <meta property="og:title" content="${esc(title)}" />
      <meta property="og:description" content="${esc(desc)}" />
      <meta property="og:image" content="${ogImg}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content="${SITE_URL}/@${handle}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${esc(title)}" />
      <meta name="twitter:description" content="${esc(desc)}" />
      <meta name="twitter:image" content="${ogImg}" />
      <link rel="canonical" href="${SITE_URL}/@${handle}" />
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      </head>`,
      );

    return new Response(injected, { headers: htmlHeaders() });
  } catch (error) {
    console.error("[Profile Meta Edge Error]:", error);
    return new Response(fallbackHTML(SITE_URL), { headers: htmlHeaders() });
  }
}

const esc = (s) =>
  String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlHeaders = () => ({
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
});
const fallbackHTML = (base) => `<!DOCTYPE html><html><head>
  <title>Discotive | Unified Career Engine</title>
  <meta name="description" content="The Career OS for elite operators." />
  <meta property="og:title" content="Discotive | Unified Career Engine" />
  <meta property="og:image" content="${base}/og-default.png" />
  <script>window.location.href="/";</script>
</head><body></body></html>`;

const DEFAULT_HTML =
  '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';
