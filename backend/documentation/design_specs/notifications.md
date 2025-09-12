# Server-Sent Events (SSE) Notification System

This document explains how to implement a real-time notification system using Server-Sent Events (SSE) with a Django backend and a Next.js frontend. The backend uses Redis to store and manage notifications, ensuring they persist across client reconnections. The frontend consumes these notifications and displays them to the user.

## Overview

The notification system allows users to receive real-time updates (e.g., "New approver group created") when certain actions occur. The backend queues notifications in Redis, and the frontend listens for these notifications via an SSE connection. Notifications persist until marked as read or expired, and the system supports reconnections and multiple clients.

## System Components

- **Backend (Django)**: Handles notification creation, storage in Redis, and streaming via SSE.
- **Frontend (Next.js)**: Connects to the SSE endpoint, processes incoming notifications, and displays them in the UI.
- **Redis**: Stores notifications and tracks read status, with a TTL for automatic cleanup.

---

## Backend (Django)

The backend is implemented in Django, using Redis for notification storage and Django REST Framework (DRF) with JWT authentication for secure access.

### Requirements

- Python 3.8+
- Django 4.0+
- Django REST Framework: For API endpoints.
- redis-py: Python client for Redis (`pip install redis`).
- django-rest-framework-simplejwt: For JWT authentication (`pip install djangorestframework-simplejwt`).
- Redis Server: A running Redis instance (e.g., Redis 6.0+).
- ASGI Server: Uvicorn or Daphne for handling asynchronous SSE (`pip install uvicorn`).

**Dependencies**: Install via requirements.txt:

```txt
django>=4.0
djangorestframework
redis
djangorestframework-simplejwt
uvicorn
```

### Setup

1. **Install Redis:**

   - On Ubuntu: `sudo apt-get install redis-server`
   - On macOS: `brew install redis`
   - Verify Redis is running: `redis-cli ping` (should return PONG).

2. **Configure Django:**

   Add Redis settings to `settings.py`:

   ```python
   REDIS_HOST = '127.0.0.1'
   REDIS_PORT = 6379
   REDIS_DB = 0
   ```

   Configure JWT authentication in `settings.py`:

   ```python
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': (
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ),
   }
   ```

   Ensure ASGI is enabled (e.g., asgi.py is set up for Uvicorn).

3. **Run the Server:**

   ```bash
   uvicorn your_project.asgi:application --host 0.0.0.0 --port 8000
   ```

### Backend Implementation

The Django view handles three key functions:

#### 1. Adding Notifications

- Notifications are added to a Redis list (`notifications:{user_id}`) when an action occurs (e.g., creating an approver group).
- A 24-hour TTL is set on the queue to clean up old notifications.
- Example: When a POST request creates an approver group, a notification is queued with a unique ID and message.

#### 2. Retrieving Notifications

- Uses `lrange` to fetch all notifications for a user without removing them.
- Tracks read notifications in a Redis set (`read_notifications:{user_id}`) to avoid resending.
- Returns the oldest unread notification, marking it as read.

#### 3. Streaming Notifications via SSE

- Establishes an SSE connection for a user, authenticated via JWT.
- Sends an initial "SSE connection established" message.
- Polls Redis every 0.5 seconds for unread notifications and streams them as `data: {...}\n\n`.
- Sends heartbeat messages (`data: {}`) every 10 seconds to keep the connection alive.
- Cleans up Redis data on connection errors.

### Code Example (from notifications.py)

Notifications are stored in Redis as JSON:

```json
{ "id": 1757481510478, "message": "New approver group created successfully." }
```

The SSE endpoint (`/api/communication/notifications/sse/`) streams events in the format:

```
data: {"message": "SSE connection established"}

data: {"id": 1757481510478, "message": "New approver group created successfully."}

data: {}
```

### URL Configuration

Add to `urls.py`:

```python
from django.urls import path
from .views import sse_notifications

urlpatterns = [
    path('api/communication/notifications/sse/', sse_notifications, name='sse_notifications'),
]
```

### POST Endpoint Example (for creating notifications)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ApproverGroupView(APIView):
    def post(self, request):
        print("📥 Received POST request")
        serializer = ApproverGroupSerializer(data=request.data)
        if serializer.is_valid():
            if not request.user.is_authenticated:
                print("❌ User not authenticated")
                return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
            try:
                print(f"📤 Queuing notification for user {request.user.id}")
                add_notification(
                    user_id=request.user.id,
                    message="New approver group created successfully."
                )
                serializer.save()
                print("✅ Group saved and notification queued")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"❌ Error queuing notification or saving: {str(e)}")
                return Response({"error": f"Failed to queue notification or save: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        print(f"❌ Invalid serializer data: {serializer.errors}")
        return Response({"error": "Invalid data", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
```

### How It Works

1. A user performs an action (e.g., POST to `/api/approval/approver-groups/`).
2. The backend queues a notification in Redis for the user's ID.
3. The SSE view checks the Redis queue every 0.5 seconds, sending unread notifications to the client.
4. Notifications persist in Redis until marked as read or the 24-hour TTL expires.
5. If the client disconnects and reconnects, it receives any unread notifications still in the queue.

---

## Frontend (Next.js)

The frontend uses Next.js to connect to the SSE endpoint, process incoming notifications, and display them in the UI.

### Requirements

- Node.js 18+
- Next.js 13+: App Router is assumed for simplicity.

**Dependencies**:

```json
{
  "dependencies": {
    "next": "^13.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

- Install: `npm install`
- JWT Token: The frontend must include a valid JWT token for authentication (obtained via login API).

### Setup

1. **Create a Next.js Project:**

   ```bash
   npx create-next-app@latest my-app
   cd my-app
   npm run dev
   ```

2. **Configure Environment:**

   Add the API base URL to `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

### Frontend Implementation

The frontend uses the EventSource API to connect to the SSE endpoint and a React component to display notifications.

#### Component: NotificationListener.js

```javascript
"use client";

import { useEffect, useState } from "react";

export default function NotificationListener({ token, userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize EventSource with JWT token
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/communication/notifications/sse/?token=${token}`
    );

    eventSource.onmessage = (event) => {
      // console.log('Received SSE event:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          // console.log('Notification:', data);
          setNotifications((prev) => [...prev, data]);
        } else {
          // console.log('Heartbeat or empty event:', data);
        }
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
      // Optional: Reconnect logic
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    eventSource.onopen = () => {
      // console.log('SSE connection established');
    };

    return () => {
      eventSource.close();
      // console.log('SSE connection closed');
    };
  }, [token]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notif) => (
            <li key={notif.id} className="p-2 bg-gray-100 rounded">
              {notif.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### Integration in a Page

Add the component to a page, e.g., `app/notifications/page.js`:

```javascript
import NotificationListener from "@/components/NotificationListener";

export default function NotificationsPage() {
  // Replace with actual JWT token and user ID from your auth system
  const token = "your_jwt_token_here";
  const userId = 2;

  return (
    <div>
      <h1 className="text-2xl font-bold p-4">Your Notifications</h1>
      <NotificationListener token={token} userId={userId} />
    </div>
  );
}
```

### Styling

The example uses Tailwind CSS for simplicity. Add Tailwind to your Next.js project:

1. **Install:** `npm install -D tailwindcss postcss autoprefixer`
2. **Initialize:** `npx tailwindcss init -p`
3. **Configure tailwind.config.js:**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

4. **Add to app/globals.css:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### How It Works

1. The `NotificationListener` component initializes an EventSource connection to the SSE endpoint, passing the JWT token as a query parameter.
2. When an SSE event is received:
   - It parses the data field (e.g., `{"id": 1757481510478, "message": "New approver group created successfully."}`).
   - If the event contains a message, it adds it to the notifications state.
   - Heartbeat events (`data: {}`) are logged but not displayed.
3. Notifications are rendered in a list, with each notification displayed in a styled `<li>` element.
4. On connection errors, the client logs the error and attempts to reconnect after 5 seconds.
5. The component cleans up by closing the EventSource connection when unmounted.

---

## End-to-End Flow

1. **User Action**: A user sends a POST request to `/api/approval/approver-groups/` (e.g., via a form or API client).

2. **Backend Queues Notification**:

   - The Django view validates the request and calls `add_notification(user_id, message)`.
   - The notification is stored in Redis under `notifications:{user_id}` with a 24-hour TTL.

3. **SSE Connection**:

   - The Next.js frontend connects to `/api/communication/notifications/sse/` with a JWT token.
   - The Django SSE view authenticates the user and starts streaming events.

4. **Notification Delivery**:

   - The backend checks Redis for unread notifications every 0.5 seconds.
   - Unread notifications are sent as SSE events and marked as read in `read_notifications:{user_id}`.
   - The frontend receives the event, parses it, and updates the UI.

5. **Reconnection**:
   - If the client disconnects and reconnects, it receives any remaining unread notifications.
   - Notifications expire after 24 hours, keeping Redis clean.

---

## Testing

### Backend

1. **Clear Redis:**

   ```bash
   redis-cli -h 127.0.0.1 -p 6379 -n 0 DEL notifications:2 read_notifications:2
   ```

2. **Start Django:**

   ```bash
   uvicorn your_project.asgi:application --host 0.0.0.0 --port 8000
   ```

3. **Create a Notification:**

   ```bash
   curl -X POST -H "Authorization: Bearer your_jwt_token_here" -H "Content-Type: application/json" -d '{"name": "Test Group"}' http://127.0.0.1:8000/api/approval/approver-groups/
   ```

   Check logs for:

   ```
   🔔 Adding notification for user 2: New approver group created successfully.
   ✅ Notification queued for user 2, queue length: 1
   ```

4. **Check Redis:**
   ```bash
   redis-cli -h 127.0.0.1 -p 6379 -n 0 LRANGE notifications:2 0 -1
   ```

### Frontend

1. **Start Next.js:**

   ```bash
   npm run dev
   ```

2. **Open Notifications Page:**

   - Navigate to http://localhost:3000/notifications.
   - Open the browser's developer console (F12) and check for:
     ```
     SSE connection established
     Received SSE event: {"message": "SSE connection established"}
     Notification: {"id": 1757481510478, "message": "New approver group created successfully."}
     ```

3. **Verify UI:**
   - Ensure the notification appears in the UI.
   - Disconnect (refresh the page) and reconnect to confirm unread notifications persist.

### End-to-End

1. Clear Redis and start both servers.
2. Open the Next.js notifications page.
3. Send a POST request to create an approver group.
4. Verify the notification appears in the UI and logs.
5. Refresh the page to simulate reconnection and confirm the notification is not resent (since it's marked as read).
