// ============================================
// REUSA - Chat Detail Screen
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { conversationsApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useChat } from '@/hooks/useChat';
import { Message } from '@/types';

export default function ChatDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const { conversationId } = route.params;
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationsApi.getConversation(conversationId),
  });

  // Fetch initial messages
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId),
  });

  // Initialize messages from API
  useEffect(() => {
    if (messagesData?.data) {
      setMessages(messagesData.data);
    }
  }, [messagesData]);

  // WebSocket chat hook
  const {
    isConnected,
    sendMessage: sendSocketMessage,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers,
  } = useChat({
    conversationId,
    onNewMessage: (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [newMessage, ...prev];
      });
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onMessageRead: () => {
      // Update read status in messages
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === user?.id && !m.readAt
            ? { ...m, readAt: new Date().toISOString() }
            : m
        )
      );
    },
  });

  const otherUser =
    conversation?.buyer?.id === user?.id
      ? conversation?.seller
      : conversation?.buyer;

  // Mark as read when opening
  useEffect(() => {
    if (isConnected) {
      markAsRead();
    } else {
      conversationsApi.markAsRead(conversationId);
    }
  }, [conversationId, isConnected, markAsRead]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSend = async () => {
    const content = inputMessage.trim();
    if (!content) return;

    setIsSending(true);
    setInputMessage('');
    stopTyping();

    try {
      if (isConnected) {
        // Use WebSocket
        const sentMessage = await sendSocketMessage(content);
        if (sentMessage) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === sentMessage.id)) {
              return prev;
            }
            return [sentMessage, ...prev];
          });
        }
      } else {
        // Fallback to REST API
        const sentMessage = await conversationsApi.sendMessage(conversationId, content);
        setMessages((prev) => [sentMessage, ...prev]);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setInputMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputMessage(text);
    if (text.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleProductPress = () => {
    if (conversation?.product) {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: conversation.product.id,
      });
    }
  };

  const handleUserPress = () => {
    if (otherUser) {
      navigation.navigate(ROUTES.PUBLIC_PROFILE, {
        userId: otherUser.id,
      });
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const shouldShowDate = (currentMsg: Message, prevMsg?: Message): boolean => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const prevMessage = messages[index + 1]; // Reversed list
    const showDate = shouldShowDate(item, prevMessage);

    return (
      <>
        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          {!isOwn && (
            otherUser?.avatarUrl ? (
              <Image
                source={{ uri: otherUser.avatarUrl }}
                style={styles.messageAvatar}
              />
            ) : (
              <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                <Ionicons name="person" size={14} color={COLORS.textTertiary} />
              </View>
            )
          )}
          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatTime(item.createdAt)}
              {isOwn && item.readAt && (
                <Text> · Leido</Text>
              )}
            </Text>
          </View>
        </View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
      </>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          {otherUser?.avatarUrl ? (
            <Image source={{ uri: otherUser.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={18} color={COLORS.textTertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.displayName || 'Usuario'}
            </Text>
            <Text style={styles.headerStatus}>
              {typingUsers.length > 0
                ? 'Escribiendo...'
                : otherUser?.isOnline
                ? 'En linea'
                : 'Desconectado'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Connection indicator */}
        <View style={[styles.connectionDot, isConnected && styles.connectionDotActive]} />

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Product Card */}
      {conversation?.product && (
        <TouchableOpacity style={styles.productCard} onPress={handleProductPress}>
          {(conversation.product.images?.[0] || conversation.product.image) && (
            <Image
              source={{ uri: conversation.product.images?.[0] || conversation.product.image || '' }}
              style={styles.productImage}
            />
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {conversation.product.title}
            </Text>
            <Text style={styles.productPrice}>
              ${conversation.product.price?.toLocaleString('es-AR')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            inverted
            ListHeaderComponent={renderTypingIndicator}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
          />
        )}

        {/* Input */}
        <SafeAreaView edges={['bottom']} style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={COLORS.textTertiary}
              value={inputMessage}
              onChangeText={handleInputChange}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputMessage.trim() && styles.sendButtonActive,
              ]}
              onPress={handleSend}
              disabled={!inputMessage.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputMessage.trim() ? COLORS.white : COLORS.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textTertiary,
  },
  connectionDotActive: {
    backgroundColor: COLORS.success,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  productPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: SPACING.base,
    paddingBottom: SPACING.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: SPACING.xs,
  },
  messageAvatarPlaceholder: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FONT_SIZES.base,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: COLORS.textTertiary,
  },
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  typingBubble: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textTertiary,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
});
