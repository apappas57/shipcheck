import { ImageResponse } from "next/og";

export const alt = "ShipCheck — pre-flight SEO check for your site";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#090c10",
          backgroundImage:
            "radial-gradient(1000px 500px at 50% -10%, rgba(45,212,212,0.16), transparent)",
          padding: "70px",
          color: "#e9eef4",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#2dd4d4" }}>
          <div
            style={{
              width: 24,
              height: 24,
              backgroundColor: "#2dd4d4",
              borderRadius: 5,
              marginRight: 14,
            }}
          />
          shipcheck
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            Catch the bugs that keep
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            your pages <span style={{ color: "#2dd4d4", marginLeft: 16 }}>out of Google</span>.
          </div>
          <div style={{ marginTop: 28, fontSize: 26, color: "#8593a3" }}>
            Paste a URL. Get the exact Next.js fix. No login.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#5a6675" }}>
          <span style={{ display: "flex", gap: 18 }}>
            <span style={{ color: "#3ddc97" }}>● pass</span>
            <span style={{ color: "#f4b740" }}>● warn</span>
            <span style={{ color: "#fb6a82" }}>● fail</span>
          </span>
          <span>@apappasdev</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
