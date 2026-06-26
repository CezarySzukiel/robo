import { create } from "zustand";
import {
  DEFAULT_DURATION_MS,
  type JointName,
  type LockSegment,
  cameraHeightConfig,
  clampCameraHeight,
  clampJointAngle,
  jointNames,
  neutralAngles,
} from "./robot-config";

export type RobotAngles = Record<JointName, number>;

export type JointAnimation = {
  fromDeg: number;
  toDeg: number;
  startedAt: number;
  durationMs: number;
};

export type RobotSnapshot = {
  currentAngles: RobotAngles;
  targetAngles: RobotAngles;
  lockedSegment: LockSegment;
  cameraHeight: number;
};

type RobotStore = RobotSnapshot & {
  animations: Partial<Record<JointName, JointAnimation>>;
  resetSerial: number;
  cameraResetSerial: number;
  animateToAngles: (angles: Partial<RobotAngles>, durationMs?: number) => void;
  tickAnimations: (now: number) => void;
  setCameraHeight: (height: number) => void;
  setLockedSegment: (segment: LockSegment) => void;
  resetCamera: () => void;
  resetPose: (durationMs?: number) => void;
};

function cloneAngles(angles: RobotAngles): RobotAngles {
  return { ...angles };
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export const useRobotStore = create<RobotStore>((set, get) => ({
  currentAngles: cloneAngles(neutralAngles),
  targetAngles: cloneAngles(neutralAngles),
  animations: {},
  lockedSegment: null,
  cameraHeight: cameraHeightConfig.neutral,
  resetSerial: 0,
  cameraResetSerial: 0,

  animateToAngles: (incomingAngles, durationMs = DEFAULT_DURATION_MS) => {
    const now = performance.now();
    const { currentAngles, targetAngles, animations } = get();
    const nextTargets = { ...targetAngles };
    const nextAnimations = { ...animations };

    for (const [joint, value] of Object.entries(incomingAngles) as [JointName, number][]) {
      if (!jointNames.includes(joint)) {
        continue;
      }

      const angleDeg = clampJointAngle(joint, value);
      nextTargets[joint] = angleDeg;
      nextAnimations[joint] = {
        fromDeg: currentAngles[joint],
        toDeg: angleDeg,
        startedAt: now,
        durationMs: Math.max(0, durationMs),
      };
    }

    set({
      targetAngles: nextTargets,
      animations: nextAnimations,
    });
  },

  tickAnimations: (now) => {
    const { animations, currentAngles } = get();
    const entries = Object.entries(animations) as [JointName, JointAnimation][];

    if (entries.length === 0) {
      return;
    }

    const nextAngles = { ...currentAngles };
    const nextAnimations: Partial<Record<JointName, JointAnimation>> = {};

    for (const [joint, animation] of entries) {
      const rawProgress =
        animation.durationMs === 0
          ? 1
          : (now - animation.startedAt) / animation.durationMs;
      const progress = Math.min(1, Math.max(0, rawProgress));
      nextAngles[joint] = interpolate(
        animation.fromDeg,
        animation.toDeg,
        easeInOutCubic(progress),
      );

      if (progress < 1) {
        nextAnimations[joint] = animation;
      } else {
        nextAngles[joint] = animation.toDeg;
      }
    }

    set({
      currentAngles: nextAngles,
      animations: nextAnimations,
    });
  },

  setLockedSegment: (segment) => {
    set({ lockedSegment: segment });
  },

  setCameraHeight: (height) => {
    set({ cameraHeight: clampCameraHeight(height) });
  },

  resetCamera: () => {
    set((state) => ({
      cameraHeight: cameraHeightConfig.neutral,
      cameraResetSerial: state.cameraResetSerial + 1,
    }));
  },

  resetPose: (durationMs = DEFAULT_DURATION_MS) => {
    get().animateToAngles(cloneAngles(neutralAngles), durationMs);
    set((state) => ({ resetSerial: state.resetSerial + 1 }));
  },
}));
