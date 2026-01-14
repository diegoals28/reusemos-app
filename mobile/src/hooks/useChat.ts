// ============================================
// REUSA - Chat Hook
// ============================================

import { useEffect, useCallback, useState } from 'react';
import { useSocket } from './useSocket';
import { Message } from '@/types';

interface UseChatOptions {
  conversationId: string;
  onNewMessage?: (message: Message) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onMessageRead?: (data: { readBy: string; readAt: Date }) => void;
}

interface UseChatReturn {
  isConnected: boolean;
  sendMessage: (content: string) => Promise<Message | null>;
  markAsRead: (messageIds?: string[]) => void;
  startTyping: () => void;
  stopTyping: () => void;
  typingUsers: string[];
}

export function useChat({
  conversationId,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  onMessageRead,
}: UseChatOptions): UseChatReturn {
  const { socket, isConnected, emit, on, off } = useSocket({ namespace: 'chat' });
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Join conversation room
  useEffect(() => {
    if (isConnected && conversationId) {
      emit('conversation:join', { conversationId });

      return () => {
        emit('conversation:leave', { conversationId });
      };
    }
  }, [isConnected, conversationId, emit]);

  // Listen for events
  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (data: { message: Message; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        onNewMessage?.(data.message);
      }
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
        onTypingStart?.(data.userId);
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
        onTypingStop?.(data.userId);
      }
    };

    const handleMessageRead = (data: { conversationId: string; readBy: string; readAt: Date }) => {
      if (data.conversationId === conversationId) {
        onMessageRead?.(data);
      }
    };

    on('message:new', handleNewMessage);
    on('typing:start', handleTypingStart);
    on('typing:stop', handleTypingStop);
    on('message:read', handleMessageRead);

    return () => {
      off('message:new', handleNewMessage);
      off('typing:start', handleTypingStart);
      off('typing:stop', handleTypingStop);
      off('message:read', handleMessageRead);
    };
  }, [isConnected, conversationId, on, off, onNewMessage, onTypingStart, onTypingStop, onMessageRead]);

  const sendMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      return new Promise((resolve) => {
        if (!isConnected) {
          resolve(null);
          return;
        }

        socket?.emit(
          'message:send',
          { conversationId, content },
          (response: { success?: boolean; message?: Message; error?: string }) => {
            if (response.success && response.message) {
              resolve(response.message);
            } else {
              console.error('Failed to send message:', response.error);
              resolve(null);
            }
          }
        );
      });
    },
    [isConnected, conversationId, socket]
  );

  const markAsRead = useCallback(
    (messageIds?: string[]) => {
      if (isConnected) {
        emit('message:read', { conversationId, messageIds });
      }
    },
    [isConnected, conversationId, emit]
  );

  const startTyping = useCallback(() => {
    if (isConnected) {
      emit('typing:start', { conversationId });
    }
  }, [isConnected, conversationId, emit]);

  const stopTyping = useCallback(() => {
    if (isConnected) {
      emit('typing:stop', { conversationId });
    }
  }, [isConnected, conversationId, emit]);

  return {
    isConnected,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers,
  };
}
