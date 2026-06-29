import time

import requests

ROBOT_URL = "http://localhost:8000/api/robot/joint/move"


def move(joint, angle, duration=500):
    response = requests.post(
        ROBOT_URL,
        json={
            "joint": joint,
            "angle": angle,
            "duration": duration,
        },
    )
    response.raise_for_status()


def kick():
    move("rightHip", -30)
    move("rightKnee", 80)
    time.sleep(0.6)

    move("rightHip", 60, 1)
    move("rightKnee", 0, 1)
    time.sleep(1)

    move("rightHip", 0)
    move("rightKnee", 0)


if __name__ == "__main__":
    kick()
