import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  type AnchorableSegment,
  type JointName,
  jointNames,
} from "../robot/robot-config";
import { MAX_ROBOT_JOINT_STEP_DEG } from "../robot/physics-config";
import { type RobotAngles, useRobotStore } from "../robot/robot-store";
import {
  RobotPhysicsColliders,
  type PhysicsPartName,
  type PhysicsPartRefs,
} from "./RobotPhysicsColliders";

const HOME_POSITION = new THREE.Vector3(0, 2.37, 0);
const ARM_FORWARD_TILT_RAD = -0.16;
const WAIST_Y = 0.05;
const SHOULDER_Y_FROM_WAIST = 1.14;
const GROUND_Y = 0;

const jointDirection: Record<JointName, number> = {
  headYaw: 1,
  headPitch: -1,
  waist: 1,
  leftShoulder: -1,
  leftShoulderSide: 1,
  leftElbow: -1,
  rightShoulder: -1,
  rightShoulderSide: -1,
  rightElbow: -1,
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
  physicsRef?: (node: THREE.Mesh | null) => void;
  position?: [number, number, number];
  roughness?: number;
};

function BoxPart({
  args,
  color,
  physicsRef,
  position = [0, 0, 0],
  roughness = 0.62,
}: BoxPartProps) {
  return (
    <mesh ref={physicsRef} castShadow receiveShadow position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.08} />
    </mesh>
  );
}

type CylinderPartProps = {
  args: [number, number, number, number];
  color: string;
  physicsRef?: (node: THREE.Mesh | null) => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  roughness?: number;
};

function CylinderPart({
  args,
  color,
  physicsRef,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  roughness = 0.62,
}: CylinderPartProps) {
  return (
    <mesh ref={physicsRef} castShadow receiveShadow position={position} rotation={rotation}>
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

function RoundRobotFace() {
  return (
    <group position={[0, 0, 0.29]}>
      {[-0.12, 0.12].map((x) => (
        <group key={x} position={[x, 0.06, 0]}>
          <mesh castShadow scale={[1, 1.12, 0.38]}>
            <sphereGeometry args={[0.072, 20, 16]} />
            <meshStandardMaterial color="#24332f" roughness={0.36} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.008, 0.034]} scale={[1, 1.08, 0.4]}>
            <sphereGeometry args={[0.026, 16, 12]} />
            <meshStandardMaterial
              color="#f6c75d"
              emissive="#f6c75d"
              emissiveIntensity={0.65}
              roughness={0.28}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.075, 0.025]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.115, 0.016, 10, 28, Math.PI]} />
        <meshStandardMaterial color="#774c3d" roughness={0.46} metalness={0.08} />
      </mesh>
    </group>
  );
}

function RoundHead() {
  return (
    <>
      <mesh castShadow>
        <sphereGeometry args={[0.34, 32, 24]} />
        <meshStandardMaterial color="#d7dcc6" roughness={0.48} metalness={0.06} />
      </mesh>
      <RoundRobotFace />
    </>
  );
}

function MinecraftHead() {
  return (
    <group>
      <BoxPart args={[0.64, 0.64, 0.64]} color="#c8c7a7" roughness={0.76} />
      <BoxPart args={[0.615, 0.075, 0.025]} color="#718a72" position={[0, 0.245, 0.326]} roughness={0.7} />
      <BoxPart args={[0.615, 0.075, 0.025]} color="#718a72" position={[0, 0.245, -0.326]} roughness={0.7} />
      <BoxPart args={[0.025, 0.075, 0.615]} color="#718a72" position={[-0.326, 0.245, 0]} roughness={0.7} />
      <BoxPart args={[0.025, 0.075, 0.615]} color="#718a72" position={[0.326, 0.245, 0]} roughness={0.7} />

      {[-0.15, 0.15].map((x) => (
        <group key={x}>
          <BoxPart args={[0.115, 0.105, 0.025]} color="#24332f" position={[x, 0.07, 0.326]} />
          <BoxPart args={[0.045, 0.045, 0.015]} color="#f6c75d" position={[x, 0.07, 0.347]} roughness={0.3} />
        </group>
      ))}

      <BoxPart args={[0.16, 0.045, 0.025]} color="#774c3d" position={[0, -0.125, 0.326]} />
      <BoxPart args={[0.05, 0.05, 0.025]} color="#774c3d" position={[-0.105, -0.09, 0.326]} />
      <BoxPart args={[0.05, 0.05, 0.025]} color="#774c3d" position={[0.105, -0.09, 0.326]} />
    </group>
  );
}

type ArmProps = {
  side: "left" | "right";
  x: number;
  setJointRef: (joint: JointName) => (node: THREE.Group | null) => void;
  setPhysicsRef: (part: PhysicsPartName) => (node: THREE.Object3D | null) => void;
};

function Arm({ side, x, setJointRef, setPhysicsRef }: ArmProps) {
  const shoulderJoint = side === "left" ? "rightShoulder" : "leftShoulder";
  const shoulderSideJoint = side === "left" ? "rightShoulderSide" : "leftShoulderSide";
  const elbowJoint = side === "left" ? "rightElbow" : "leftElbow";
  const upperArmPart = side === "left" ? "leftUpperArm" : "rightUpperArm";
  const forearmPart = side === "left" ? "leftForearm" : "rightForearm";
  const handPart = side === "left" ? "leftHand" : "rightHand";

  return (
    <group ref={setJointRef(shoulderSideJoint)} position={[x, SHOULDER_Y_FROM_WAIST, 0]}>
      <group ref={setJointRef(shoulderJoint)} rotation={[ARM_FORWARD_TILT_RAD, 0, 0]}>
        <BoxPart
          args={[0.22, 0.68, 0.26]}
          color="#789a8c"
          physicsRef={setPhysicsRef(upperArmPart)}
          position={[0, -0.34, 0]}
        />
        <group ref={setJointRef(elbowJoint)} position={[0, -0.68, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.34, 24]} />
            <meshStandardMaterial color="#d8be78" roughness={0.52} metalness={0.14} />
          </mesh>
          <BoxPart
            args={[0.19, 0.5, 0.22]}
            color="#6f8d82"
            physicsRef={setPhysicsRef(forearmPart)}
            position={[0, -0.27, 0]}
          />
          <mesh ref={setPhysicsRef(handPart)} castShadow receiveShadow position={[0, -0.57, 0]}>
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
  setPhysicsRef: (part: PhysicsPartName) => (node: THREE.Object3D | null) => void;
  setSegmentRef: (segment: AnchorableSegment) => (node: THREE.Object3D | null) => void;
};

function Leg({ side, x, setJointRef, setPhysicsRef, setSegmentRef }: LegProps) {
  const hipJoint = side === "left" ? "rightHip" : "leftHip";
  const kneeJoint = side === "left" ? "rightKnee" : "leftKnee";
  const ankleJoint = side === "left" ? "rightAnkle" : "leftAnkle";
  const footSegment = side === "left" ? "rightFoot" : "leftFoot";
  const thighPart = side === "left" ? "leftThigh" : "rightThigh";
  const shinPart = side === "left" ? "leftShin" : "rightShin";
  const footPart = side === "left" ? "leftFoot" : "rightFoot";

  return (
    <group ref={setJointRef(hipJoint)} position={[x, -0.1, 0]}>
      <JointHub position={[0, 0, 0]} />
      <BoxPart
        args={[0.32, 1.05, 0.34]}
        color="#91a987"
        physicsRef={setPhysicsRef(thighPart)}
        position={[0, -0.525, 0]}
      />
      <group ref={setJointRef(kneeJoint)} position={[0, -1.05, 0]}>
        <JointHub position={[0, 0, 0]} />
        <BoxPart
          args={[0.27, 1, 0.3]}
          color="#7f9880"
          physicsRef={setPhysicsRef(shinPart)}
          position={[0, -0.5, 0]}
        />
        <group ref={setJointRef(ankleJoint)} position={[0, -1, 0]}>
          <JointHub position={[0, 0, 0]} />
          <group ref={setSegmentRef(footSegment)} position={[0, -0.11, 0.18]}>
            <BoxPart
              args={[0.42, 0.22, 0.86]}
              color="#d4a84a"
              physicsRef={setPhysicsRef(footPart)}
              roughness={0.54}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

export function RobotModel() {
  const rootRef = useRef<THREE.Group>(null);
  const jointRefs = useRef<JointRefs>({});
  const physicsAnglesRef = useRef<RobotAngles>({
    ...useRobotStore.getState().currentAngles,
  });
  const physicsPartRefs = useRef<PhysicsPartRefs>({});
  const segmentRefs = useRef<SegmentRefs>({});
  const anchorRef = useRef<THREE.Vector3 | null>(null);
  const anchoredSegmentRef = useRef<AnchorableSegment | null>(null);
  const tempWorld = useMemo(() => new THREE.Vector3(), []);
  const robotBounds = useMemo(() => new THREE.Box3(), []);
  const headStyle = useRobotStore((state) => state.headStyle);
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

  const setPhysicsRef = (part: PhysicsPartName) => (node: THREE.Object3D | null) => {
    if (node) {
      physicsPartRefs.current[part] = node;
    } else {
      delete physicsPartRefs.current[part];
    }
  };

  const applyJointAngles = (angles: RobotAngles) => {
    for (const [joint, ref] of Object.entries(jointRefs.current) as [JointName, THREE.Group][]) {
      const angleRad = THREE.MathUtils.degToRad(angles[joint]) * jointDirection[joint];

      if (joint === "headYaw") {
        ref.rotation.y = angleRad;
      } else if (joint === "leftShoulderSide" || joint === "rightShoulderSide") {
        ref.rotation.z = angleRad;
      } else {
        ref.rotation.x = angleRad;
      }
    }
  };

  const preparePhysicsPose = () => {
    const targetAngles = useRobotStore.getState().currentAngles;
    const nextPhysicsAngles = { ...physicsAnglesRef.current };

    for (const joint of jointNames) {
      const difference = targetAngles[joint] - nextPhysicsAngles[joint];
      nextPhysicsAngles[joint] += THREE.MathUtils.clamp(
        difference,
        -MAX_ROBOT_JOINT_STEP_DEG,
        MAX_ROBOT_JOINT_STEP_DEG,
      );
    }

    physicsAnglesRef.current = nextPhysicsAngles;
    applyJointAngles(nextPhysicsAngles);
    rootRef.current?.updateMatrixWorld(true);
  };

  const restoreVisualPose = () => {
    applyJointAngles(useRobotStore.getState().currentAngles);
    rootRef.current?.updateMatrixWorld(true);
  };

  useEffect(() => {
    anchorRef.current = null;
    anchoredSegmentRef.current = lockedSegment;
  }, [lockedSegment]);

  useEffect(() => {
    physicsAnglesRef.current = {
      ...useRobotStore.getState().currentAngles,
    };

    if (!lockedSegment && rootRef.current) {
      rootRef.current.position.copy(HOME_POSITION);
    }
  }, [lockedSegment, resetSerial]);

  useFrame((_, delta) => {
    const { currentAngles, groundCollisionEnabled } = useRobotStore.getState();
    applyJointAngles(currentAngles);

    const root = rootRef.current;

    if (!root) {
      return;
    }

    if (!lockedSegment) {
      const returnSpeed = 1 - Math.exp(-delta * 6);
      root.position.lerp(HOME_POSITION, returnSpeed);
    } else {
      root.updateMatrixWorld(true);
      const anchoredObject = segmentRefs.current[lockedSegment];

      if (anchoredObject) {
        if (!anchorRef.current || anchoredSegmentRef.current !== lockedSegment) {
          anchorRef.current = anchoredObject.getWorldPosition(new THREE.Vector3());
          anchoredSegmentRef.current = lockedSegment;
        } else {
          anchoredObject.getWorldPosition(tempWorld);
          root.position.add(anchorRef.current.clone().sub(tempWorld));
          root.updateMatrixWorld(true);
        }
      }
    }

    if (groundCollisionEnabled) {
      root.updateMatrixWorld(true);
      robotBounds.setFromObject(root);

      if (robotBounds.min.y < GROUND_Y) {
        root.position.y += GROUND_Y - robotBounds.min.y;
        root.updateMatrixWorld(true);
      }
    }
  }, -1);

  return (
    <>
      <group ref={rootRef} position={HOME_POSITION}>
        <group ref={setSegmentRef("pelvis")}>
          <CylinderPart
            args={[0.26, 0.26, 1.16, 32]}
            color="#c27c4c"
            physicsRef={setPhysicsRef("pelvis")}
            position={[0, 0.05, 0]}
            rotation={[0, 0, Math.PI / 2]}
          />
        </group>

        <group ref={setJointRef("waist")} position={[0, WAIST_Y, 0]}>
          <group ref={setSegmentRef("torso")} position={[0, 0.24, 0]}>
            <BoxPart
              args={[0.86, 1.18, 0.46]}
              color="#8fb9a7"
              physicsRef={setPhysicsRef("torso")}
              position={[0, 0.35, 0]}
            />
            <BoxPart
              args={[1.36, 0.28, 0.48]}
              color="#8fb9a7"
              physicsRef={setPhysicsRef("shoulders")}
              position={[0, 0.9, 0]}
            />
            <ShoulderCap position={[-0.72, 0.9, 0]} />
            <ShoulderCap position={[0.72, 0.9, 0]} />
            <BoxPart
              args={[0.64, 0.32, 0.4]}
              color="#d8be78"
              physicsRef={setPhysicsRef("neck")}
              position={[0, 1.08, 0]}
            />
            <group ref={setJointRef("headYaw")} position={[0, 1.47, 0]}>
              <group ref={setJointRef("headPitch")}>
                <group ref={setPhysicsRef("head")}>
                  {headStyle === "minecraft" ? <MinecraftHead /> : <RoundHead />}
                </group>
              </group>
            </group>
          </group>

          <Arm side="left" x={-0.72} setJointRef={setJointRef} setPhysicsRef={setPhysicsRef} />
          <Arm side="right" x={0.72} setJointRef={setJointRef} setPhysicsRef={setPhysicsRef} />
        </group>

        <Leg
          side="left"
          x={-0.34}
          setJointRef={setJointRef}
          setPhysicsRef={setPhysicsRef}
          setSegmentRef={setSegmentRef}
        />
        <Leg
          side="right"
          x={0.34}
          setJointRef={setJointRef}
          setPhysicsRef={setPhysicsRef}
          setSegmentRef={setSegmentRef}
        />
      </group>
      <RobotPhysicsColliders
        headStyle={headStyle}
        preparePhysicsPose={preparePhysicsPose}
        resetSerial={resetSerial}
        restoreVisualPose={restoreVisualPose}
        targets={physicsPartRefs}
      />
    </>
  );
}
