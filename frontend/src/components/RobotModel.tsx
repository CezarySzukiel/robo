import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AnchorableSegment, JointName } from "../robot/robot-config";
import { useRobotStore } from "../robot/robot-store";

const HOME_POSITION = new THREE.Vector3(0, 2.37, 0);
const ARM_FORWARD_TILT_RAD = -0.16;
const FOREARM_FORWARD_TILT_RAD = -0.24;

const jointDirection: Record<JointName, number> = {
  leftShoulder: -1,
  leftShoulderSide: 1,
  rightShoulder: -1,
  rightShoulderSide: -1,
  leftHip: -1,
  leftKnee: 1,
  leftAnkle: -1,
  rightHip: -1,
  rightKnee: 1,
  rightAnkle: -1,
};

type SegmentRefs = Partial<Record<AnchorableSegment, THREE.Object3D>>;
type JointRefs = Partial<Record<JointName, THREE.Group>>;

type BoxPartProps = {
  args: [number, number, number];
  color: string;
  position?: [number, number, number];
  roughness?: number;
};

function BoxPart({ args, color, position = [0, 0, 0], roughness = 0.62 }: BoxPartProps) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.08} />
    </mesh>
  );
}

type CylinderPartProps = {
  args: [number, number, number, number];
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  roughness?: number;
};

function CylinderPart({
  args,
  color,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  roughness = 0.62,
}: CylinderPartProps) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.08} />
    </mesh>
  );
}

function JointHub({ position }: { position: [number, number, number] }) {
  return (
    <mesh castShadow position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.16, 0.16, 0.24, 24]} />
      <meshStandardMaterial color="#f6c75d" roughness={0.5} metalness={0.18} />
    </mesh>
  );
}

function ShoulderCap({ position }: { position: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <sphereGeometry args={[0.23, 24, 18]} />
      <meshStandardMaterial color="#8fb9a7" roughness={0.56} metalness={0.08} />
    </mesh>
  );
}

type ArmProps = {
  side: "left" | "right";
  x: number;
  setJointRef: (joint: JointName) => (node: THREE.Group | null) => void;
};

function Arm({ side, x, setJointRef }: ArmProps) {
  const shoulderJoint = side === "left" ? "rightShoulder" : "leftShoulder";
  const shoulderSideJoint = side === "left" ? "rightShoulderSide" : "leftShoulderSide";

  return (
    <group ref={setJointRef(shoulderSideJoint)} position={[x, 0.9, 0]}>
      <group ref={setJointRef(shoulderJoint)} rotation={[ARM_FORWARD_TILT_RAD, 0, 0]}>
        <BoxPart args={[0.22, 0.68, 0.26]} color="#789a8c" position={[0, -0.34, 0]} />
        <group position={[0, -0.68, 0]} rotation={[FOREARM_FORWARD_TILT_RAD, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.34, 24]} />
            <meshStandardMaterial color="#d8be78" roughness={0.52} metalness={0.14} />
          </mesh>
          <BoxPart args={[0.19, 0.5, 0.22]} color="#6f8d82" position={[0, -0.27, 0]} />
          <mesh castShadow receiveShadow position={[0, -0.57, 0]}>
            <sphereGeometry args={[0.15, 20, 16]} />
            <meshStandardMaterial color="#d7dcc6" roughness={0.54} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

type LegProps = {
  side: "left" | "right";
  x: number;
  setJointRef: (joint: JointName) => (node: THREE.Group | null) => void;
  setSegmentRef: (segment: AnchorableSegment) => (node: THREE.Object3D | null) => void;
};

function Leg({ side, x, setJointRef, setSegmentRef }: LegProps) {
  const hipJoint = side === "left" ? "rightHip" : "leftHip";
  const kneeJoint = side === "left" ? "rightKnee" : "leftKnee";
  const ankleJoint = side === "left" ? "rightAnkle" : "leftAnkle";
  const footSegment = side === "left" ? "rightFoot" : "leftFoot";

  return (
    <group ref={setJointRef(hipJoint)} position={[x, -0.1, 0]}>
      <JointHub position={[0, 0, 0]} />
      <BoxPart args={[0.32, 1.05, 0.34]} color="#91a987" position={[0, -0.525, 0]} />
      <group ref={setJointRef(kneeJoint)} position={[0, -1.05, 0]}>
        <JointHub position={[0, 0, 0]} />
        <BoxPart args={[0.27, 1, 0.3]} color="#7f9880" position={[0, -0.5, 0]} />
        <group ref={setJointRef(ankleJoint)} position={[0, -1, 0]}>
          <JointHub position={[0, 0, 0]} />
          <group ref={setSegmentRef(footSegment)} position={[0, -0.11, 0.18]}>
            <BoxPart args={[0.42, 0.22, 0.86]} color="#d4a84a" roughness={0.54} />
          </group>
        </group>
      </group>
    </group>
  );
}

export function RobotModel() {
  const rootRef = useRef<THREE.Group>(null);
  const jointRefs = useRef<JointRefs>({});
  const segmentRefs = useRef<SegmentRefs>({});
  const anchorRef = useRef<THREE.Vector3 | null>(null);
  const anchoredSegmentRef = useRef<AnchorableSegment | null>(null);
  const tempWorld = useMemo(() => new THREE.Vector3(), []);
  const lockedSegment = useRobotStore((state) => state.lockedSegment);
  const resetSerial = useRobotStore((state) => state.resetSerial);

  const setJointRef = (joint: JointName) => (node: THREE.Group | null) => {
    if (node) {
      jointRefs.current[joint] = node;
    } else {
      delete jointRefs.current[joint];
    }
  };

  const setSegmentRef = (segment: AnchorableSegment) => (node: THREE.Object3D | null) => {
    if (node) {
      segmentRefs.current[segment] = node;
    } else {
      delete segmentRefs.current[segment];
    }
  };

  useEffect(() => {
    anchorRef.current = null;
    anchoredSegmentRef.current = lockedSegment;
  }, [lockedSegment]);

  useEffect(() => {
    if (!lockedSegment && rootRef.current) {
      rootRef.current.position.copy(HOME_POSITION);
    }
  }, [lockedSegment, resetSerial]);

  useFrame((_, delta) => {
    const store = useRobotStore.getState();
    store.tickAnimations(performance.now());
    const { currentAngles } = useRobotStore.getState();

    for (const [joint, ref] of Object.entries(jointRefs.current) as [JointName, THREE.Group][]) {
      const angleRad = THREE.MathUtils.degToRad(currentAngles[joint]) * jointDirection[joint];

      if (joint === "leftShoulderSide" || joint === "rightShoulderSide") {
        ref.rotation.z = angleRad;
      } else {
        ref.rotation.x = angleRad;
      }
    }

    const root = rootRef.current;

    if (!root) {
      return;
    }

    if (!lockedSegment) {
      const returnSpeed = 1 - Math.exp(-delta * 6);
      root.position.lerp(HOME_POSITION, returnSpeed);
      return;
    }

    root.updateMatrixWorld(true);
    const anchoredObject = segmentRefs.current[lockedSegment];

    if (!anchoredObject) {
      return;
    }

    if (!anchorRef.current || anchoredSegmentRef.current !== lockedSegment) {
      anchorRef.current = anchoredObject.getWorldPosition(new THREE.Vector3());
      anchoredSegmentRef.current = lockedSegment;
      return;
    }

    anchoredObject.getWorldPosition(tempWorld);
    root.position.add(anchorRef.current.clone().sub(tempWorld));
    root.updateMatrixWorld(true);
  });

  return (
    <group ref={rootRef} position={HOME_POSITION}>
      <group ref={setSegmentRef("pelvis")}>
        <CylinderPart
          args={[0.26, 0.26, 1.16, 32]}
          color="#c27c4c"
          position={[0, 0.05, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
      </group>

      <group ref={setSegmentRef("torso")} position={[0, 0.29, 0]}>
        <BoxPart args={[0.86, 1.18, 0.46]} color="#8fb9a7" position={[0, 0.35, 0]} />
        <BoxPart args={[1.36, 0.28, 0.48]} color="#8fb9a7" position={[0, 0.9, 0]} />
        <ShoulderCap position={[-0.72, 0.9, 0]} />
        <ShoulderCap position={[0.72, 0.9, 0]} />
        <BoxPart args={[0.64, 0.32, 0.4]} color="#d8be78" position={[0, 1.08, 0]} />
        <mesh castShadow position={[0, 1.47, 0]}>
          <sphereGeometry args={[0.34, 32, 24]} />
          <meshStandardMaterial color="#d7dcc6" roughness={0.48} metalness={0.06} />
        </mesh>
      </group>

      <Arm side="left" x={-0.75} setJointRef={setJointRef} />
      <Arm side="right" x={0.75} setJointRef={setJointRef} />
      <Leg side="left" x={-0.34} setJointRef={setJointRef} setSegmentRef={setSegmentRef} />
      <Leg side="right" x={0.34} setJointRef={setJointRef} setSegmentRef={setSegmentRef} />
    </group>
  );
}
