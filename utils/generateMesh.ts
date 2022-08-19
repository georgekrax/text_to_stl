import * as opentype from "opentype.js";
import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { generateSupportShape, glyphsDefToGeometry, stringToGlyhpsDef } from ".";
import { ModelType } from "../types";

const extrudeGeometryOptions = {
  bevelEnabled: true,
  bevelThickness: 0,
  bevelSize: 0,
  bevelOffset: 0,
  bevelSegments: 0,
};

const translatePath = (path: THREE.Path, x: number, y: number) => {
  return new THREE.Path(path.getPoints().map(p => new THREE.Vector2(p.x + x, p.y + y)));
};

export type GenerateMeshParams = {
  type: ModelType;
  font: opentype.Font;
  text: string;
  size?: number;
  height?: number;
  spacing?: number;
  vSpacing?: number;
  align?: "left" | "center" | "right";
  supportHeight?: number;
  supportBorderRadius?: number;
  supportPadding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
};

type GenerateMeshReturnType = {
  textGeometry?: THREE.BufferGeometry;
  supportGeometry?: THREE.BufferGeometry;
  dimensions: {
    width: number;
    height: number;
    borderRadius: number;
    textWidth: number;
    textHeight: number;
    textDepth: number;
  };
};

export const generateMesh = (params: GenerateMeshParams): GenerateMeshReturnType => {
  const type = params.type || ModelType.TextWithSupport;

  const textDepth = params.height !== undefined && params.height >= 0 ? params.height : 50;

  const glyphsDef = stringToGlyhpsDef(params);

  const { min, max } = glyphsDef.bounds;
  const size = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: textDepth,
  };

  // Support settings
  let supportDepth = params.supportHeight ?? 10;
  const supportPadding = params.supportPadding ?? { top: 10, bottom: 10, left: 10, right: 10 };
  const fullDimensions: Pick<GenerateMeshReturnType["dimensions"], "width" | "height" | "borderRadius"> = {
    width: size.x + supportPadding.left + supportPadding.right,
    height: size.y + supportPadding.top + supportPadding.bottom,
    borderRadius: params.supportBorderRadius !== undefined ? params.supportBorderRadius : 10,
  };

  const supportShape: THREE.Shape | undefined =
    type !== ModelType.TextOnly
      ? generateSupportShape({
          ...fullDimensions,
          ...(type === ModelType.VerticalTextWithSupport && {
            height: size.z + supportPadding.top + supportPadding.bottom,
          }),
        })
      : undefined;

  let textGeometry: GenerateMeshReturnType["textGeometry"];
  let supportGeometry: GenerateMeshReturnType["supportGeometry"];

  const moveTextX = -min.x + supportPadding.left;
  const moveTextY = -min.y + supportPadding.bottom;

  if (type === ModelType.NegativeText) {
    // Ensure support height is equal or greater than text height
    if (supportDepth < size.z) supportDepth += size.z - supportDepth;

    if (supportDepth > textDepth) {
      const plainSupportDepth = supportDepth - textDepth;

      supportGeometry = new THREE.ExtrudeGeometry(supportShape, {
        ...extrudeGeometryOptions,
        depth: plainSupportDepth,
      });
    }

    // extract glyph path & move them according to support padding
    const glyphsPaths = glyphsDef.glyphs
      .map(g => g.paths)
      .flat()
      .map(p => translatePath(p, moveTextX, moveTextY));
    const glyphsHolesPaths = glyphsDef.glyphs
      .map(g => g.holes)
      .flat()
      .map(p => translatePath(p, moveTextX, moveTextY));

    // Add Glyph paths as hole in support & extrude
    supportShape?.holes.push(...glyphsPaths);
    const negativeTextGeometry = new THREE.ExtrudeGeometry(supportShape, {
      ...extrudeGeometryOptions,
      depth: textDepth,
    });

    // Extrude glyph holes as geometry
    const glyphsHolesShapes = glyphsHolesPaths.map(path => {
      const s = new THREE.Shape();
      s.add(path);
      return s;
    });

    const negativeTextHoleGeometry = new THREE.ExtrudeGeometry(glyphsHolesShapes, { ...extrudeGeometryOptions, depth: textDepth });

    if (supportDepth > textDepth) {
      // Move negative text
      [negativeTextGeometry, negativeTextHoleGeometry].map(item =>
        item.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, supportDepth - textDepth))
      );
    }

    const geometries: (THREE.ExtrudeBufferGeometry | THREE.BufferGeometry)[] = [negativeTextGeometry, negativeTextHoleGeometry];
    if (supportGeometry) geometries.push(supportGeometry);

    supportGeometry = mergeBufferGeometries(geometries);
  } else {
    textGeometry = glyphsDefToGeometry({ glyphsDef, depth: textDepth });

    if (type !== ModelType.TextOnly) {
      supportGeometry = new THREE.ExtrudeGeometry(supportShape, {
        ...extrudeGeometryOptions,
        depth: supportDepth,
      });
    }

    if (type === ModelType.VerticalTextWithSupport) {
      // Rotate & move text
      textGeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    }

    // Move text in support according to padding settings
    textGeometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(
        moveTextX,
        moveTextY + (type === ModelType.VerticalTextWithSupport ? size.z : 0),
        supportDepth
      )
    );
  }

  return {
    textGeometry,
    supportGeometry,
    dimensions: {
      ...fullDimensions,
      textWidth: size.x,
      textHeight: size.y,
      textDepth: size.z,
    },
  };
};
