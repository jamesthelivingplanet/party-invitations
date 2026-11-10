import { Fragment, type ReactNode } from "react";
import { CarBody, CarDefs, Wheel } from "./racing-car";

const KEEP_CASE = new Set(["viewBox", "preserveAspectRatio"]);
const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * Turns the car's SVG elements into SVG text. The car components are plain functions with no hooks, so
 * they are called directly (react-dom/server may not be imported inside app/ routes).
 */
function toSvg(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return escape(String(node));
  if (Array.isArray(node)) return node.map(toSvg).join("");
  const el = node as { type: unknown; props: Record<string, unknown> };
  const { children, ...rest } = el.props;
  const props = Object.fromEntries(Object.entries(rest).filter(([k]) => k !== "className"));
  if (el.type === Fragment) return toSvg(children as ReactNode);
  if (typeof el.type === "function") return toSvg((el.type as (p: unknown) => ReactNode)(el.props));
  const attrs = Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${KEEP_CASE.has(k) ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${escape(String(v))}"`)
    .join("");
  return `<${String(el.type)}${attrs}>${toSvg(children as ReactNode)}</${String(el.type)}>`;
}

/**
 * The same racing car as the hero, as a standalone SVG data URI, for the generated favicon, app icon and
 * link-preview image (ImageResponse draws it through an <img>). Same components, so it is the same car.
 */
export function carDataUri(): string {
  const svg = toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 14 218 78">
      <defs>
        <CarDefs />
      </defs>
      <CarBody emblem="planet" />
      <Wheel cx={44} cy={66} r={22} />
      <Wheel cx={160} cy={71} r={17} />
    </svg>,
  );
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const CAR_BACKGROUND = "#18181b";
