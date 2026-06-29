# Prosty backend FastAPI

Backend przekazuje komendy z HTTP do otwartego frontendu przez WebSocket. Kod w
`main.py` jest celowo funkcyjny: używa zwykłych funkcji, list i słowników, bez
klas i bez adnotacji typów.

## Uruchomienie

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Następnie uruchom frontend na `http://localhost:5173`.

## Najprostszy ruch

Wyślij nazwę stawu, kąt i opcjonalny czas ruchu w milisekundach:

```bash
curl -X POST http://localhost:8000/api/robot/joint/move \
  -H 'Content-Type: application/json' \
  -d '{"joint": "rightKnee", "angle": 80, "duration": 700}'
```

To samo w Pythonie:

```python
import requests


def move(joint, angle, duration=500):
    requests.post(
        "http://localhost:8000/api/robot/joint/move",
        json={"joint": joint, "angle": angle, "duration": duration},
    ).raise_for_status()


move("rightHip", -30)
move("rightKnee", 80)
move("rightAnkle", -20)
```

Gotowy przykład wykonujący proste kopnięcie znajduje się w `driver.py`:

```bash
python driver.py
```

Dostępne stawy: `headYaw`, `headPitch`, `waist`, `leftShoulder`,
`leftShoulderSide`, `leftElbow`, `rightShoulder`, `rightShoulderSide`,
`rightElbow`, `leftHip`, `leftKnee`, `leftAnkle`, `rightHip`, `rightKnee`,
`rightAnkle`.

## Cała prawa noga

Kilka stawów można wysłać jednym żądaniem:

```bash
curl -X POST http://localhost:8000/api/robot/right-leg/move \
  -H 'Content-Type: application/json' \
  -d '{
    "hip": {"angle": -30, "duration": 500},
    "knee": {"angle": 80, "duration": 500},
    "ankle": {"angle": -20, "duration": 500}
  }'
```

Endpoint zwraca `503`, dopóki frontend nie jest połączony.
