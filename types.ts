import * as THREE from "three";

export enum ModelType {
  TextOnly = 1,
  TextWithSupport = 2,
  NegativeText = 3,
  VerticalTextWithSupport = 4,
}

export interface ContourPoint {
  x: number;
  y: number;
  onCurve: boolean;
}

export type Contour = ContourPoint[];

export type SingleGlyphDef = {
  paths: THREE.Path[];
  holes: THREE.Path[];
};

export type MultipleGlyphDef = {
  glyphs: SingleGlyphDef[];
  bounds: {
    min: { x: number; y: number };
    max: { x: number; y: number };
  };
};
