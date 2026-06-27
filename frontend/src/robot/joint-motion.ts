import { type JointName, clampJointAngle } from "./robot-config";
import { useRobotStore } from "./robot-store";

export type JointMotion = {
  joint: JointName;
  fromAngleDeg?: number;
  toAngleDeg: number;
  durationMs?: number;
  speedDegPerSecond?: number;
  delayMs?: number;
};

export type ScheduledJointMotion = {
  joint: JointName;
  fromAngleDeg: number;
  toAngleDeg: number;
  durationMs: number;
  delayMs: number;
};

const activeMotions = new Map<JointName, number>();

export function cancelJointMotion(joint: JointName) {
  const frameId = activeMotions.get(joint);
  if (frameId !== undefined) {
    cancelAnimationFrame(frameId);
    activeMotions.delete(joint);
  }
}

export function cancelAllJointMotions() {
  for (const joint of activeMotions.keys()) {
    cancelJointMotion(joint);
  }
}

export function scheduleJointMotion(motion: JointMotion): ScheduledJointMotion {
  cancelJointMotion(motion.joint);

  const currentAngle = useRobotStore.getState().currentAngles[motion.joint];
  const fromAngleDeg = clampJointAngle(
    motion.joint,
    motion.fromAngleDeg ?? currentAngle,
  );
  const toAngleDeg = clampJointAngle(motion.joint, motion.toAngleDeg);
  const delayMs = Math.max(0, motion.delayMs ?? 0);
  const distance = Math.abs(toAngleDeg - fromAngleDeg);
  const durationMs = Math.max(
    0,
    motion.durationMs ?? (distance / motion.speedDegPerSecond!) * 1000,
  );
  const scheduledAt = performance.now();

  const tick = (now: number) => {
    const elapsed = now - scheduledAt - delayMs;

    if (elapsed < 0) {
      activeMotions.set(motion.joint, requestAnimationFrame(tick));
      return;
    }

    const progress = durationMs === 0 ? 1 : Math.min(1, elapsed / durationMs);
    const angle = fromAngleDeg + (toAngleDeg - fromAngleDeg) * progress;
    useRobotStore.getState().setAngles({ [motion.joint]: angle });

    if (progress < 1) {
      activeMotions.set(motion.joint, requestAnimationFrame(tick));
    } else {
      activeMotions.delete(motion.joint);
    }
  };

  activeMotions.set(motion.joint, requestAnimationFrame(tick));

  return { joint: motion.joint, fromAngleDeg, toAngleDeg, durationMs, delayMs };
}
