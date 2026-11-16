import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#060d1f",
        }}
      >
        {/* Scudo / Medaglione Blu Notte con Bordo Oro */}
        <div
          style={{
            width: "420px",
            height: "420px",
            borderRadius: "100px",
            border: "16px solid #f59e0b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a152e",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          }}
        >
          {/* Stella d'oro in cima */}
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>⭐</div>
          {/* Forchetta e Coltello Stemma Oro */}
          <div style={{ fontSize: "190px", display: "flex" }}>🍽️</div>
        </div>
      </div>
    ),
    { ...size }
  );
}