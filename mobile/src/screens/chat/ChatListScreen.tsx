// ============================================
// REUSA - Chat List Screen
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { conversationsApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Conversation } from '@/types';

export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.getConversations(),
  });

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate(ROUTES.CHAT_DETAIL, {
      conversationId: conversation.id,
    });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants?.find((p) => p.id !== user?.id);
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-AR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.otherUser || getOtherParticipant(item);
    const hasUnread = (item.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.unreadItem]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {otherUser?.avatarUrl ? (
            <Image
              source={{ uri: otherUser.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.textTertiary} />
            </View>
          )}
          {item.product?.images?.[0] && (
            <Image
              source={{ uri: item.product.images[0] }}
              style={styles.productThumbnail}
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.topRow}>
            <Text
              style={[styles.userName, hasUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {otherUser?.displayName || 'Usuario'}
            </Text>
            <Text style={styles.time}>
              {item.lastMessage?.createdAt
                ? formatTime(item.lastMessage.createdAt)
                : ''}
            </Text>
          </View>

          <Text style={styles.productTitle} numberOfLines={1}>
            {item.product?.title}
          </Text>

          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {item.lastMessage?.senderId === user?.id ? 'Tú: ' : ''}
              {item.lastMessage?.content || 'Sin mensajes aún'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>Sin conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        Cuando contactes a un vendedor o alguien te escriba, las conversaciones
        aparecerán aquí
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations?.data || []}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: SPACING.base,
    gap: SPACING.md,
  },
  unreadItem: {
    backgroundColor: COLORS.secondaryLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbnail: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginLeft: SPACING.sm,
  },
  productTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  unreadCount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.base + 56 + SPACING.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
