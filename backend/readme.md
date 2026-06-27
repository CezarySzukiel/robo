# Backend FastAPI

Backend przyjmuje żądania HTTP i przekazuje komendy do otwartego frontendu przez WebSocket.

## Uruchomienie

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Następnie uruchom frontend na `http://localhost:5173`. Dokumentacja interaktywna backendu będzie dostępna pod `http://localhost:8000/docs`.

## Ruch prawej nogi

```bash
curl -X POST http://localhost:8000/api/robot/right-leg/move \
  -H 'Content-Type: application/json' \
  -d '{
    "hip": {
      "from_angle_deg": 0,
      "to_angle_deg": 45,
      "duration_ms": 700,
      "delay_ms": 0
    },
    "knee": {
      "from_angle_deg": 0,
      "to_angle_deg": 80,
      "speed_deg_per_second": 100,
      "delay_ms": 150
    },
    "ankle": {
      "from_angle_deg": 0,
      "to_angle_deg": -20,
      "duration_ms": 400,
      "delay_ms": 300
    }
  }'
```

Każdy staw może mieć własne parametry:

- `from_angle_deg` — kąt początkowy; pominięcie oznacza aktualny kąt w chwili startu,
- `to_angle_deg` — kąt końcowy,
- `delay_ms` — opóźnienie rozpoczęcia,
- `duration_ms` — czas ruchu albo
- `speed_deg_per_second` — prędkość, z której frontend wyliczy czas.

Jeśli podane są zarówno czas, jak i prędkość, używany jest `duration_ms`. Endpoint zwraca `503`, dopóki żaden frontend nie jest połączony.

Przykład w Pythonie:

```python
import requests

requests.post(
    "http://localhost:8000/api/robot/right-leg/move",
    json={
        "hip": {
            "from_angle_deg": 0,
            "to_angle_deg": 35,
            "speed_deg_per_second": 50,
            "delay_ms": 200,
        }
    },
).raise_for_status()
```
