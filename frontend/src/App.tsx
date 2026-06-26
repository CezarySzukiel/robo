import { ControlPanel } from "./components/ControlPanel";
import { RobotScene } from "./components/RobotScene";

export default function App() {
  return (
    <main className="app-shell">
      <RobotScene />
      <ControlPanel />
    </main>
  );
}
