import type { StoreApi } from "zustand";
import {
  DEFAULT_DURATION_MS,
  type JointName,
  type LockSegment,
  clampCameraHeight,
  clampJointAngle,
  isJointName,
  isLockSegment,
  jointNames,
} from "./robot-config";
import type { RobotSnapshot } from "./robot-store";
import { useRobotStore } from "./robot-store";

export type SetJointCommand = {
  type: "set_joint";
  joint: JointName;
  angleDeg: number;
  durationMs?: number;
};

export type SetJointsCommand = {
  type: "set_joints";
  anglesDeg: Partial<Record<JointName, number>>;
  durationMs?: number;
};

export type LockSegmentCommand = {
  type: "lock_segment";
  segment: LockSegment;
};

export type ResetPoseCommand = {
  type: "reset_pose";
  durationMs?: number;
};

export type SetCameraHeightCommand = {
  type: "set_camera_height";
  height: number;
};

export type ResetCameraCommand = {
  type: "reset_camera";
};

export type RobotCommand =
  | SetJointCommand
  | SetJointsCommand
  | LockSegmentCommand
  | ResetPoseCommand
  | SetCameraHeightCommand
  | ResetCameraCommand;

export type RobotStateMessage = {
  type: "state";
  state: RobotSnapshot;
};

export type RobotErrorMessage = {
  type: "error";
  message: string;
};

export type RobotCommandResult = RobotStateMessage | RobotErrorMessage;

type RobotStoreApi = typeof useRobotStore & StoreApi<ReturnType<typeof useRobotStore.getState>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : DEFAULT_DURATION_MS;
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
  const { cameraHeight, currentAngles, targetAngles, lockedSegment } = useRobotStore.getState();
  return {
    cameraHeight,
    currentAngles: { ...currentAngles },
    targetAngles: { ...targetAngles },
    lockedSegment,
  };
}

export function subscribeRobotState(listener: (state: RobotSnapshot) => void) {
  return useRobotStore.subscribe(() => {
    listener(getRobotState());
  });
}

export function setJoint(
  joint: JointName,
  angleDeg: number,
  durationMs = DEFAULT_DURATION_MS,
): RobotStateMessage {
  useRobotStore.getState().animateToAngles(
    {
      [joint]: clampJointAngle(joint, angleDeg),
    },
    durationMs,
  );

  return stateMessage();
}

export function setJoints(
  anglesDeg: Partial<Record<JointName, number>>,
  durationMs = DEFAULT_DURATION_MS,
): RobotStateMessage {
  const validAngles: Partial<Record<JointName, number>> = {};

  for (const joint of jointNames) {
    const value = anglesDeg[joint];

    if (typeof value === "number" && Number.isFinite(value)) {
      validAngles[joint] = clampJointAngle(joint, value);
    }
  }

  useRobotStore.getState().animateToAngles(validAngles, durationMs);
  return stateMessage();
}

export function lockSegment(segment: LockSegment): RobotStateMessage {
  useRobotStore.getState().setLockedSegment(segment);
  return stateMessage();
}

export function resetPose(durationMs = DEFAULT_DURATION_MS): RobotStateMessage {
  useRobotStore.getState().resetPose(durationMs);
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

    return setJoint(command.joint, command.angleDeg, normalizeDuration(command.durationMs));
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

    return setJoints(angles, normalizeDuration(command.durationMs));
  }

  if (command.type === "lock_segment") {
    if (!isLockSegment(command.segment)) {
      return errorMessage("Unknown lock segment.");
    }

    return lockSegment(command.segment);
  }

  if (command.type === "reset_pose") {
    return resetPose(normalizeDuration(command.durationMs));
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

  return errorMessage(`Unknown command type: ${command.type}.`);
}

export const robotApi = {
  applyRobotCommand,
  getRobotState,
  lockSegment,
  resetCamera,
  resetPose,
  setCameraHeight,
  setJoint,
  setJoints,
  subscribeRobotState,
};

export type RobotApi = typeof robotApi;
export type RobotStoreInstance = RobotStoreApi;
