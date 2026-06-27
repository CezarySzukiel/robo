pomysł na apkę do nauki pythona. na froncie zrobić w react robota 3d, z udostępnianiem api i apka w pythonie niech steruje tym robotem przez api

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Lokalny adres frontendu: `http://localhost:5173/`.

Frontend wystawia kontrakt sterowania w module `src/robot/robot-api.ts` oraz pomocniczo w przeglądarce jako `window.robotApi`, np.:

```js
window.robotApi.applyRobotCommand({
  type: "set_joint",
  joint: "leftHip",
  angleDeg: 30,
});
```

Komendy stawów działają natychmiast, dokładnie tak jak suwaki.

## Backend

Szkielet FastAPI w `backend/` przekazuje komendy do frontendu przez WebSocket. Instrukcja uruchomienia i przykład sterowania prawą nogą znajdują się w `backend/readme.md`.
