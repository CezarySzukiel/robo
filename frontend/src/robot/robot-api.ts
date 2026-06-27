import type { StoreApi } from "zustand";
import { getBallPhysicsState } from "./ball-physics-state";
import {
  type HeadStyle,
  type JointName,
  type LockSegment,
  clampCameraHeight,
  clampJointAngle,
  isJointName,
  isHeadStyle,
  isLockSegment,
  jointNames,
} from "./robot-config";
import type { RobotSnapshot } from "./robot-store";
import { useRobotStore } from "./robot-store";
import type { SceneObjectPosition } from "./scene-object-config";
import {
  type JointMotion,
  type ScheduledJointMotion,
  cancelAllJointMotions,
  cancelJointMotion,
  scheduleJointMotion,
} from "./joint-motion";

export type SetJointCommand = {
  type: "set_joint";
  joint: JointName;
  angleDeg: number;
};

export type SetJointsCommand = {
  type: "set_joints";
  anglesDeg: Partial<Record<JointName, number>>;
};

export type LockSegmentCommand = {
  type: "lock_segment";
  segment: LockSegment;
};

export type SetGroundCollisionCommand = {
  type: "set_ground_collision";
  enabled: boolean;
};

export type SetHeadStyleCommand = {
  type: "set_head_style";
  style: HeadStyle;
};

export type ResetPoseCommand = {
  type: "reset_pose";
};

export type SetCameraHeightCommand = {
  type: "set_camera_height";
  height: number;
};

export type ResetCameraCommand = {
  type: "reset_camera";
};

export type ResetBallCommand = {
  type: "reset_ball";
};

export type MoveJointCommand = JointMotion & {
  type: "move_joint";
};

export type RobotCommand =
  | SetJointCommand
  | SetJointsCommand
  | LockSegmentCommand
  | SetGroundCollisionCommand
  | SetHeadStyleCommand
  | ResetPoseCommand
  | SetCameraHeightCommand
  | ResetCameraCommand
  | ResetBallCommand
  | MoveJointCommand;

export type RobotStateMessage = {
  type: "state";
  state: RobotSnapshot;
};

export type RobotErrorMessage = {
  type: "error";
  message: string;
};

export type RobotMotionScheduledMessage = {
  type: "motion_scheduled";
  motion: ScheduledJointMotion;
};

export type RobotCommandResult =
  | RobotStateMessage
  | RobotErrorMessage
  | RobotMotionScheduledMessage;

type RobotStoreApi = typeof useRobotStore & StoreApi<ReturnType<typeof useRobotStore.getState>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stateMessage(): RobotStateMessage {
  return {
    type: "state",
    state: getRobotState(),
  };
}

function errorMessage(message: string): RobotErrorMessage {
  return {
    type: "error",
    message,
  };
}

export function getRobotState(): RobotSnapshot {
  const {
    cameraHeight,
    currentAngles,
    groundCollisionEnabled,
    headStyle,
    targetAngles,
    lockedSegment,
  } = useRobotStore.getState();
  return {
    cameraHeight,
    currentAngles: { ...currentAngles },
    groundCollisionEnabled,
    headStyle,
    targetAngles: { ...targetAngles },
    lockedSegment,
  };
}

export function getBallState() {
  return getBallPhysicsState();
}

export function subscribeRobotState(listener: (state: RobotSnapshot) => void) {
  return useRobotStore.subscribe(() => {
    listener(getRobotState());
  });
}

export function setJoint(
  joint: JointName,
  angleDeg: number,
): RobotStateMessage {
  cancelJointMotion(joint);
  useRobotStore.getState().setAngles({
    [joint]: clampJointAngle(joint, angleDeg),
  });

  return stateMessage();
}

export function setJoints(
  anglesDeg: Partial<Record<JointName, number>>,
): RobotStateMessage {
  const validAngles: Partial<Record<JointName, number>> = {};

  for (const joint of jointNames) {
    const value = anglesDeg[joint];

    if (typeof value === "number" && Number.isFinite(value)) {
      cancelJointMotion(joint);
      validAngles[joint] = clampJointAngle(joint, value);
    }
  }

  useRobotStore.getState().setAngles(validAngles);
  return stateMessage();
}

export function lockSegment(segment: LockSegment): RobotStateMessage {
  useRobotStore.getState().setLockedSegment(segment);
  return stateMessage();
}

export function setGroundCollision(enabled: boolean): RobotStateMessage {
  useRobotStore.getState().setGroundCollisionEnabled(enabled);
  return stateMessage();
}

export function setHeadStyle(style: HeadStyle): RobotStateMessage {
  useRobotStore.getState().setHeadStyle(style);
  return stateMessage();
}

export function resetPose(): RobotStateMessage {
  cancelAllJointMotions();
  useRobotStore.getState().resetPose();
  return stateMessage();
}

export function setCameraHeight(height: number): RobotStateMessage {
  useRobotStore.getState().setCameraHeight(clampCameraHeight(height));
  return stateMessage();
}

export function resetCamera(): RobotStateMessage {
  useRobotStore.getState().resetCamera();
  return stateMessage();
}

export function resetBall(): RobotStateMessage {
  useRobotStore.getState().resetBall();
  return stateMessage();
}

export function setBallPosition(position: SceneObjectPosition): RobotStateMessage {
  useRobotStore.getState().setBallPosition(position);
  return stateMessage();
}

export function moveJoint(motion: JointMotion): RobotMotionScheduledMessage {
  return { type: "motion_scheduled", motion: scheduleJointMotion(motion) };
}

export function applyRobotCommand(command: unknown): RobotCommandResult {
  if (!isRecord(command) || typeof command.type !== "string") {
    return errorMessage("Command must be an object with a string type.");
  }

  if (command.type === "set_joint") {
    if (!isJointName(command.joint)) {
      return errorMessage("Unknown joint.");
    }

    if (typeof command.angleDeg !== "number" || !Number.isFinite(command.angleDeg)) {
      return errorMessage("angleDeg must be a finite number.");
    }

    return setJoint(command.joint, command.angleDeg);
  }

  if (command.type === "set_joints") {
    if (!isRecord(command.anglesDeg)) {
      return errorMessage("anglesDeg must be an object keyed by joint name.");
    }

    const angles: Partial<Record<JointName, number>> = {};

    for (const [joint, value] of Object.entries(command.anglesDeg)) {
      if (!isJointName(joint)) {
        return errorMessage(`Unknown joint: ${joint}.`);
      }

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return errorMessage(`Angle for ${joint} must be a finite number.`);
      }

      angles[joint] = value;
    }

    return setJoints(angles);
  }

  if (command.type === "move_joint") {
    if (!isJointName(command.joint)) {
      return errorMessage("Unknown joint.");
    }
    if (typeof command.toAngleDeg !== "number" || !Number.isFinite(command.toAngleDeg)) {
      return errorMessage("toAngleDeg must be a finite number.");
    }
    if (
      command.fromAngleDeg !== undefined &&
      (typeof command.fromAngleDeg !== "number" || !Number.isFinite(command.fromAngleDeg))
    ) {
      return errorMessage("fromAngleDeg must be a finite number.");
    }
    const hasDuration =
      typeof command.durationMs === "number" &&
      Number.isFinite(command.durationMs) &&
      command.durationMs >= 0;
    const hasSpeed =
      typeof command.speedDegPerSecond === "number" &&
      Number.isFinite(command.speedDegPerSecond) &&
      command.speedDegPerSecond > 0;
    if (!hasDuration && !hasSpeed) {
      return errorMessage("Provide durationMs >= 0 or speedDegPerSecond > 0.");
    }
    if (
      command.delayMs !== undefined &&
      (typeof command.delayMs !== "number" ||
        !Number.isFinite(command.delayMs) ||
        command.delayMs < 0)
    ) {
      return errorMessage("delayMs must be a finite number >= 0.");
    }

    return moveJoint({
      joint: command.joint,
      fromAngleDeg: command.fromAngleDeg as number | undefined,
      toAngleDeg: command.toAngleDeg,
      durationMs: hasDuration ? (command.durationMs as number) : undefined,
      speedDegPerSecond: hasSpeed ? (command.speedDegPerSecond as number) : undefined,
      delayMs: command.delayMs as number | undefined,
    });
  }

  if (command.type === "lock_segment") {
    if (!isLockSegment(command.segment)) {
      return errorMessage("Unknown lock segment.");
    }

    return lockSegment(command.segment);
  }

  if (command.type === "set_ground_collision") {
    if (typeof command.enabled !== "boolean") {
      return errorMessage("enabled must be a boolean.");
    }

    return setGroundCollision(command.enabled);
  }

  if (command.type === "set_head_style") {
    if (!isHeadStyle(command.style)) {
      return errorMessage("Unknown head style.");
    }

    return setHeadStyle(command.style);
  }

  if (command.type === "reset_pose") {
    return resetPose();
  }

  if (command.type === "set_camera_height") {
    if (typeof command.height !== "number" || !Number.isFinite(command.height)) {
      return errorMessage("height must be a finite number.");
    }

    return setCameraHeight(command.height);
  }

  if (command.type === "reset_camera") {
    return resetCamera();
  }

  if (command.type === "reset_ball") {
    return resetBall();
  }

  return errorMessage(`Unknown command type: ${command.type}.`);
}

export const robotApi = {
  applyRobotCommand,
  getBallState,
  getRobotState,
  lockSegment,
  moveJoint,
  resetBall,
  resetCamera,
  resetPose,
  setCameraHeight,
  setBallPosition,
  setGroundCollision,
  setHeadStyle,
  setJoint,
  setJoints,
  subscribeRobotState,
};

export type RobotApi = typeof robotApi;
export type RobotStoreInstance = RobotStoreApi;
