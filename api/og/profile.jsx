import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const TIER_COLORS = {
  PRO: ["#8B7240", "#D4AF78"],
  ENTERPRISE: ["#6B5530", "#BFA264"],
  ESSENTIAL: ["#222", "#444"],
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("n") || "Operator";
  const score = parseInt(searchParams.get("s") || "0");
  const domain = searchParams.get("d") || "General";
  const tier = searchParams.get("t") || "ESSENTIAL";
  const level = parseInt(searchParams.get("l") || "1");
  const [c1, c2] = TIER_COLORS[tier] || TIER_COLORS.ESSENTIAL;

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#030303",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid lines */}
      {[0.2, 0.5, 0.8].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${p * 100}%`,
            width: "0.5px",
            background: "rgba(191,162,100,0.08)",
          }}
        />
      ))}
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "600px",
          background:
            "radial-gradient(ellipse, rgba(191,162,100,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "60px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "60px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: "#BFA264",
              textTransform: "uppercase",
            }}
          >
            DISCOTIVE
          </div>
          <div
            style={{
              flex: 1,
              height: "0.5px",
              background:
                "linear-gradient(90deg, rgba(191,162,100,0.4), transparent)",
            }}
          />
        </div>
        {/* Main */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "48px",
            flex: 1,
          }}
        >
          {/* Avatar placeholder */}
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "32px",
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "64px",
              fontWeight: 900,
              color: "#000",
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.3em",
                color: "#BFA264",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              {tier} · LEVEL {level} OPERATOR
            </div>
            <div
              style={{
                fontSize: "64px",
                fontWeight: 900,
                color: "#F5F0E8",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                marginBottom: "12px",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "rgba(245,240,232,0.4)",
                fontWeight: 300,
                marginBottom: "32px",
              }}
            >
              {domain}
            </div>
            {/* Score pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 24px",
                background: "rgba(191,162,100,0.08)",
                border: "1px solid rgba(191,162,100,0.25)",
                borderRadius: "16px",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4ADE80",
                }}
              />
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#BFA264",
                  letterSpacing: "0.1em",
                }}
              >
                DISCOTIVE SCORE
              </span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#F5F0E8",
                  fontFamily: "monospace",
                }}
              >
                {score.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "32px",
            borderTop: "0.5px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            discotive.in/@
            {(name || "operator").toLowerCase().replace(/\s+/g, "")}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#BFA264",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            The Career Engine
          </span>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, s-maxage=86400, max-age=86400",
      },
    },
  );
}
