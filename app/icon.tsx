import { ImageResponse } from "next/og";
import { CAR_BACKGROUND, carDataUri } from "./car-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The browser-tab favicon: the racing car on the dark page colour. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: CAR_BACKGROUND, borderRadius: 14 }}>
        <img src={carDataUri()} width={60} height={21} alt="" />
      </div>
    ),
    size,
  );
}
