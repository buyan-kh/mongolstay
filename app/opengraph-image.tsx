import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mongolstay — immigration filings, one click each";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0B1220",
          color: "#FFFFFF",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#FFFFFF",
              color: "#0B1220",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontStyle: "italic",
            }}
          >
            M
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
            mongolstay
            <span style={{ color: "#5A6478", fontWeight: 400 }}>.com</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2, fontStyle: "italic" }}>
            Submit in 4 minutes.
          </div>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>
            Pay. <span style={{ color: "#1F4FFF", fontStyle: "italic" }}>Done.</span>
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#8A93A6", fontFamily: "sans-serif" }}>
          J-1 → F-1 · B-1/B-2 → F-1 · Asylum · Licensed attorneys
        </div>
      </div>
    ),
    size,
  );
}
