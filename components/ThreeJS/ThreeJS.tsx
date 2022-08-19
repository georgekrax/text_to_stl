import { OrbitControls, PerspectiveCamera, Plane, Text3D } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import { ModelType } from "../../types";
import { generateMesh, GenerateMeshParams } from "../../utils";

const degreesToRadians = (deg: number) => +((deg * Math.PI) / 180).toFixed(5);

export type TextSettingsType = Partial<Pick<React.ComponentProps<typeof Text3D>, "curveSegments">> &
  Required<Pick<React.ComponentProps<typeof Text3D>, "height" | "bevelSize" | "bevelSegments" | "bevelThickness">> &
  Pick<GenerateMeshParams, "text" | "type"> & {
    fontUrl?: string;
    color: string;
  };

export type SupportSettingsType = Pick<GenerateMeshParams, "align" | "spacing" | "vSpacing"> &
  Pick<Required<GenerateMeshParams>["supportPadding"], "top" | "bottom" | "left" | "right"> & {
    color: string;
    radius: number;
    depth: number;
  };

export type Props = {
  font?: opentype.Font;
  textSettings: TextSettingsType;
  supportSettings: SupportSettingsType;
};

export const ThreeJS = memo(({ font, textSettings, supportSettings }: Props) => {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const supportRef = useRef<THREE.Mesh>(null);

  const { scene } = useThree();

  const { fontUrl, type } = textSettings;

  useEffect(() => {
    const main = async () => {
      if (!font) return;
      const params = {
        ...textSettings,
        font,
        size: 20,
        spacing: supportSettings.spacing,
        vSpacing: supportSettings.vSpacing,
        alignment: supportSettings.align,
        supportHeight: supportSettings.depth,
        supportPadding: supportSettings,
        supportBorderRadius: supportSettings.radius,
      };
      const { textGeometry, supportGeometry, dimensions } = generateMesh(params);
      const { textGeometry: outlineGeometry, dimensions: dimensions2 } = generateMesh({
        ...params,
        size: params.size + 1,
        height: params.height - 2,
      });

      if (!groupRef.current) return;

      if (textGeometry && textRef.current) {
        textRef.current.geometry = textGeometry;
      }
      if (outlineGeometry && outlineRef.current) {
        // outlineRef.current.geometry = outlineGeometry ??????;
      }

      if (supportGeometry && supportRef.current) {
        supportRef.current.geometry = supportGeometry;
      }

      groupRef.current.position.x = -dimensions.width / 2;
      groupRef.current.position.z = dimensions.height / 2;
    };
    main();
    // eslint-disable-next-line
  }, [
    type,
    fontUrl,
    font?.names.fullName,
    textSettings.type,
    textSettings.text,
    textSettings.fontUrl,
    textSettings.color,
    textSettings.height,
    textSettings.curveSegments,
    textSettings.bevelSegments,
    textSettings.bevelSize,
    textSettings.bevelThickness,
    supportSettings.left,
    supportSettings.right,
    supportSettings.bottom,
    supportSettings.top,
    supportSettings.depth,
    supportSettings.align,
    supportSettings.radius,
    supportSettings.spacing,
    supportSettings.vSpacing,
  ]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 400, 100]} />
      <OrbitControls />
      {[
        { x: 0, y: 200, z: 0 },
        { x: 100, y: 200, z: 100 },
        { x: -100, y: -200, z: -100 },
      ].map(({ x, y, z }, i) => (
        <pointLight key={i} position={[x, y, z]} intensity={0.7} color="#ffffff" />
      ))}
      <group ref={groupRef} rotation={[degreesToRadians(-90), 0, 0]}>
        {font && type !== ModelType.NegativeText && (
          <mesh ref={textRef}>
            <meshLambertMaterial color={textSettings.color} side={THREE.DoubleSide} />
          </mesh>
        )}
        {font && type !== ModelType.NegativeText && (
          <mesh ref={outlineRef}>
            <meshLambertMaterial color="orange" side={THREE.DoubleSide} />
          </mesh>
        )}
        {font && type !== ModelType.TextOnly && (
          <mesh ref={supportRef}>
            <meshLambertMaterial color={supportSettings.color} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      <gridHelper args={[2000, 100, "orange"]} />
      <Plane visible={false} args={[100, 100]} rotation={[degreesToRadians(-90), 0, 0]}>
        <meshBasicMaterial color="lightgray" />
        {/* <meshBasicMaterial side={THREE.DoubleSide}> */}
        {/* <GradientTexture
              stops={[0, 1]}
              colors={["aquamarine", "cyan"]}
            /> */}
        {/* </meshBasicMaterial> */}
      </Plane>
    </>
  );
});

ThreeJS.displayName = "ThreeJS";
