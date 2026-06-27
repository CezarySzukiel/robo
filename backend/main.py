from typing import Annotated

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator


app = FastAPI(title="Robot learning API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, message: dict) -> int:
        delivered = 0
        stale: list[WebSocket] = []
        for websocket in self.connections:
            try:
                await websocket.send_json(message)
                delivered += 1
            except RuntimeError:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)
        return delivered


manager = ConnectionManager()


FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]
NonNegativeFloat = Annotated[FiniteFloat, Field(ge=0)]
PositiveFloat = Annotated[FiniteFloat, Field(gt=0)]


class JointMotion(BaseModel):
    from_angle_deg: FiniteFloat | None = None
    to_angle_deg: FiniteFloat
    duration_ms: NonNegativeFloat | None = None
    speed_deg_per_second: PositiveFloat | None = None
    delay_ms: NonNegativeFloat = 0

    @model_validator(mode="after")
    def require_duration_or_speed(self) -> "JointMotion":
        if self.duration_ms is None and self.speed_deg_per_second is None:
            raise ValueError("Podaj duration_ms albo speed_deg_per_second")
        return self

    def as_command(self, joint: str) -> dict:
        command = {
            "type": "move_joint",
            "joint": joint,
            "toAngleDeg": self.to_angle_deg,
            "delayMs": self.delay_ms,
        }
        if self.from_angle_deg is not None:
            command["fromAngleDeg"] = self.from_angle_deg
        if self.duration_ms is not None:
            command["durationMs"] = self.duration_ms
        if self.speed_deg_per_second is not None:
            command["speedDegPerSecond"] = self.speed_deg_per_second
        return command


class RightLegMotion(BaseModel):
    hip: JointMotion | None = None
    knee: JointMotion | None = None
    ankle: JointMotion | None = None

    @model_validator(mode="after")
    def require_at_least_one_joint(self) -> "RightLegMotion":
        if self.hip is None and self.knee is None and self.ankle is None:
            raise ValueError("Podaj ruch przynajmniej jednego stawu")
        return self


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "connected_frontends": len(manager.connections)}


@app.websocket("/ws/robot")
async def robot_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            # Frontend odsyła potwierdzenia, stan albo błąd wykonania komendy.
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/api/robot/right-leg/move", status_code=202)
async def move_right_leg(motion: RightLegMotion) -> dict:
    if not manager.connections:
        raise HTTPException(status_code=503, detail="Brak połączonego frontendu")

    commands = []
    for field, joint in (
        (motion.hip, "rightHip"),
        (motion.knee, "rightKnee"),
        (motion.ankle, "rightAnkle"),
    ):
        if field is not None:
            commands.append(field.as_command(joint))

    for command in commands:
        await manager.broadcast(command)

    return {
        "status": "accepted",
        "commands": commands,
        "connected_frontends": len(manager.connections),
    }
