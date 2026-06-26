import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { robotApi } from "./robot/robot-api";
import "./styles.css";

window.robotApi = robotApi;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
