import { robotApi } from "./robot-api";

const DEFAULT_BACKEND_URL = "ws://localhost:8000/ws/robot";
const RECONNECT_DELAY_MS = 1500;

export function connectToRobotBackend() {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let stopped = false;

  const connect = () => {
    const url = import.meta.env.VITE_ROBOT_WS_URL ?? DEFAULT_BACKEND_URL;
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      socket?.send(JSON.stringify({ type: "frontend_ready" }));
    });

    socket.addEventListener("message", (event) => {
      let command: unknown;
      try {
        command = JSON.parse(String(event.data));
      } catch {
        socket?.send(JSON.stringify({ type: "error", message: "Invalid JSON." }));
        return;
      }

      const result = robotApi.applyRobotCommand(command);
      socket?.send(JSON.stringify(result));
    });

    socket.addEventListener("close", () => {
      socket = null;
      if (!stopped) {
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      }
    });
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
