export type BallPhysicsState = {
  position: { x: number; y: number; z: number };
  linearVelocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
};

type BallStateReader = () => BallPhysicsState;

let activeBallStateReader: BallStateReader | null = null;

export function registerBallStateReader(reader: BallStateReader) {
  activeBallStateReader = reader;

  return () => {
    if (activeBallStateReader === reader) {
      activeBallStateReader = null;
    }
  };
}

export function getBallPhysicsState(): BallPhysicsState | null {
  return activeBallStateReader?.() ?? null;
}
