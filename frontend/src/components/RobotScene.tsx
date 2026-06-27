import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cameraHeightConfig } from "../robot/robot-config";
import { useRobotStore } from "../robot/robot-store";
import { GROUND_CENTER_Z, GROUND_DEPTH, GROUND_WIDTH } from "../robot/scene-object-config";
import { PhysicsPlayground } from "./PhysicsPlayground";

const CAMERA_FLOOR_Y = 0.08;
const MAX_CAMERA_DISTANCE = 32;
const MIN_POLAR_ANGLE = Math.PI * 0.03;
const MAX_POLAR_ANGLE = Math.PI * 0.86;
const DEFAULT_CAMERA_POSITION: [number, number, number] = [4.5, cameraHeightConfig.neutral, 5.2];
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 1.25, 0];

function ControlledOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraHeight = useRobotStore((state) => state.cameraHeight);
  const cameraResetSerial = useRobotStore((state) => state.cameraResetSerial);
  const previousCameraHeight = useRef(cameraHeight);
  const previousCameraResetSerial = useRef(cameraResetSerial);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    const controls = controlsRef.current;

    if (controls) {
      if (cameraResetSerial !== previousCameraResetSerial.current) {
        camera.position.set(...DEFAULT_CAMERA_POSITION);
        controls.target.set(...DEFAULT_CAMERA_TARGET);
        previousCameraHeight.current = cameraHeight;
        previousCameraResetSerial.current = cameraResetSerial;
      }

      const heightDelta = cameraHeight - previousCameraHeight.current;

      if (heightDelta !== 0) {
        camera.position.y += heightDelta;
        controls.target.y += heightDelta;
        previousCameraHeight.current = cameraHeight;
      }

      if (camera.position.y < CAMERA_FLOOR_Y) {
        camera.position.y = CAMERA_FLOOR_Y;
      }

      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      maxDistance={MAX_CAMERA_DISTANCE}
      maxPolarAngle={MAX_POLAR_ANGLE}
      minDistance={2.8}
      minPolarAngle={MIN_POLAR_ANGLE}
      target={DEFAULT_CAMERA_TARGET}
    />
  );
}

export function RobotScene() {
  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POSITION, far: 3000, fov: 42 }}
      dpr={[1, 2]}
      shadows
      className="robot-canvas"
    >
      <color attach="background" args={["#10120d"]} />
      <ambientLight intensity={1.1} />
      <directionalLight
        castShadow
        intensity={2.2}
        position={[4, 6, 3]}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight intensity={6} position={[-3.8, 3.2, -2.8]} color="#72d6c9" />
      <Suspense fallback={null}>
        <PhysicsPlayground />
      </Suspense>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, GROUND_CENTER_Z]}>
        <boxGeometry args={[GROUND_WIDTH, GROUND_DEPTH, 0.024]} />
        <meshStandardMaterial
          color="#465140"
          emissive="#252d22"
          emissiveIntensity={0.45}
          metalness={0.08}
          roughness={0.86}
        />
      </mesh>
      <Grid
        args={[GROUND_WIDTH, GROUND_DEPTH]}
        cellColor="#5e6f5b"
        cellSize={0.45}
        cellThickness={0.55}
        fadeDistance={29}
        fadeStrength={1.2}
        position={[0, 0.004, GROUND_CENTER_Z]}
        sectionColor="#f6c75d"
        sectionSize={1.8}
        sectionThickness={1.15}
      />
      <ContactShadows
        blur={2.6}
        far={4}
        opacity={0.38}
        position={[0, 0.012, 0]}
        resolution={1024}
        scale={5.4}
      />
      <ControlledOrbitControls />
    </Canvas>
  );
}
