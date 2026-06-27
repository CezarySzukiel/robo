import { ControlPanel } from "./components/ControlPanel";
import { ObjectsPanel } from "./components/ObjectsPanel";
import { RobotScene } from "./components/RobotScene";

export default function App() {
  return (
    <main className="app-shell">
      <RobotScene />
      <ControlPanel />
      <ObjectsPanel />
    </main>
  );
}
