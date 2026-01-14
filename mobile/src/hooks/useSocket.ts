// ============================================
// REUSA - Socket Hook
// ============================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { WS_URL } from '@/constants';

interface UseSocketOptions {
  namespace: string;
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket({ namespace, autoConnect = true }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const socket = io(`${WS_URL}/${namespace}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log(`[Socket] Connected to ${namespace}`);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected from ${namespace}:`, reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error(`[Socket] Connection error:`, error.message);
      setIsConnected(false);
    });

    socketRef.current = socket;
  }, [namespace, token, isAuthenticated]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit ${event}: not connected`);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  }, []);

  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
}
