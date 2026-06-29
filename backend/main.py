from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import WebSocketRoute
from starlette.websockets import WebSocketDisconnect


app = FastAPI(title="Robot learning API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

connections = []


def disconnect(websocket):
    if websocket in connections:
        connections.remove(websocket)


async def robot_websocket(websocket):
    await websocket.accept()
    connections.append(websocket)

    try:
        while True:
            # Frontend odsyła stan robota albo błąd wykonania komendy.
            await websocket.receive_json()
    except WebSocketDisconnect:
        disconnect(websocket)


app.router.routes.append(WebSocketRoute("/ws/robot", robot_websocket))


async def send(command):
    if not connections:
        raise HTTPException(status_code=503, detail="Brak połączonego frontendu")

    disconnected = []
    for websocket in connections:
        try:
            await websocket.send_json(command)
        except RuntimeError:
            disconnected.append(websocket)

    for websocket in disconnected:
        disconnect(websocket)

    return command


def joint_command(joint, angle, duration=500, delay=0):
    return {
        "type": "move_joint",
        "joint": joint,
        "toAngleDeg": angle,
        "durationMs": duration,
        "delayMs": delay,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "connected_frontends": len(connections)}


@app.post("/api/robot/joint/move", status_code=202)
async def move_joint(command=Body(...)):
    robot_command = joint_command(
        command["joint"],
        command["angle"],
        command.get("duration", 500),
        command.get("delay", 0),
    )
    await send(robot_command)
    return {"status": "accepted", "command": robot_command}


@app.post("/api/robot/right-leg/move", status_code=202)
async def move_right_leg(motion=Body(...)):
    commands = []

    for part, joint in (
        ("hip", "rightHip"),
        ("knee", "rightKnee"),
        ("ankle", "rightAnkle"),
    ):
        if part in motion:
            move = motion[part]
            command = joint_command(
                joint,
                move["angle"],
                move.get("duration", 500),
                move.get("delay", 0),
            )
            commands.append(await send(command))

    return {"status": "accepted", "commands": commands}
