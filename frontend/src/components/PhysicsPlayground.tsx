import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  interactionGroups,
  useAfterPhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { registerBallStateReader } from "../robot/ball-physics-state";
import { PHYSICS_TIME_STEP_SECONDS } from "../robot/physics-config";
import {
  BALL_RADIUS,
  GROUND_CENTER_Z,
  GROUND_DEPTH,
  GROUND_WIDTH,
  ballPositionConfig,
} from "../robot/scene-object-config";
import { useRobotStore } from "../robot/robot-store";
import { RobotModel } from "./RobotModel";

const BALL_POSITION_SYNC_INTERVAL_MS = 80;
const MAX_BALL_ANGULAR_SPEED = 45;
const ROLLING_RESISTANCE_ACCELERATION = 0.35;
const AIR_RESISTANCE_DAMPING = 0.22;
const GROUND_CONTACT_TOLERANCE = 0.03;
const WORLD_COLLISION_GROUPS = interactionGroups(0, [0, 1]);

function KickBall() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const lastPositionSync = useRef(0);
  const initialPosition = useRef({ ...useRobotStore.getState().ballPlacementPosition }).current;

  useEffect(() => {
    return registerBallStateReader(() => {
      const body = bodyRef.current;

      if (!body) {
        return {
          position: { ...ballPositionConfig.initial },
          linearVelocity: { x: 0, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 },
        };
      }

      const position = body.translation();
      const linearVelocity = body.linvel();
      const angularVelocity = body.angvel();

      return {
        position: { ...position },
        linearVelocity: { ...linearVelocity },
        angularVelocity: { ...angularVelocity },
      };
    });
  }, []);

  useAfterPhysicsStep(() => {
    const body = bodyRef.current;

    if (!body) {
      return;
    }

    const now = performance.now();

    if (now - lastPositionSync.current >= BALL_POSITION_SYNC_INTERVAL_MS) {
      const position = body.translation();
      useRobotStore.getState().syncBallPosition({ ...position });
      lastPositionSync.current = now;
    }

    const linearVelocity = body.linvel();
    const horizontalSpeed = Math.hypot(linearVelocity.x, linearVelocity.z);
    const isOnGround = body.translation().y <= BALL_RADIUS + GROUND_CONTACT_TOLERANCE;

    if (isOnGround && horizontalSpeed > 0) {
      const nextHorizontalSpeed = Math.max(
        0,
        horizontalSpeed - ROLLING_RESISTANCE_ACCELERATION * PHYSICS_TIME_STEP_SECONDS,
      );
      const scale = nextHorizontalSpeed / horizontalSpeed;
      body.setLinvel(
        {
          x: linearVelocity.x * scale,
          y: linearVelocity.y,
          z: linearVelocity.z * scale,
        },
        true,
      );
    }

    const angularVelocity = body.angvel();
    const angularSpeed = Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z);

    if (angularSpeed > MAX_BALL_ANGULAR_SPEED) {
      const scale = MAX_BALL_ANGULAR_SPEED / angularSpeed;
      body.setAngvel(
        {
          x: angularVelocity.x * scale,
          y: angularVelocity.y * scale,
          z: angularVelocity.z * scale,
        },
        true,
      );
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      additionalSolverIterations={4}
      angularDamping={0.12}
      canSleep
      ccd
      colliders={false}
      linearDamping={AIR_RESISTANCE_DAMPING}
      name="kick-ball"
      position={[initialPosition.x, initialPosition.y, initialPosition.z]}
    >
      <BallCollider
        args={[BALL_RADIUS]}
        collisionGroups={WORLD_COLLISION_GROUPS}
        friction={0.62}
        mass={0.43}
        restitution={0.28}
      />
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[BALL_RADIUS, 3]} />
        <meshStandardMaterial color="#f0dfae" flatShading roughness={0.58} />
      </mesh>
      <mesh scale={1.012}>
        <icosahedronGeometry args={[BALL_RADIUS, 2]} />
        <meshBasicMaterial color="#38483f" opacity={0.38} transparent wireframe />
      </mesh>
    </RigidBody>
  );
}

function PhysicalFloor() {
  return (
    <RigidBody colliders={false} name="floor" type="fixed">
      <CuboidCollider
        args={[GROUND_WIDTH / 2, 0.012, GROUND_DEPTH / 2]}
        collisionGroups={WORLD_COLLISION_GROUPS}
        friction={0.92}
        position={[0, -0.012, GROUND_CENTER_Z]}
        restitution={0.08}
      />
    </RigidBody>
  );
}

export function PhysicsPlayground() {
  const ballResetSerial = useRobotStore((state) => state.ballResetSerial);

  return (
    <Physics
      gravity={[0, -9.81, 0]}
      maxCcdSubsteps={8}
      numSolverIterations={12}
      timeStep={PHYSICS_TIME_STEP_SECONDS}
    >
      <RobotModel />
      <PhysicalFloor />
      <KickBall key={ballResetSerial} />
    </Physics>
  );
}
