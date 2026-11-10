import { ImageResponse } from "next/og";
import { CAR_BACKGROUND, carDataUri } from "./car-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon for "Add to Home Screen" on iPhones. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: CAR_BACKGROUND }}>
        <img src={carDataUri()} width={164} height={57} alt="" />
      </div>
    ),
    size,
  );
}
