import { Camera, RotateCcw } from "lucide-react";
import {
  type AnchorableSegment,
  type JointName,
  cameraHeightConfig,
  jointConfig,
  lockSegments,
} from "../robot/robot-config";
import { lockSegment, resetCamera, resetPose, setCameraHeight, setJoint } from "../robot/robot-api";
import { useRobotStore } from "../robot/robot-store";

const leftJoints: JointName[] = ["leftHip", "leftKnee", "leftAnkle"];
const rightJoints: JointName[] = ["rightHip", "rightKnee", "rightAnkle"];
const armJoints: JointName[] = [
  "leftShoulder",
  "leftShoulderSide",
  "rightShoulder",
  "rightShoulderSide",
];

const segmentLabels: Record<AnchorableSegment, string> = {
  leftFoot: "Lewa stopa",
  rightFoot: "Prawa stopa",
  pelvis: "Miednica",
  torso: "Tułów",
};

function formatAngle(value: number) {
  return `${value.toFixed(1)}°`;
}

function CameraHeightControl() {
  const cameraHeight = useRobotStore((state) => state.cameraHeight);

  return (
    <div className="camera-control" title={cameraHeightConfig.label}>
      <button
        aria-label="Reset położenia kamery"
        className="camera-control__icon"
        onClick={() => resetCamera()}
        title="Reset położenia kamery"
        type="button"
      >
        <Camera aria-hidden="true" size={18} />
      </button>
      <input
        aria-label={`${cameraHeightConfig.label} slider`}
        className="camera-control__range"
        max={cameraHeightConfig.max}
        min={cameraHeightConfig.min}
        onChange={(event) => setCameraHeight(Number(event.target.value))}
        step={cameraHeightConfig.step}
        type="range"
        value={cameraHeight}
      />
      <input
        aria-label={`${cameraHeightConfig.label} value`}
        className="camera-control__number"
        max={cameraHeightConfig.max}
        min={cameraHeightConfig.min}
        onChange={(event) => setCameraHeight(Number(event.target.value))}
        step={cameraHeightConfig.step}
        type="number"
        value={Number(cameraHeight.toFixed(1))}
      />
    </div>
  );
}

function JointControl({ joint }: { joint: JointName }) {
  const targetAngle = useRobotStore((state) => state.targetAngles[joint]);
  const currentAngle = useRobotStore((state) => state.currentAngles[joint]);
  const config = jointConfig[joint];

  const updateValue = (value: number, durationMs: number) => {
    setJoint(joint, value, durationMs);
  };

  return (
    <label className="joint-control">
      <span className="joint-control__topline">
        <span>{config.label}</span>
        <span className="joint-control__readout">{formatAngle(currentAngle)}</span>
      </span>
      <span className="joint-control__inputs">
        <input
          aria-label={`${config.label} slider`}
          className="joint-control__range"
          max={config.max}
          min={config.min}
          onChange={(event) => updateValue(Number(event.target.value), 35)}
          step={config.step}
          type="range"
          value={targetAngle}
        />
        <input
          aria-label={`${config.label} angle`}
          className="joint-control__number"
          max={config.max}
          min={config.min}
          onChange={(event) => updateValue(Number(event.target.value), 160)}
          step={config.step}
          type="number"
          value={Number(targetAngle.toFixed(1))}
        />
      </span>
    </label>
  );
}

function JointGroup({ joints, title }: { joints: JointName[]; title: string }) {
  return (
    <section className="control-section" aria-label={title}>
      <h2>{title}</h2>
      <div className="joint-list">
        {joints.map((joint) => (
          <JointControl joint={joint} key={joint} />
        ))}
      </div>
    </section>
  );
}

export function ControlPanel() {
  const lockedSegment = useRobotStore((state) => state.lockedSegment);

  return (
    <aside className="control-panel" aria-label="Aktualne kąty stawów">
      <header className="control-panel__header">
        <div>
          <p className="control-panel__eyebrow">Robot 3D</p>
          <h1>Aktualne kąty</h1>
        </div>
        <button className="icon-button" onClick={() => resetPose()} title="Reset pozycji" type="button">
          <RotateCcw aria-hidden="true" size={18} />
          <span>Reset</span>
        </button>
      </header>

      <div className="control-panel__body">
        <div className="control-panel__main">
          <div className="lock-row">
            <label htmlFor="lock-segment">Blokada</label>
            <select
              id="lock-segment"
              onChange={(event) => {
                const value = event.target.value;
                lockSegment(value === "none" ? null : (value as AnchorableSegment));
              }}
              value={lockedSegment ?? "none"}
            >
              <option value="none">Brak</option>
              {lockSegments.map((segment) => (
                <option key={segment} value={segment}>
                  {segmentLabels[segment]}
                </option>
              ))}
            </select>
          </div>

          <JointGroup title="Lewa noga" joints={leftJoints} />
          <JointGroup title="Prawa noga" joints={rightJoints} />
          <JointGroup title="Ramiona" joints={armJoints} />
        </div>

        <div className="camera-rail" aria-label="Kamera">
          <CameraHeightControl />
        </div>
      </div>
    </aside>
  );
}
