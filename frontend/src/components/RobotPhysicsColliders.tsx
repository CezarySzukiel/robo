import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  interactionGroups,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { HeadStyle } from "../robot/robot-config";

export type PhysicsPartName =
  | "pelvis"
  | "torso"
  | "shoulders"
  | "neck"
  | "head"
  | "leftUpperArm"
  | "leftForearm"
  | "leftHand"
  | "rightUpperArm"
  | "rightForearm"
  | "rightHand"
  | "leftThigh"
  | "leftShin"
  | "leftFoot"
  | "rightThigh"
  | "rightShin"
  | "rightFoot";

export type PhysicsPartRefs = Partial<Record<PhysicsPartName, THREE.Object3D>>;

type CuboidConfig = {
  name: PhysicsPartName;
  shape: "cuboid";
  args: [number, number, number];
};

type BallConfig = {
  name: PhysicsPartName;
  shape: "ball";
  args: [number];
};

type CylinderConfig = {
  name: PhysicsPartName;
  shape: "cylinder";
  args: [number, number];
};

type ColliderConfig = CuboidConfig | BallConfig | CylinderConfig;

const ROBOT_COLLISION_GROUPS = interactionGroups(1, [0]);

const colliderConfigs: ColliderConfig[] = [
  { name: "pelvis", shape: "cylinder", args: [0.58, 0.26] },
  { name: "torso", shape: "cuboid", args: [0.43, 0.59, 0.23] },
  { name: "shoulders", shape: "cuboid", args: [0.68, 0.14, 0.24] },
  { name: "neck", shape: "cuboid", args: [0.32, 0.16, 0.2] },
  { name: "leftUpperArm", shape: "cuboid", args: [0.11, 0.34, 0.13] },
  { name: "leftForearm", shape: "cuboid", args: [0.095, 0.25, 0.11] },
  { name: "leftHand", shape: "ball", args: [0.15] },
  { name: "rightUpperArm", shape: "cuboid", args: [0.11, 0.34, 0.13] },
  { name: "rightForearm", shape: "cuboid", args: [0.095, 0.25, 0.11] },
  { name: "rightHand", shape: "ball", args: [0.15] },
  { name: "leftThigh", shape: "cuboid", args: [0.16, 0.525, 0.17] },
  { name: "leftShin", shape: "cuboid", args: [0.135, 0.5, 0.15] },
  { name: "leftFoot", shape: "cuboid", args: [0.21, 0.11, 0.43] },
  { name: "rightThigh", shape: "cuboid", args: [0.16, 0.525, 0.17] },
  { name: "rightShin", shape: "cuboid", args: [0.135, 0.5, 0.15] },
  { name: "rightFoot", shape: "cuboid", args: [0.21, 0.11, 0.43] },
];

type KinematicPartColliderProps = {
  bodies: RefObject<PhysicsBodyRefs>;
  config: ColliderConfig;
  initializedParts: RefObject<Set<PhysicsPartName>>;
};

type PhysicsBodyRefs = Partial<Record<PhysicsPartName, RapierRigidBody>>;

function KinematicPartCollider({ bodies, config, initializedParts }: KinematicPartColliderProps) {
  const setBodyRef = useCallback(
    (body: RapierRigidBody | null) => {
      if (body) {
        bodies.current[config.name] = body;
      } else {
        delete bodies.current[config.name];
      }

      initializedParts.current.delete(config.name);
    },
    [bodies, config.name, initializedParts],
  );

  const colliderProps = {
    collisionGroups: ROBOT_COLLISION_GROUPS,
    contactSkin: 0.002,
    friction: 0.85,
    restitution: 0.05,
  };

  return (
    <RigidBody
      ref={setBodyRef}
      ccd
      colliders={false}
      name={`robot-${config.name}`}
      position={[0, -20, 0]}
      type="kinematicPosition"
    >
      {config.shape === "cuboid" && <CuboidCollider args={config.args} {...colliderProps} />}
      {config.shape === "ball" && <BallCollider args={config.args} {...colliderProps} />}
      {config.shape === "cylinder" && <CylinderCollider args={config.args} {...colliderProps} />}
    </RigidBody>
  );
}

type RobotPhysicsCollidersProps = {
  headStyle: HeadStyle;
  preparePhysicsPose: () => void;
  resetSerial: number;
  restoreVisualPose: () => void;
  targets: RefObject<PhysicsPartRefs>;
};

export function RobotPhysicsColliders({
  headStyle,
  preparePhysicsPose,
  resetSerial,
  restoreVisualPose,
  targets,
}: RobotPhysicsCollidersProps) {
  const bodies = useRef<PhysicsBodyRefs>({});
  const initializedParts = useRef(new Set<PhysicsPartName>());
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const headConfig: ColliderConfig =
    headStyle === "minecraft"
      ? { name: "head", shape: "cuboid", args: [0.32, 0.32, 0.32] }
      : { name: "head", shape: "ball", args: [0.34] };
  const activeConfigs = [...colliderConfigs, headConfig];

  useEffect(() => {
    initializedParts.current.clear();
  }, [resetSerial]);

  useBeforePhysicsStep(() => {
    preparePhysicsPose();

    for (const config of activeConfigs) {
      const body = bodies.current[config.name];
      const target = targets.current[config.name];

      if (!body || !target) {
        continue;
      }

      target.updateWorldMatrix(true, false);
      target.getWorldPosition(worldPosition);
      target.getWorldQuaternion(worldQuaternion);

      if (!initializedParts.current.has(config.name)) {
        body.setTranslation(worldPosition, true);
        body.setRotation(worldQuaternion, true);
        initializedParts.current.add(config.name);
      } else {
        body.setNextKinematicTranslation(worldPosition);
        body.setNextKinematicRotation(worldQuaternion);
      }
    }
  });

  useAfterPhysicsStep(() => {
    restoreVisualPose();
  });

  return (
    <>
      {colliderConfigs.map((config) => (
        <KinematicPartCollider
          bodies={bodies}
          config={config}
          initializedParts={initializedParts}
          key={config.name}
        />
      ))}
      <KinematicPartCollider
        bodies={bodies}
        config={headConfig}
        initializedParts={initializedParts}
        key={`head-${headStyle}`}
      />
    </>
  );
}
