import jwt
import requests
from datetime import datetime, timedelta

def create_zoom_meeting(api_key, api_secret, topic, start_time, duration, recurrence=None):
    print(f"Creating Zoom meeting: {topic} (start: {start_time}, duration: {duration})")
    payload = {
        'iss': api_key,
        'exp': int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    }
    print(f"Generating Zoom JWT with payload: {payload}")
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
        print(f"Zoom meeting recurrence: {recurrence}")
        payload['recurrence'] = recurrence
    try:
        response = requests.post(
            'https://api.zoom.us/v2/users/me/meetings',
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        response_data = response.json()
        print(f"Zoom meeting created: ID={response_data['id']}, Join URL={response_data['join_url']}")
        return response_data
    except requests.RequestException as e:
        print(f"Error creating Zoom meeting: {e}")
        raise

def update_zoom_meeting(api_key, api_secret, meeting_id, topic, start_time, duration, recurrence=None):
    print(f"Updating Zoom meeting: ID={meeting_id}, Topic={topic}")
    payload = {
        'iss': api_key,
        'exp': int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    }
    print(f"Generating Zoom JWT (update) with payload: {payload}")
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
        print(f"Zoom meeting recurrence (update): {recurrence}")
        payload['recurrence'] = recurrence
    try:
        response = requests.patch(
            f'https://api.zoom.us/v2/meetings/{meeting_id}',
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        response_data = response.json()
        print(f"Zoom meeting updated: Join URL={response_data['join_url']}")
        return response_data
    except requests.RequestException as e:
        print(f"Error updating Zoom meeting: {e}")
        raise