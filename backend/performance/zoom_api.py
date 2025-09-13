import jwt
import requests
from datetime import datetime, timedelta

def create_zoom_meeting(api_key, api_secret, topic, start_time, duration, recurrence=None):
    payload = {
        'iss': api_key,
        'exp': int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    }
    token = jwt.encode(payload, api_secret, algorithm='HS256')
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'topic': topic,
        'type': 2,  # Scheduled meeting
        'start_time': start_time,
        'duration': duration,
        'timezone': 'UTC',
    }
    if recurrence:
        payload['recurrence'] = recurrence
    response = requests.post(
        'https://api.zoom.us/v2/users/me/meetings',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

def update_zoom_meeting(api_key, api_secret, meeting_id, topic, start_time, duration, recurrence=None):
    payload = {
        'iss': api_key,
        'exp': int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    }
    token = jwt.encode(payload, api_secret, algorithm='HS256')
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'topic': topic,
        'start_time': start_time,
        'duration': duration,
        'timezone': 'UTC',
    }
    if recurrence:
        payload['recurrence'] = recurrence
    response = requests.patch(
        f'https://api.zoom.us/v2/meetings/{meeting_id}',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()