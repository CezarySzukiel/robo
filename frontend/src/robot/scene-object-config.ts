export type SceneObjectPosition = {
  x: number;
  y: number;
  z: number;
};

export const BALL_RADIUS = 0.22;

export const GROUND_WIDTH = 24;
export const GROUND_MIN_Z = -5;
export const GROUND_MAX_Z = 2000;
export const GROUND_DEPTH = GROUND_MAX_Z - GROUND_MIN_Z;
export const GROUND_CENTER_Z = (GROUND_MIN_Z + GROUND_MAX_Z) / 2;

export const ballPositionConfig = {
  initial: { x: -0.34, y: BALL_RADIUS + 0.025, z: 1.12 },
  min: { x: -11.5, y: BALL_RADIUS, z: -4.5 },
  max: { x: 11.5, y: 8, z: 24.5 },
  step: 0.1,
} as const;

export function clampBallPosition(position: SceneObjectPosition): SceneObjectPosition {
  return {
    x: Math.min(ballPositionConfig.max.x, Math.max(ballPositionConfig.min.x, position.x)),
    y: Math.min(ballPositionConfig.max.y, Math.max(ballPositionConfig.min.y, position.y)),
    z: Math.min(ballPositionConfig.max.z, Math.max(ballPositionConfig.min.z, position.z)),
  };
}
