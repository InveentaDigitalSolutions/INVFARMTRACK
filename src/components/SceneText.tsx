import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/**
 * Text in the 3D scene, drawn on a canvas rather than fetched.
 *
 * This is why the 3D tab was blank in the Power Apps player. drei's `<Text>`
 * is troika-three-text, and troika resolves which font covers which codepoints
 * by fetching an index from cdn.jsdelivr.net at render time. The player sets
 * `connect-src 'none'`, the fetch is refused, the rejection lands inside
 * typesetting, and the whole scene fails to render — not just the labels.
 * Reproduced by serving the build under the player's CSP: with it, a blank
 * canvas; without it, the scene draws.
 *
 * Pointing troika at a self-hosted font does not help either, because it still
 * has to `fetch` that file. Anything that needs the network is the wrong tool
 * inside this sandbox.
 *
 * The browser already has a text rasteriser that needs no network: 2D canvas.
 * Draw the label once, upload it as a texture, and put it on a plane. No
 * fetch, no worker, no font loading — and it looks the same.
 */

/** Fonts arrive after first paint, so a label drawn too early uses the fallback. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => document.fonts?.status === "loaded");
  useEffect(() => {
    if (ready || !document.fonts) return;
    let live = true;
    void document.fonts.ready.then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [ready]);
  return ready;
}

/** Rendered at this many pixels per em, then scaled down to world units. */
const RESOLUTION = 128;

interface Drawn {
  texture: CanvasTexture;
  /** Plane size in world units, for the given fontSize. */
  width: number;
  height: number;
}

function draw(
  text: string,
  fontSize: number,
  color: string,
  weight: number,
  outlineEm: number,
  outlineColor: string
): Drawn | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const font = `${weight} ${RESOLUTION}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);

  const strokePx = outlineEm * RESOLUTION;
  // Real glyph bounds where the browser reports them; the em box is a safe
  // fallback for engines that do not. Descent matters as much as ascent — a
  // canvas sized to the ascent alone cuts the tails off g, y and p.
  const ascent = metrics.actualBoundingBoxAscent || RESOLUTION * 0.82;
  const descent = metrics.actualBoundingBoxDescent || RESOLUTION * 0.24;
  // Some glyphs paint outside the advance width (italics, overhangs), so take
  // the wider of the two rather than trusting `width`.
  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? metrics.width;
  const inkWidth = Math.max(metrics.width, left + right);

  const pad = strokePx + RESOLUTION * 0.16;
  canvas.width = Math.ceil(inkWidth + pad * 2);
  canvas.height = Math.ceil(ascent + descent + pad * 2);

  // Setting width/height resets the context.
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const cx = canvas.width / 2;
  // The alphabetic baseline sits exactly `ascent` below the top of the ink, so
  // the glyphs land inside the box they were measured for. Drawing from the
  // "middle" baseline put them half the ascent-descent difference too low and
  // clipped the bottom of every label.
  const cy = pad + ascent;

  if (strokePx > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = strokePx * 2;
    ctx.strokeText(text, cx, cy);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Labels are read at an angle; smoothing beats crispness here.
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const scale = fontSize / RESOLUTION;
  return { texture, width: canvas.width * scale, height: canvas.height * scale };
}

export interface SceneTextProps {
  children: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Cap height in world units, matching what troika's fontSize meant. */
  fontSize?: number;
  color?: string;
  weight?: number;
  /** In world units, as troika took it. Converted to ems internally. */
  outlineWidth?: number;
  outlineColor?: string;
  renderOrder?: number;
  /** Labels that must stay legible through the beds in front of them. */
  depthTest?: boolean;
}

export default function SceneText({
  children,
  position,
  rotation,
  fontSize = 1,
  color = "#151f2d",
  weight = 600,
  outlineWidth = 0,
  outlineColor = "#ffffff",
  renderOrder,
  depthTest = true,
}: SceneTextProps) {
  const fontsReady = useFontsReady();

  const drawn = useMemo(
    () => draw(children, fontSize, color, weight, fontSize > 0 ? outlineWidth / fontSize : 0, outlineColor),
    // fontsReady is a dependency on purpose: once Inter arrives the label is
    // redrawn in it rather than staying in the fallback face.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, fontSize, color, weight, outlineWidth, outlineColor, fontsReady]
  );

  // A texture holds a GPU allocation; dropping the reference is not enough.
  useEffect(() => () => drawn?.texture.dispose(), [drawn]);

  if (!drawn) return null;

  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[drawn.width, drawn.height]} />
      <meshBasicMaterial
        map={drawn.texture}
        transparent
        depthTest={depthTest}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
