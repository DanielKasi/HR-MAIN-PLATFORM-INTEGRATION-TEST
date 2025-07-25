import requests


def create_zoom_meeting(access_token, topic, start_time, duration=60):
    url = "https://api.zoom.us/v2/users/me/meetings"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "topic": topic,
        "type": 2,
        "start_time": start_time,
        "duration": duration,
        "timezone": "UTC",
        "settings": {
            "join_before_host": True,
            "approval_type": 0,
            "registration_type": 1,
            "mute_upon_entry": True,
            "waiting_room": True,
        },
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f"Zoom API error: {response.status_code} {response.text}")
