import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the BPL mark, full bleed (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#07371f" }}>
        <svg width="128" height="128" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" fill="#f5b301" />
          <path
            d="M9.3 7c4 5.2 4 12.8 0 18M22.7 7c-4 5.2-4 12.8 0 18"
            fill="none"
            stroke="#0b1510"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="1.8 1.8"
          />
        </svg>
      </div>
    ),
    size,
  );
}
