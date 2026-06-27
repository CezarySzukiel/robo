# Frontend robota — API sterowania

Frontend udostępnia API do sterowania robotem 3D jako `window.robotApi`. Można go używać między innymi z konsoli przeglądarki, skryptów uruchamianych na stronie albo przyszłej warstwy komunikacji z backendem.

## Uruchomienie

```bash
npm install
npm run dev
```

Po otwarciu `http://localhost:5173/` API jest dostępne w konsoli DevTools:

```js
window.robotApi.getRobotState();
```

W dalszych przykładach pomijamy prefiks `window`:

```js
const api = window.robotApi;
```

## Najprostsze przykłady

```js
// Obróć głowę o 30 stopni.
api.setJoint("headYaw", 30);

// Ustaw kilka stawów jednocześnie.
api.setJoints({
  leftShoulder: 70,
  leftElbow: 90,
  rightShoulder: 70,
  rightElbow: 90,
});

// Przywróć pozycję neutralną.
api.resetPose();

// Płynnie zegnij prawe kolano po 200 ms, z prędkością 60°/s.
api.moveJoint({
  joint: "rightKnee",
  fromAngleDeg: 0,
  toAngleDeg: 90,
  speedDegPerSecond: 60,
  delayMs: 200,
});

// Zablokuj lewą stopę, a później usuń blokadę.
api.lockSegment("leftFoot");
api.lockSegment(null);
```

Kąty podaje się w stopniach. Wartości wykraczające poza zakres stawu są automatycznie ograniczane do jego minimum lub maksimum.

## Odczyt stanu robota

```js
const state = api.getRobotState();
```

Zwracany obiekt ma postać:

```ts
type RobotSnapshot = {
  currentAngles: Record<JointName, number>;
  targetAngles: Record<JointName, number>;
  headStyle: "round" | "minecraft";
  lockedSegment: "leftFoot" | "rightFoot" | "pelvis" | "torso" | null;
  groundCollisionEnabled: boolean;
  cameraHeight: number;
};
```

Można również nasłuchiwać zmian. Funkcja zwracana przez `subscribeRobotState` usuwa subskrypcję:

```js
const unsubscribe = api.subscribeRobotState((state) => {
  console.log("Nowy stan:", state);
});

// Gdy subskrypcja nie jest już potrzebna:
unsubscribe();
```

## Metody API

### Sterowanie pozą

- `setJoint(joint, angleDeg)` — ustawia jeden staw.
- `setJoints(anglesDeg)` — ustawia wiele stawów na podstawie obiektu `{ nazwaStawu: kąt }`.
- `moveJoint(motion)` — planuje płynny ruch stawu z opóźnieniem oraz czasem lub prędkością.
- `resetPose()` — przywraca neutralne kąty wszystkich stawów.
- `lockSegment(segment)` — blokuje wskazany segment w przestrzeni; `null` usuwa blokadę.
- `setGroundCollision(enabled)` — włącza lub wyłącza kolizję robota z podłożem.
- `setHeadStyle(style)` — zmienia wygląd głowy na `"round"` albo `"minecraft"`.

### Kamera

- `setCameraHeight(height)` — ustawia wysokość kamery w zakresie `0.2–6.5`.
- `resetCamera()` — przywraca domyślne ustawienie kamery i wysokość `3.4`.

### Piłka

- `getBallState()` — zwraca bieżącą pozycję oraz prędkości piłki albo `null`, jeśli fizyka piłki nie jest jeszcze aktywna.
- `setBallPosition({ x, y, z })` — przenosi piłkę; współrzędne są ograniczane do dozwolonego obszaru.
- `resetBall()` — przenosi piłkę do pozycji początkowej.

Przykład:

```js
api.setBallPosition({ x: 1, y: 2, z: 4 });

const ball = api.getBallState();
// {
//   position: { x, y, z },
//   linearVelocity: { x, y, z },
//   angularVelocity: { x, y, z }
// }
```

Metody zmieniające stan zwracają komunikat `{ type: "state", state: RobotSnapshot }`. Jest to stan bezpośrednio po przyjęciu zmiany.

## Nazwy i zakresy stawów

| Staw | Zakres (stopnie) | Pozycja neutralna |
| --- | ---: | ---: |
| `headYaw` | -90…90 | 0 |
| `headPitch` | -20…40 | 0 |
| `waist` | -15…120 | 0 |
| `leftShoulder` | -180…180 | 12 |
| `leftShoulderSide` | -80…80 | 0 |
| `leftElbow` | 0…135 | 14 |
| `rightShoulder` | -180…180 | 12 |
| `rightShoulderSide` | -80…80 | 0 |
| `rightElbow` | 0…135 | 14 |
| `leftHip` | -80…110 | 0 |
| `leftKnee` | 0…120 | 0 |
| `leftAnkle` | -45…45 | 0 |
| `rightHip` | -80…110 | 0 |
| `rightKnee` | 0…120 | 0 |
| `rightAnkle` | -45…45 | 0 |

## Komendy z walidacją

`applyRobotCommand(command)` jest przeznaczone dla danych pochodzących spoza frontendu, na przykład z przyszłego backendu lub WebSocketu. Sprawdza typ komendy, nazwy stawów oraz typy wartości i nigdy nie rzuca błędu walidacji — zwraca stan albo opis błędu.

```js
api.applyRobotCommand({
  type: "set_joint",
  joint: "leftElbow",
  angleDeg: 80,
});
// { type: "state", state: { ... } }

api.applyRobotCommand({
  type: "set_joint",
  joint: "unknown",
  angleDeg: 80,
});
// { type: "error", message: "Unknown joint." }
```

Obsługiwane komendy:

```ts
type RobotCommand =
  | { type: "set_joint"; joint: JointName; angleDeg: number }
  | { type: "set_joints"; anglesDeg: Partial<Record<JointName, number>> }
  | {
      type: "move_joint";
      joint: JointName;
      fromAngleDeg?: number;
      toAngleDeg: number;
      durationMs?: number;
      speedDegPerSecond?: number;
      delayMs?: number;
    }
  | { type: "lock_segment"; segment: "leftFoot" | "rightFoot" | "pelvis" | "torso" | null }
  | { type: "set_ground_collision"; enabled: boolean }
  | { type: "set_head_style"; style: "round" | "minecraft" }
  | { type: "reset_pose" }
  | { type: "set_camera_height"; height: number }
  | { type: "reset_camera" }
  | { type: "reset_ball" };
```

`setBallPosition` jest obecnie dostępne tylko jako metoda bezpośrednia — nie ma odpowiadającej mu komendy w `applyRobotCommand`.

### Połączenie z FastAPI

Po uruchomieniu strona automatycznie łączy się z `ws://localhost:8000/ws/robot`. Inny adres można ustawić przed zbudowaniem frontendu:

```bash
VITE_ROBOT_WS_URL=ws://localhost:8000/ws/robot npm run dev
```

Backend wysyła komendy JSON, frontend wykonuje je przez `applyRobotCommand` i odsyła wynik. Po zerwaniu połączenia frontend ponawia próbę co 1,5 sekundy. Implementacja klienta znajduje się w `src/robot/backend-connection.ts`.

## Użycie wewnątrz kodu TypeScript

Kod frontendu może importować API wraz z typami bez korzystania z obiektu globalnego:

```ts
import {
  robotApi,
  type RobotApi,
  type RobotCommand,
  type RobotCommandResult,
} from "./src/robot/robot-api";
```

Powyższa ścieżka zakłada import spoza katalogu `src`; w pliku znajdującym się bezpośrednio w `src` będzie to `./robot/robot-api`.

Źródłem prawdy dla kontraktu jest `src/robot/robot-api.ts`, a nazwy, limity i pozycje neutralne znajdują się w `src/robot/robot-config.ts`.
