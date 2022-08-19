import * as THREE from "three";
import { GenerateMeshParams } from "./generateMesh";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { Contour, ContourPoint, MultipleGlyphDef, SingleGlyphDef } from "../types";

type GlyphsDefToGeometryParams = {
  depth: number;
  glyphsDef: MultipleGlyphDef;
};

export const glyphsDefToGeometry = ({ depth, glyphsDef }: GlyphsDefToGeometryParams): THREE.BufferGeometry => {
  let geometries: THREE.ExtrudeGeometry[] = [];

  for (let glyphDef of glyphsDef.glyphs) {
    let shapes = glyphDef.paths.map(path => {
      let shape = new THREE.Shape();
      shape.add(path);
      shape.holes = glyphDef.holes;
      return shape;
    });

    let geometry = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 0,
    });

    geometries.push(geometry);
  }

  return mergeBufferGeometries(geometries.flat());
};

type GlyphToShapesParams = {
  glyph: opentype.Glyph;
  scale: number;
  xOffset: number;
  yOffset: number;
};

export const glyphToShapes = ({ glyph, scale, xOffset, yOffset }: GlyphToShapesParams): SingleGlyphDef => {
  // Easy scale & move each point of the glyph according to args
  const coord = (x: number, y: number): [number, number] => [x * scale + xOffset, y * scale + yOffset];

  glyph.getMetrics();
  console.log(glyph.getContours());
  const paths: THREE.Path[] = [];
  const holes: THREE.Path[] = [];
  for (const contour of glyph.getContours() as Contour[]) {
    const path = new THREE.Path();
    let prev: ContourPoint | null = null;
    let curr = contour[contour.length - 1];
    let next = contour[0];
    if (curr.onCurve) path.moveTo(...coord(curr.x, curr.y));
    else {
      if (next.onCurve) path.moveTo(...coord(next.x, next.y));
      else {
        const start = {
          x: (curr.x + next.x) * 0.5,
          y: (curr.y + next.y) * 0.5,
        };
        path.moveTo(...coord(start.x, start.y));
      }
    }

    for (let i = 0; i < contour.length; ++i) {
      prev = curr;
      curr = next;
      next = contour[(i + 1) % contour.length];
      if (curr.onCurve) {
        path.lineTo(...coord(curr.x, curr.y));
      } else {
        let prev2 = prev;
        let next2 = next;
        if (!prev.onCurve) {
          prev2 = {
            x: (curr.x + prev.x) * 0.5,
            y: (curr.y + prev.y) * 0.5,
            onCurve: false,
          };
          path.lineTo(...coord(prev2.x, prev2.y));
        }

        if (!next.onCurve) {
          next2 = {
            x: (curr.x + next.x) * 0.5,
            y: (curr.y + next.y) * 0.5,
            onCurve: false,
          };
        }

        path.lineTo(...coord(prev2.x, prev2.y));
        path.quadraticCurveTo(...coord(curr.x, curr.y), ...coord(next2.x, next2.y));
      }
    }

    path.closePath();
    let sum = 0;
    let lastPoint = contour[contour.length - 1];
    for (const point of contour) {
      sum += (lastPoint.x - point.x) * (point.y + lastPoint.y);
      lastPoint = point;
    }

    if (sum > 0) holes.push(path);
    else paths.push(path);
  }

  return { paths, holes };
};

export const stringToGlyhpsDef = (params: GenerateMeshParams): MultipleGlyphDef => {
  const { font } = params;

  const text = params.text || "Hello George!";
  const size = params.size !== undefined && params.size >= 0 ? params.size : 20;
  const spacing = params.spacing ?? 0.1;
  const vSpacing = params.vSpacing ?? 1;
  const alignment = params.align ?? "left";

  const scale = (1 / font.unitsPerEm) * size;

  const glyphShapes: SingleGlyphDef[] = [];
  // to handle alignment
  const linesWidth: number[] = [];
  const bounds = {
    min: { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
    max: { x: 0, y: 0 },
  };

  const lines = text.split("\n").map(s => s.trimEnd());
  let dy = 0;

  // Iterate a first time on all lines to calculate line width (text align)
  for (const lineText of lines) {
    let dx = 0;
    let lineMaxX = 0;
    font.forEachGlyph(lineText, 0, 0, size, undefined, (glyph, x, y) => {
      x += dx;
      dx += spacing;
      let glyphBounds = glyph.getBoundingBox();

      lineMaxX = x + glyphBounds.x2 * scale;
      const { min, max } = bounds;

      min.x = Math.min(min.x, x + glyphBounds.x1 * scale);
      min.y = Math.min(min.y, y - dy + glyphBounds.y1 * scale);
      max.x = Math.max(max.x, x + glyphBounds.x2 * scale);
      max.y = Math.max(max.y, y - dy + glyphBounds.y2 * scale);
    });

    dy += size + vSpacing;

    // Keep this for each line to handle alignment
    linesWidth.push(lineMaxX);
  }

  const linesAlignOffset = linesWidth.map(() => 0);

  // Handle alignment (now we know all line size)
  if (alignment !== "left") {
    const maxWidth = Math.max(...linesWidth);

    linesWidth.forEach((lineWidth, line) => {
      if (lineWidth !== maxWidth) {
        let xOffset = (maxWidth - lineWidth) / (alignment === "center" ? 2 : 1);
        linesAlignOffset[line] = xOffset;
      }
    });
  }

  dy = 0;

  for (const lineIndex in lines) {
    const lineText = lines[lineIndex];
    let dx = 0;

    // Iterate on text char to generate a Geometry for each
    font.forEachGlyph(lineText, 0, 0, size, undefined, (glyph, x, y) => {
      x += dx + linesAlignOffset[lineIndex];

      glyphShapes.push(glyphToShapes({ glyph, scale, xOffset: x, yOffset: y - dy }));
      dx += spacing;
    });

    dy += size + vSpacing;
  }

  return { glyphs: glyphShapes, bounds };
};
