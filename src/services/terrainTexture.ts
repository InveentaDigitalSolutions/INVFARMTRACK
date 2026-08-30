/**
 * The survey's contours, drawn flat on the shadehouse floor.
 *
 * Deliberately two-dimensional: the ground stays a plane and the topography is
 * painted onto it, the way a contour overlay sits on a site plan. Displacing
 * the floor would move every bed with it and put the layout back in question,
 * and the layout is settled.
 *
 * Drawn to a canvas rather than as three.js lines for two reasons: a canvas
 * gives real line weights (WebGL line width is 1px on most platforms whatever
 * you ask for), and the whole overlay becomes one texture — one draw call
 * instead of several thousand segments.
 *
 * **Scale.** The survey grid covers the whole existing nursery footprint,
 * which is larger than the block of 120 beds modelled here, so the heights are
 * stretched onto the modelled floor. Where the high and low ground lies is
 * right; a distance measured off this overlay is not.
 */

import { contourSegments, elevationAt, relativeHeight } from "./terrain";

/** Pixels across the drawn texture. Enough for readable labels at any zoom. */
const SIZE = 1024;

/** Contours every half metre, with every whole metre picked out. */
const INTERVAL = 0.5;

/**
 * Low ground reads cool and damp, high ground warm and dry — the convention on
 * a hypsometric plan, and the way the nursery talks about where water sits.
 */
function tint(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [122, 148, 154]],
    [0.5, [166, 178, 150]],
    [1.0, [198, 176, 132]],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [hi, cHi] = stops[i];
    const [lo, cLo] = stops[i - 1];
    if (t <= hi) {
      const f = (t - lo) / (hi - lo);
      return [0, 1, 2].map((k) => Math.round(cLo[k] + (cHi[k] - cLo[k]) * f)) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Paint the overlay. Returns null where there is no 2D canvas — the smoke
 * test's probes and any non-browser render — so the caller draws plain ground
 * rather than failing.
 */
export function drawTerrainOverlay(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // The height wash, one pixel per sample of a coarse grid then smoothed by
  // the texture filter — far cheaper than shading every pixel.
  const CELLS = 128;
  const cell = SIZE / CELLS;
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      const h = elevationAt((x + 0.5) / CELLS, (y + 0.5) / CELLS);
      const [r, g, b] = tint(relativeHeight(h));
      ctx.fillStyle = `rgb(${r} ${g} ${b})`;
      // A half-pixel overlap, or the seams between cells show as a grid.
      ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
    }
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const contours = contourSegments(INTERVAL);
  for (const contour of contours) {
    // An index contour every whole metre, heavier and labelled, with the half
    // metres finer between them. Without the distinction the overlay reads as
    // one grey mat.
    const index = Math.abs(contour.level - Math.round(contour.level)) < 1e-6;
    ctx.strokeStyle = index ? "rgba(40,52,44,0.72)" : "rgba(40,52,44,0.32)";
    ctx.lineWidth = index ? 2.4 : 1.2;

    ctx.beginPath();
    for (const s of contour.segments) {
      ctx.moveTo(s.u0 * SIZE, s.v0 * SIZE);
      ctx.lineTo(s.u1 * SIZE, s.v1 * SIZE);
    }
    ctx.stroke();
  }

  // Label the index contours. One label per line, on its longest segment, so
  // the number sits on a run of line rather than in a corner.
  ctx.font = `600 17px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const contour of contours) {
    if (Math.abs(contour.level - Math.round(contour.level)) > 1e-6) continue;

    let longest = contour.segments[0];
    let best = -1;
    for (const s of contour.segments) {
      const d = Math.hypot(s.u1 - s.u0, s.v1 - s.v0);
      if (d > best) { best = d; longest = s; }
    }
    if (!longest) continue;

    const x = ((longest.u0 + longest.u1) / 2) * SIZE;
    const y = ((longest.v0 + longest.v1) / 2) * SIZE;
    const text = `${contour.level.toFixed(0)}`;

    // Break the line behind the number so it reads, as a surveyor's plan does.
    const w = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(233,236,228,0.92)";
    ctx.fillRect(x - w / 2 - 4, y - 10, w + 8, 20);
    ctx.fillStyle = "rgba(32,44,36,0.95)";
    ctx.fillText(text, x, y);
  }

  return canvas;
}
