import { create } from "zustand";
import {
  type HeadStyle,
  type JointName,
  type LockSegment,
  cameraHeightConfig,
  clampCameraHeight,
  clampJointAngle,
  jointNames,
  neutralAngles,
} from "./robot-config";
import {
  type SceneObjectPosition,
  ballPositionConfig,
  clampBallPosition,
} from "./scene-object-config";

export type RobotAngles = Record<JointName, number>;

export type RobotSnapshot = {
  currentAngles: RobotAngles;
  targetAngles: RobotAngles;
  headStyle: HeadStyle;
  lockedSegment: LockSegment;
  groundCollisionEnabled: boolean;
  cameraHeight: number;
};

type RobotStore = RobotSnapshot & {
  ballPosition: SceneObjectPosition;
  ballPlacementPosition: SceneObjectPosition;
  ballResetSerial: number;
  resetSerial: number;
  cameraResetSerial: number;
  setAngles: (angles: Partial<RobotAngles>) => void;
  setCameraHeight: (height: number) => void;
  setGroundCollisionEnabled: (enabled: boolean) => void;
  setHeadStyle: (style: HeadStyle) => void;
  setLockedSegment: (segment: LockSegment) => void;
  setBallPosition: (position: SceneObjectPosition) => void;
  syncBallPosition: (position: SceneObjectPosition) => void;
  resetCamera: () => void;
  resetBall: () => void;
  resetPose: () => void;
};

function cloneAngles(angles: RobotAngles): RobotAngles {
  return { ...angles };
}

export const useRobotStore = create<RobotStore>((set) => ({
  currentAngles: cloneAngles(neutralAngles),
  targetAngles: cloneAngles(neutralAngles),
  headStyle: "minecraft",
  lockedSegment: null,
  groundCollisionEnabled: true,
  cameraHeight: cameraHeightConfig.neutral,
  ballPosition: { ...ballPositionConfig.initial },
  ballPlacementPosition: { ...ballPositionConfig.initial },
  ballResetSerial: 0,
  resetSerial: 0,
  cameraResetSerial: 0,

  setAngles: (incomingAngles) => {
    set((state) => {
      const nextAngles = { ...state.currentAngles };

      for (const [joint, value] of Object.entries(incomingAngles) as [JointName, number][]) {
        if (jointNames.includes(joint)) {
          nextAngles[joint] = clampJointAngle(joint, value);
        }
      }

      return {
        currentAngles: nextAngles,
        targetAngles: { ...nextAngles },
      };
    });
  },

  setLockedSegment: (segment) => {
    set({ lockedSegment: segment });
  },

  setBallPosition: (position) => {
    const nextPosition = clampBallPosition(position);

    set((state) => ({
      ballPosition: nextPosition,
      ballPlacementPosition: nextPosition,
      ballResetSerial: state.ballResetSerial + 1,
    }));
  },

  syncBallPosition: (position) => {
    set({ ballPosition: { ...position } });
  },

  setGroundCollisionEnabled: (enabled) => {
    set({ groundCollisionEnabled: enabled });
  },

  setHeadStyle: (style) => {
    set({ headStyle: style });
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

  resetBall: () => {
    set((state) => ({
      ballPosition: { ...ballPositionConfig.initial },
      ballPlacementPosition: { ...ballPositionConfig.initial },
      ballResetSerial: state.ballResetSerial + 1,
    }));
  },

  resetPose: () => {
    set((state) => ({
      currentAngles: cloneAngles(neutralAngles),
      targetAngles: cloneAngles(neutralAngles),
      resetSerial: state.resetSerial + 1,
    }));
  },
}));
