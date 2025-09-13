import msal
import requests
import os

def get_teams_access_token(client_id, client_secret, tenant_id):
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=f'https://login.microsoftonline.com/{tenant_id}',
    )
    result = app.acquire_token_for_client(scopes=['https://graph.microsoft.com/.default'])
    if 'access_token' in result:
        return result['access_token']
    raise Exception(f"Error acquiring Teams access token: {result.get('error_description', 'Unknown error')}")

def create_teams_meeting(client_id, client_secret, tenant_id, subject, start_time, end_time, recurrence=None, attendees=None):
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
        payload['recurrence'] = recurrence
    if attendees:
        payload['attendees'] = [{'emailAddress': {'address': email}, 'type': 'required'} for email in attendees]
    response = requests.post(
        'https://graph.microsoft.com/v1.0/me/events',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

def update_teams_meeting(client_id, client_secret, tenant_id, meeting_id, subject, start_time, end_time, recurrence=None, attendees=None):
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
        payload['recurrence'] = recurrence
    if attendees:
        payload['attendees'] = [{'emailAddress': {'address': email}, 'type': 'required'} for email in attendees]
    response = requests.patch(
        f'https://graph.microsoft.com/v1.0/me/events/{meeting_id}',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()