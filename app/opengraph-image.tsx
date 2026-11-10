import { ImageResponse } from "next/og";
import { CAR_BACKGROUND, carDataUri } from "./car-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A racing car";

/** The picture shown when the link is shared in a chat or on social media. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: CAR_BACKGROUND }}>
        <img src={carDataUri()} width={1040} height={363} alt="" />
      </div>
    ),
    size,
  );
}
