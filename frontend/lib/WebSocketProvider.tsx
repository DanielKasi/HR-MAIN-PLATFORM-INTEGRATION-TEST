"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {useSelector} from "react-redux";

import {selectUser} from "@/store/auth/selectors";
import {store} from "@/store";
import {useToast} from "@/hooks/use-toast";

// --- Interfaces ---
interface Task {
  step: any;
  object_id: any;
  content_object: string;
  updated_at: string | number | Date;
  id: string;
  title: string;
  status: string;
  // Add more fields as needed
}

interface Notification {
  id: string;
  message: string;
  task?: Task;
  type: string;
  // Add more fields if necessary
}

interface WebSocketContextType {
  connected: boolean;
  tasks: Task[] | null;
  error: string | null;
  sendMessage: (message: any) => void;
  notifications: Notification[];
}

// --- Constants ---
const WS_PROTOCOL = process.env.NEXT_PUBLIC_API_URL?.startsWith("https") ? "wss" : "ws";
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, "") || "localhost:8000";
const WS_URL = `${WS_PROTOCOL}://${WS_BASE_URL}`;

// --- Context ---
const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  tasks: null,
  error: null,
  sendMessage: () => {},
  notifications: [],
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTaskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const user = useSelector(selectUser);
  const {toast} = useToast();

  const greenToastStyle = {
    className: "border-green-500 bg-green-500 text-white",
  };

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      setError("WebSocket is not connected");
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!user?.id) return;

    if (socketRef.current) {
      socketRef.current.close();
    }

    const token = store.getState().auth.accessToken;

    if (!token) {
      setError("No authentication token available");

      return;
    }

    const socket = new WebSocket(`${WS_URL}/ws/notifications/?token=${token}`);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      setError(null);
      socket.send(JSON.stringify({type: "fetch_tasks"}));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.type === "initial_tasks" ||
          data.type === "tasks_update" ||
          data.type === "tasks_data"
        ) {
          setTasks(data.tasks);
        } else if (data.type === "notification") {
          const notification: Notification = data;

          setNotifications((prev) => [notification, ...prev].slice(0, 10));

          toast({
            title: "New Notification",
            description: data.message,
            ...greenToastStyle,
          });

          if (notification.task) {
            if (fetchTaskTimeoutRef.current) {
              clearTimeout(fetchTaskTimeoutRef.current);
            }
            fetchTaskTimeoutRef.current = setTimeout(() => {
              socket.send(JSON.stringify({type: "fetch_tasks"}));
            }, 1000); // debounce
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("WebSocket message error:", err);
        }
      }
    };

    socket.onclose = () => {
      setConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // TODO: readd web socket reconnection
      // reconnectTimeoutRef.current = setTimeout(() => {
      //   connectWebSocket();
      // }, 5000);
    };

    socket.onerror = () => {};
  }, [user?.id, toast]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      socketRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (fetchTaskTimeoutRef.current) clearTimeout(fetchTaskTimeoutRef.current);
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const styleElement = document.createElement("style");

    styleElement.textContent = `
      [data-radix-toast-viewport] {
        bottom: 0 !important;
        left: 0 !important;
        right: auto !important;
        top: auto !important;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const value = useMemo(
    () => ({
      connected,
      tasks,
      error,
      sendMessage,
      notifications,
    }),
    [connected, tasks, error, sendMessage, notifications],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
