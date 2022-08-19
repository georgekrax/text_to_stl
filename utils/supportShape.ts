import * as THREE from "three";

type GenerateSupportShapeParams = {
  width: number;
  height: number;
  borderRadius?: number;
};

export function generateSupportShape({
  width,
  height,
  borderRadius: radius = 0,
}: GenerateSupportShapeParams): THREE.Shape {
  // Limit min/max radius
  let maxRadius = Math.min(width / 2, height / 2);
  if (radius > maxRadius) radius = maxRadius;
  else if (radius < 0) radius = 0;

  const supportShape = new THREE.Shape();
  supportShape.moveTo(radius, 0);

  supportShape.lineTo(width - radius, 0);
  if (radius) {
    supportShape.ellipse(
      0,
      radius,
      radius,
      radius,
      Math.PI / 2,
      Math.PI,
      false,
      Math.PI
    );
  }
  supportShape.lineTo(width, height - radius);
  if (radius) {
    supportShape.ellipse(
      -radius,
      0,
      radius,
      radius,
      Math.PI,
      Math.PI * 1.5,
      false,
      Math.PI
    );
  }

  supportShape.lineTo(radius, height);
  if (radius) {
    supportShape.ellipse(
      0,
      -radius,
      radius,
      radius,
      Math.PI * 1.5,
      0,
      false,
      Math.PI
    );
  }

  supportShape.lineTo(0, radius);
  if (radius) {
    supportShape.ellipse(
      radius,
      0,
      radius,
      radius,
      0,
      Math.PI / 2,
      false,
      Math.PI
    );
  }

  return supportShape;
}
