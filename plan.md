Budowa sterowanego robota 3D w React oraz integracja z API do ćwiczeń w Pythonie

Modelowanie robota z hierarchią grup

W three.js każdy obiekt (Object3D) może mieć rodziców i dzieci. Grupowanie obiektów w hierarchii powoduje, że transformacje rodzica wpływają na wszystkie dzieci, ale każde dziecko można także przesuwać, skalować czy obracać niezależnie. Typowym przykładem jest ramię robota: poszczególne elementy są połączone stawami w hierarchii. Ruch podstawy przenosi całe ramię, ruch stawu środkowego wpływa na staw końcowy, a obrót ostatniego stawu nie pociąga za sobą innych elementów. Dzięki grupom unikamy skomplikowanej matematyki – trzy‑fiber automatycznie propaguje transformacje.

Dla prostego robota treningowego każdy segment (tłów, biodra, uda, łydki, stopy, ramiona, głowa) można zrealizować jako osobny Mesh (np. BoxGeometry, CylinderGeometry) z przypisaną Material. Następnie tworzymy grupy:

Robot – główna grupa. Obejmuje cały model.
Tułów – dziecko robot. Pozycjonowany na środku, do niego dodajemy głowę, ręce i grupę bioder.
Biodra – dziecko tułowia. Obejmuje dwie grupy nóg.
Noga (lewa/prawa) – grupa zawierająca udo, kolano i stopę. Udo jest rodzicem kolana, które jest rodzicem stopy. Każdy z tych elementów może mieć swoje Mesh z geometry, a kolano i stopa będą grupami obsługującymi obrót.

Hierarchia może być zagnieżdżona dowolnie głęboko – np. palce dłoni. Dzięki temu obrót uda wokół osi Y spowoduje podniesienie całej nogi, a obrót kolana zgięcie łydki, nie zmieniając pozycji uda.

Rigging a deformacje vs. proste grupy

W przypadku realistycznych postaci używa się riggowania: procesu tworzenia armatury (układu kości i stawów) przyczepionej do geometrii; kości umożliwiają zginanie i deformację siatki. Tutorial o animacji postaci w React Three Fiber opisuje, że armatury tworzą systemy kości i stawów, które pozwalają zginać geometrię, a animacje powstają poprzez ustawianie kluczowych pozycji między pozami. Do modelu treningowego nie potrzebujemy deformacji geometrii – wystarczy złożenie z oddzielnych brył. Jak podkreśla forum three.js, SkinnedMesh i Skeleton są potrzebne tylko wtedy, gdy pojedynczy mesh musi być pod wpływem wielu kości; jeśli animujemy całe bryły (np. cylindry ud i łydki), wystarczy włączyć je do hierarchii bez kości.

Tworzenie komponentów React
Scena – w komponencie <Canvas> definiujemy elementy środowiska: kamerę, światła (np. <ambientLight/>, <directionalLight/>), podłoże i nasz robot.
Robot – główny komponent, który tworzy strukturę grup i obsługuje sterowanie. Można użyć hooków useRef do przechowywania referencji do poszczególnych grup (np. hipRef, thighRef, kneeRef, footRef).
Klatka animacji – w useFrame odczytujemy aktualny stan stawów (przechowywany np. w Zustand lub useState) i aktualizujemy rotacje grup. useFrame jest wywoływany w każdej klatce i daje nam kontekst z rendererem, sceną i czasem delta, co pozwala płynnie aktualizować model.
Sterowanie – komponent, który podłącza się do serwera WebSocket i aktualizuje stan stawów zgodnie z nadchodzącymi komunikatami.

Przykład uproszczonego kodu (JSX; nie pokazuje wszystkich elementów):

function Robot() {
  const hipRef = useRef();
  const kneeRef = useRef();
  const footRef = useRef();
  const { state } = useRobotStore(); // Zustand/react state z wartościami kątów stawów

  useFrame(() => {
    // aktualizacja rotacji na podstawie stanu
    hipRef.current.rotation.x = state.hipAngle;
    kneeRef.current.rotation.x = state.kneeAngle;
    footRef.current.rotation.x = state.footAngle;
  });

  return (
    <group ref={hipRef} position={[0, 1, 0]}>
      <mesh geometry={<boxGeometry args={[0.3, 0.8, 0.3]} />} /> {/* udo */}
      <group ref={kneeRef} position={[0, -0.4, 0]}>
        <mesh geometry={<boxGeometry args={[0.25, 0.6, 0.25]} />} /> {/* łydka */}
        <group ref={footRef} position={[0, -0.35, 0]}>
          <mesh geometry={<boxGeometry args={[0.25, 0.1, 0.4]} />} /> {/* stopa */}
        </group>
      </group>
    </group>
  );
}
Projekt API do sterowania robotem
WebSocket jako kanał komunikacyjny

Sterowanie w czasie rzeczywistym wymaga dwukierunkowej komunikacji – do wysyłania poleceń i odbierania stanu. FastAPI umożliwia utworzenie endpointu websocket, w którym po zaakceptowaniu połączenia w pętli odbieramy wiadomości i wysyłamy odpowiedzi. W przykładzie z dokumentacji serwer odbiera wiadomość za pomocą await websocket.receive_text() i odpowiada await websocket.send_text(...). FastAPI pozwala wysyłać i odbierać również dane binarne oraz JSON.

Przykładowy serwer może wyglądać tak:

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# lista podłączonych klientów
clients = set()

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # data może wyglądać jak {"joint": "left_hip", "angle": 0.5}
            # przekazujemy wiadomość wszystkim klientom, np. frontendowi React
            for client in clients:
                await client.send_json(data)
    except Exception:
        clients.remove(websocket)

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
Specyfikacja komunikatów

Dla treningu w Pythonie komunikaty mogą być proste obiektami JSON:

{"command": "lift_leg", "leg": "left", "angle": 30} – podniesienie nogi o 30° (rotacja w biodrze).
{"command": "bend_knee", "leg": "left", "angle": 45} – zgięcie kolana o 45°.
{"command": "step_forward", "leg": "left", "distance": 0.5} – krok do przodu: robot najpierw podnosi nogę, zgina kolano, przenosi ją wzdłuż osi Z, a następnie opuszcza.

Front‑end React odbiera te polecenia, aktualizuje stan w Zustand/React i animuje robot w useFrame. Dodatkowo można wysyłać z front‑endu do Pythona zwrotną informację o aktualnym położeniu końcówki nogi; w three.js funkcja getWorldPosition() pozwala pobrać globalne współrzędne obiektu.

Klient Python

Do sterowania z Pythona można użyć biblioteki websockets lub websocket-client. Przykład asynchronicznego klienta:

import asyncio
import websockets
import json

async def control_robot():
    uri = 'ws://localhost:8000/ws'
    async with websockets.connect(uri) as websocket:
        # podnieś lewą nogę
        await websocket.send(json.dumps({
            'command': 'lift_leg', 'leg': 'left', 'angle': 30
        }))
        # zgięcie kolana
        await websocket.send(json.dumps({
            'command': 'bend_knee', 'leg': 'left', 'angle': 45
        }))
        # krok do przodu
        await websocket.send(json.dumps({
            'command': 'step_forward', 'leg': 'left', 'distance': 0.5
        }))

asyncio.run(control_robot())
Optymalizacja strumienia danych

Gdy robot reaguje na wiele drobnych aktualizacji (np. użytkownik steruje joystickiem), częstotliwość wiadomości może być wysoka. Artykuł SitePoint o strumieniowaniu danych w React wskazuje kilka technik: bufrować przychodzące wiadomości w useRef, opróżniać bufor w klatce animacji (requestAnimationFrame) przez pojedyncze wywołanie setState, memoizować komponenty i ograniczać długość tablicy stanu, a przy ekstremalnie wysokiej częstotliwości aktualizować bezpośrednio DOM (lub w R3F referencje). Implementując te wskazówki w komponencie odbierającym dane z WebSocket, zapewnimy płynność animacji i brak przeciążeń Reacta.

Podstawowe ruchy robota

Poniższe czynności można realizować poprzez proste rotacje lub translacje na odpowiednich grupach robota:

Ruch	Akcja w three.js	Opis
Podniesienie nogi	Obrót grupy uda wokół osi X (lub Y) w biodrze	Ustawia wartość hipAngle dodatnio dla unoszenia nogi do przodu; ujemnie – do tyłu.
Zgięcie kolana	Obrót grupy łydki (kolana) wokół osi X	Po podniesieniu nogi zmieniamy kneeAngle; ogranicz ruch do realistycznego zakresu (np. 0–90°).
Krok do przodu	Sekwencja: podnieś nogę → zegnij kolano → przesuń całą nogę (grupę uda) wzdłuż osi Z → wyprostuj kolano → opuść nogę	Ruch translacyjny można uzyskać przez animację position.z całej grupy nogi.
Postawienie stopy na ziemi	Ustawienie hipAngle i kneeAngle z powrotem na 0	Zapewnia powrót do pozycji spoczynkowej.
Podstawowe ruchy rąk (opcjonalnie)	Obrót grupy ramienia wokół osi Y; obrót łokcia	Pozwala na gesty, np. machanie.

Każde polecenie można animować poprzez interpolację (np. biblioteka tween.js) – forum three.js sugeruje, że Tween.js lepiej nadaje się do ręcznych animacji, gdyż oferuje wiele krzywych interpolacji. Można więc wysyłać z backendu nie tylko docelowy kąt, ale też czas trwania i kształt easing.

Rozszerzenia: kinematyka odwrotna i fizyka

Forward kinematics oblicza położenie końcówki łańcucha kinematycznego (np. stopy) na podstawie znanych wartości kątów stawów. Inverse kinematics (IK) to odwrotny problem: oblicza parametry stawów potrzebne do ustawienia końcówki w zadanym miejscu. W prostym robocie można wyliczać kąty analitycznie. Biblioteka three‑ik wykorzystuje algorytm FABRIK (Forward and Backward Reaching Inverse Kinematics), w którym solver iteracyjnie przesuwa stawy w kierunku celu i dopasowuje długości kości. Dzięki temu można wyznaczać kąty w czasie rzeczywistym (np. manipulatora) zamiast sterować bezpośrednio kątami. R3F umożliwia integrację trzecich bibliotek three.js – można utworzyć IKChain i przekazywać docelowe położenie stopy.

Wnioski i rekomendacje
Deklaratywny model – używając React Three Fiber tworzymy robota jako złożenie wielu brył w hierarchii grup. Transformacje rodzica automatycznie wpływają na dzieci, co upraszcza sterowanie i odwzorowuje rzeczywiste zachowanie robotów.
Czyste sterowanie – do ręcznych animacji wystarczą rotacje grup; nie ma potrzeby tworzyć SkinnedMesh i armatury, dopóki nie musimy deformować pojedynczych siatek.
Komunikacja w czasie rzeczywistym – FastAPI oferuje prosty sposób utworzenia endpointu WebSocket, który odbiera i wysyła wiadomości JSON. Pythonowy klient może wysyłać polecenia sterujące robotem; React Three Fiber reaguje na nie w useFrame.
Zarządzanie stanem – warto użyć Zustand, MobX lub useReducer do trzymania stanu kątów i położeń stawów, dzięki czemu wiele komponentów może reagować na zmiany; w R3F można aktualizować referencje w useFrame.
Optymalizacja – przy dużej częstotliwości komunikatów należy buforować je i aktualizować stan raz na klatkę (np. requestAnimationFrame), memoizować komponenty i skracać listy stanu, co rekomenduje artykuł SitePoint.
Możliwości rozwoju – można dodać bardziej złożone ruchy (równowaga, podskoki), wprowadzić fizykę (np. Rapier lub Cannon.js) i implementować kinematykę odwrotną z biblioteką three‑ik. W przyszłości można użyć gotowych modeli GLTF/GLB z riggami i odtwarzać animacje (np. Mixamo), ale do prostych ćwiczeń w Pythonie złożony model z prostych brył jest w zupełności wystarczający.

Taki system pozwoli stworzyć interaktywną aplikację treningową, w której użytkownicy piszą programy w Pythonie i na żywo obserwują efekty sterowania robotem w przeglądarce.