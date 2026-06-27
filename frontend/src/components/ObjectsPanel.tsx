import { ChevronDown, ChevronUp, CircleDot, LocateFixed } from "lucide-react";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { resetBall, setBallPosition } from "../robot/robot-api";
import {
  type SceneObjectPosition,
  ballPositionConfig,
} from "../robot/scene-object-config";
import { useRobotStore } from "../robot/robot-store";

type CoordinateAxis = keyof SceneObjectPosition;

const coordinateLabels: Record<CoordinateAxis, string> = {
  x: "X",
  y: "Y",
  z: "Z",
};

function CoordinateInput({ axis, value }: { axis: CoordinateAxis; value: number }) {
  const [draft, setDraft] = useState(value.toFixed(2));
  const [isEditing, setIsEditing] = useState(false);
  const skipNextBlurCommit = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value.toFixed(2));
    }
  }, [isEditing, value]);

  const commitValue = (rawValue: string) => {
    const nextValue = Number(rawValue);

    if (Number.isFinite(nextValue)) {
      const currentPosition = useRobotStore.getState().ballPosition;
      setBallPosition({ ...currentPosition, [axis]: nextValue });
    } else {
      setDraft(value.toFixed(2));
    }

    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      skipNextBlurCommit.current = true;
      commitValue(event.currentTarget.value);
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      const currentValue = value.toFixed(2);
      skipNextBlurCommit.current = true;
      event.currentTarget.value = currentValue;
      setDraft(currentValue);
      setIsEditing(false);
      event.currentTarget.blur();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (skipNextBlurCommit.current) {
      skipNextBlurCommit.current = false;
      return;
    }

    commitValue(event.currentTarget.value);
  };

  return (
    <label className="coordinate-field">
      <span>{coordinateLabels[axis]}</span>
      <input
        aria-label={`Pozycja piłki ${coordinateLabels[axis]}`}
        max={ballPositionConfig.max[axis]}
        min={ballPositionConfig.min[axis]}
        onBlur={handleBlur}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setIsEditing(true)}
        onKeyDown={handleKeyDown}
        step={ballPositionConfig.step}
        type="number"
        value={draft}
      />
    </label>
  );
}

export function ObjectsPanel() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isBallOpen, setIsBallOpen] = useState(true);
  const panelContentId = useId();
  const ballContentId = useId();
  const ballPosition = useRobotStore((state) => state.ballPosition);

  return (
    <aside className="objects-panel" aria-label="Przedmioty na scenie">
      <button
        aria-controls={panelContentId}
        aria-expanded={isPanelOpen}
        className="objects-panel__toggle"
        onClick={() => setIsPanelOpen((open) => !open)}
        type="button"
      >
        <span className="objects-panel__title">
          <LocateFixed aria-hidden="true" size={18} />
          Przedmioty
        </span>
        {isPanelOpen ? (
          <ChevronUp aria-hidden="true" size={18} />
        ) : (
          <ChevronDown aria-hidden="true" size={18} />
        )}
      </button>

      <div className="objects-panel__content" hidden={!isPanelOpen} id={panelContentId}>
        <section className="object-card" data-open={isBallOpen}>
          <button
            aria-controls={ballContentId}
            aria-expanded={isBallOpen}
            className="object-card__toggle"
            onClick={() => setIsBallOpen((open) => !open)}
            type="button"
          >
            <span>
              <CircleDot aria-hidden="true" size={17} />
              Piłka
            </span>
            {isBallOpen ? (
              <ChevronUp aria-hidden="true" size={17} />
            ) : (
              <ChevronDown aria-hidden="true" size={17} />
            )}
          </button>

          <div className="object-card__content" hidden={!isBallOpen} id={ballContentId}>
            <p>Położenie</p>
            <div className="coordinates-grid">
              <CoordinateInput axis="x" value={ballPosition.x} />
              <CoordinateInput axis="y" value={ballPosition.y} />
              <CoordinateInput axis="z" value={ballPosition.z} />
            </div>
            <button className="object-card__reset" onClick={() => resetBall()} type="button">
              Ustaw przed robotem
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
