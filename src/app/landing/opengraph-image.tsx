import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "GameProgress — Tracker de progression sociale gamifié";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "Logo.png"), "base64");
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0a1e 0%, #1a1035 40%, #2d1b69 100%)",
        }}
      >
        <img src={logoSrc} width="160" height="160" style={{ marginBottom: 32 }} />
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 12,
            display: "flex",
          }}
        >
          GameProgress
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#c4b5fd",
            maxWidth: 800,
            textAlign: "center",
            display: "flex",
          }}
        >
          Tracker de progression sociale gamifié
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#8b7ec8",
            marginTop: 16,
            display: "flex",
          }}
        >
          XP · Missions · Badges · Pipeline CRM
        </div>
      </div>
    ),
    { ...size }
  );
}
