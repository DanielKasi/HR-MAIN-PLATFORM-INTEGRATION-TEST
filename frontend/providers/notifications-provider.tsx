
'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAccessToken, selectUser } from '@/store/auth/selectors';
import { receiveNotification } from '@/store/notifications/actions';
import { MAIN_DOMAIN_URL, NOTIFICATIONS_STREAM_BASE_PATH } from '@/constants';
import { showErrorToast } from '@/lib/utils';
import { toast } from 'sonner';
import { INotification } from '@/store/notifications/types';

const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);

  useEffect(() => {
    if (!currentUser || !accessToken ) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.endsWith('/')
        ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1)
        : process.env.NEXT_PUBLIC_API_URL
      : MAIN_DOMAIN_URL;

    const url = `${baseUrl}${NOTIFICATIONS_STREAM_BASE_PATH}`;
    const controller = new AbortController();

    async function streamNotifications() {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep incomplete data in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data:INotification = JSON.parse(line.slice(6));
                if(data?.message){
                  dispatch(receiveNotification(data));
                }
              } catch (error) {
                showErrorToast({ error, defaultMessage: 'Error parsing notification' });
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to connect to notification stream:', error);
          showErrorToast({ error, defaultMessage: 'Failed to connect to notification stream' });
        }
      }
    }

    streamNotifications();

    return () => {
      controller.abort();
    };
  }, [dispatch, currentUser, accessToken]);

  return <>{children}</>;
};

export default NotificationsProvider;
