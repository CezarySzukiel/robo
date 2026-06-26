export const jointNames = [
  "leftShoulder",
  "leftShoulderSide",
  "rightShoulder",
  "rightShoulderSide",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "rightHip",
  "rightKnee",
  "rightAnkle",
] as const;

export type JointName = (typeof jointNames)[number];

export type LockSegment = "leftFoot" | "rightFoot" | "pelvis" | "torso" | null;

export type AnchorableSegment = Exclude<LockSegment, null>;

export const lockSegments = ["leftFoot", "rightFoot", "pelvis", "torso"] as const;

export type JointConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
  neutral: number;
};

export const jointConfig: Record<JointName, JointConfig> = {
  leftShoulder: { label: "Lewe ramię przód", min: -95, max: 95, step: 1, neutral: 12 },
  leftShoulderSide: { label: "Lewe ramię bok", min: -80, max: 80, step: 1, neutral: 0 },
  rightShoulder: { label: "Prawe ramię przód", min: -95, max: 95, step: 1, neutral: 12 },
  rightShoulderSide: { label: "Prawe ramię bok", min: -80, max: 80, step: 1, neutral: 0 },
  leftHip: { label: "Lewe biodro", min: -80, max: 80, step: 1, neutral: 0 },
  leftKnee: { label: "Lewe kolano", min: 0, max: 120, step: 1, neutral: 0 },
  leftAnkle: { label: "Lewy skokowy", min: -45, max: 45, step: 1, neutral: 0 },
  rightHip: { label: "Prawe biodro", min: -80, max: 80, step: 1, neutral: 0 },
  rightKnee: { label: "Prawe kolano", min: 0, max: 120, step: 1, neutral: 0 },
  rightAnkle: { label: "Prawy skokowy", min: -45, max: 45, step: 1, neutral: 0 },
};

export const neutralAngles = jointNames.reduce(
  (angles, joint) => ({
    ...angles,
    [joint]: jointConfig[joint].neutral,
  }),
  {} as Record<JointName, number>,
);

export const DEFAULT_DURATION_MS = 260;

export const cameraHeightConfig = {
  label: "Wysokość kamery",
  min: 0.2,
  max: 6.5,
  step: 0.1,
  neutral: 3.4,
} as const;

export function isJointName(value: unknown): value is JointName {
  return typeof value === "string" && jointNames.includes(value as JointName);
}

export function isLockSegment(value: unknown): value is LockSegment {
  return value === null || lockSegments.includes(value as AnchorableSegment);
}

export function clampJointAngle(joint: JointName, angleDeg: number) {
  const config = jointConfig[joint];
  return Math.min(config.max, Math.max(config.min, angleDeg));
}

export function clampCameraHeight(height: number) {
  return Math.min(cameraHeightConfig.max, Math.max(cameraHeightConfig.min, height));
}
