# Mapa projektu

Projekt to aplikacja do nauki Pythona przez sterowanie robotem 3D. Aktualnie działa frontend; backend jest dopiero planowany.

## Gdzie czego szukać

- `frontend/` — aplikacja React 19 + TypeScript + Vite.
- `frontend/src/App.tsx` — główny układ: scena robota i panel sterowania.
- `frontend/src/components/RobotScene.tsx` — scena React Three Fiber, kamera, światła, podłoże i OrbitControls.
- `frontend/src/components/RobotModel.tsx` — geometria, hierarchia części i animowanie robota 3D.
- `frontend/src/components/ControlPanel.tsx` — suwaki stawów, blokowanie segmentów i sterowanie kamerą.
- `frontend/src/robot/robot-config.ts` — nazwy stawów, limity, pozycja neutralna i konfiguracja kamery; główne źródło konfiguracji.
- `frontend/src/robot/robot-store.ts` — stan Zustand oraz interpolowane animacje stawów.
- `frontend/src/robot/robot-api.ts` — publiczny kontrakt sterowania i walidacja komend; eksportowany także jako `window.robotApi` w `main.tsx`.
- `frontend/src/styles.css` — wszystkie style interfejsu.
- `backend/` — obecnie pusty (`.gitkeep`); docelowo API/WebSocket dla klientów w Pythonie.
- `readme.md` — krótki opis i uruchomienie projektu.
- `plan.md` — pierwotna, długa koncepcja architektury i dalszego rozwoju.

## Najczęstsze komendy

Uruchamiaj z katalogu `frontend/`:

```bash
npm install
npm run dev
npm run build
```

Dev server: `http://localhost:5173/`.

Nie edytuj ręcznie `frontend/node_modules/` ani `frontend/dist/` — to zależności i wynik buildu.
