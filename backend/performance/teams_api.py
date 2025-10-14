import msal
import requests
import os

def get_teams_access_token(client_id, client_secret, tenant_id):
    print(f"Acquiring Teams access token for tenant_id: {tenant_id}")
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=f'https://login.microsoftonline.com/{tenant_id}',
    )
    result = app.acquire_token_for_client(scopes=['https://graph.microsoft.com/.default'])
    if 'access_token' in result:
        print("Teams access token acquired successfully")
        return result['access_token']
    error = result.get('error_description', 'Unknown error')
    print(f"Error acquiring Teams access token: {error}")
    raise Exception(f"Error acquiring Teams access token: {error}")

def create_teams_meeting(client_id, client_secret, tenant_id, subject, start_time, end_time, recurrence=None, attendees=None):
    print(f"Creating Teams meeting: {subject} (start: {start_time}, end: {end_time})")
    access_token = get_teams_access_token(client_id, client_secret, tenant_id)
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'subject': subject,
        'start': {'dateTime': start_time, 'timeZone': 'UTC'},
        'end': {'dateTime': end_time, 'timeZone': 'UTC'},
        'isOnlineMeeting': True,
    }
    if recurrence:
        print(f"Teams meeting recurrence: {recurrence}")
        payload['recurrence'] = recurrence
    if attendees:
        print(f"Teams meeting attendees: {attendees}")
        payload['attendees'] = [{'emailAddress': {'address': email}, 'type': 'required'} for email in attendees]
    try:
        response = requests.post(
            'https://graph.microsoft.com/v1.0/me/events',
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        response_data = response.json()
        print(f"Teams meeting created: ID={response_data['id']}, Join URL={response_data['onlineMeeting']['joinUrl']}")
        return response_data
    except requests.RequestException as e:
        print(f"Error creating Teams meeting: {e}")
        raise

def update_teams_meeting(client_id, client_secret, tenant_id, meeting_id, subject, start_time, end_time, recurrence=None, attendees=None):
    print(f"Updating Teams meeting: ID={meeting_id}, Subject={subject}")
    access_token = get_teams_access_token(client_id, client_secret, tenant_id)
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'subject': subject,
        'start': {'dateTime': start_time, 'timeZone': 'UTC'},
        'end': {'dateTime': end_time, 'timeZone': 'UTC'},
        'isOnlineMeeting': True,
    }
    if recurrence:
        print(f"Teams meeting recurrence (update): {recurrence}")
        payload['recurrence'] = recurrence
    if attendees:
        print(f"Teams meeting attendees (update): {attendees}")
        payload['attendees'] = [{'emailAddress': {'address': email}, 'type': 'required'} for email in attendees]
    try:
        response = requests.patch(
            f'https://graph.microsoft.com/v1.0/me/events/{meeting_id}',
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        response_data = response.json()
        print(f"Teams meeting updated: ID={response_data['id']}, Join URL={response_data['onlineMeeting']['joinUrl']}")
        return response_data
    except requests.RequestException as e:
        print(f"Error updating Teams meeting: {e}")
        raise