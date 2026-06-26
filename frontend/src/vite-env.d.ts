/// <reference types="vite/client" />

import type { robotApi } from "./robot/robot-api";

declare global {
  interface Window {
    robotApi: typeof robotApi;
  }
}
