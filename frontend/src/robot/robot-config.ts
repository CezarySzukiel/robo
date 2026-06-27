export const jointNames = [
  "headYaw",
  "headPitch",
  "waist",
  "leftShoulder",
  "leftShoulderSide",
  "leftElbow",
  "rightShoulder",
  "rightShoulderSide",
  "rightElbow",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "rightHip",
  "rightKnee",
  "rightAnkle",
] as const;

export type JointName = (typeof jointNames)[number];

export const headStyles = ["round", "minecraft"] as const;

export type HeadStyle = (typeof headStyles)[number];

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
  headYaw: { label: "Głowa lewo / prawo", min: -90, max: 90, step: 1, neutral: 0 },
  headPitch: { label: "Głowa dół / góra", min: -20, max: 40, step: 1, neutral: 0 },
  waist: { label: "Zgięcie w biodrach", min: -15, max: 120, step: 1, neutral: 0 },
  leftShoulder: { label: "Lewe ramię przód", min: -180, max: 180, step: 1, neutral: 12 },
  leftShoulderSide: { label: "Lewe ramię bok", min: -80, max: 80, step: 1, neutral: 0 },
  leftElbow: { label: "Lewy łokieć", min: 0, max: 135, step: 1, neutral: 14 },
  rightShoulder: { label: "Prawe ramię przód", min: -180, max: 180, step: 1, neutral: 12 },
  rightShoulderSide: { label: "Prawe ramię bok", min: -80, max: 80, step: 1, neutral: 0 },
  rightElbow: { label: "Prawy łokieć", min: 0, max: 135, step: 1, neutral: 14 },
  leftHip: { label: "Lewe biodro", min: -80, max: 110, step: 1, neutral: 0 },
  leftKnee: { label: "Lewe kolano", min: 0, max: 120, step: 1, neutral: 0 },
  leftAnkle: { label: "Lewy skokowy", min: -45, max: 45, step: 1, neutral: 0 },
  rightHip: { label: "Prawe biodro", min: -80, max: 110, step: 1, neutral: 0 },
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

export function isHeadStyle(value: unknown): value is HeadStyle {
  return typeof value === "string" && headStyles.includes(value as HeadStyle);
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
