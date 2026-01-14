// ============================================
// REUSA - Leave Review Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { reviewsApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';

const RATING_LABELS = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

const QUICK_TAGS = [
  { id: 'fast_shipping', label: 'Envío rápido', icon: 'flash' },
  { id: 'good_communication', label: 'Buena comunicación', icon: 'chatbubble' },
  { id: 'as_described', label: 'Tal como se describe', icon: 'checkmark-circle' },
  { id: 'well_packaged', label: 'Bien embalado', icon: 'cube' },
  { id: 'friendly', label: 'Amable', icon: 'happy' },
  { id: 'punctual', label: 'Puntual', icon: 'time' },
];

export default function LeaveReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const { transactionId, userId, userName, userAvatar } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const createReviewMutation = useMutation({
    mutationFn: (data: any) => reviewsApi.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      Alert.alert(
        '¡Gracias por tu opinión!',
        'Tu reseña ayudará a otros usuarios de la comunidad.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo enviar la reseña');
    },
  });

  const handleBack = () => {
    if (rating > 0 || comment.length > 0) {
      Alert.alert(
        '¿Salir sin guardar?',
        'Tu reseña no se ha guardado. ¿Estás seguro de que quieres salir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    createReviewMutation.mutate({
      transactionId,
      reviewedUserId: userId,
      rating,
      comment: comment.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dejar reseña</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Info */}
          <View style={styles.userSection}>
            <Avatar
              source={userAvatar}
              name={userName}
              size="lg"
            />
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.reviewPrompt}>
              ¿Cómo fue tu experiencia?
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={48}
                    color={star <= rating ? COLORS.warning : COLORS.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating - 1]}</Text>
            )}
          </View>

          {/* Quick Tags */}
          {rating >= 4 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>¿Qué destacas? (opcional)</Text>
              <View style={styles.tagsGrid}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.tag, isSelected && styles.tagSelected]}
                      onPress={() => handleToggleTag(tag.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={tag.icon as any}
                        size={16}
                        color={isSelected ? COLORS.white : COLORS.textSecondary}
                      />
                      <Text
                        style={[styles.tagLabel, isSelected && styles.tagLabelSelected]}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>
              Comentario {rating < 4 ? '' : '(opcional)'}
            </Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder={
                rating < 4
                  ? 'Cuéntanos qué podría mejorar...'
                  : 'Comparte tu experiencia con otros usuarios...'
              }
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <View style={styles.guidelinesContent}>
              <Text style={styles.guidelinesTitle}>Pautas de la comunidad</Text>
              <Text style={styles.guidelinesText}>
                • Sé respetuoso y constructivo{'\n'}
                • Comenta sobre la transacción, no sobre la persona{'\n'}
                • No incluyas información personal
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Publicar reseña"
            onPress={handleSubmit}
            loading={createReviewMutation.isPending}
            disabled={rating === 0}
          />
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.base,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  reviewPrompt: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  ratingLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: SPACING.md,
  },
  tagsSection: {
    paddingVertical: SPACING.lg,
  },
  tagsTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tagLabelSelected: {
    color: COLORS.white,
    fontWeight: '500',
  },
  commentSection: {
    paddingVertical: SPACING.lg,
  },
  commentLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    height: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  guidelinesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.info + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  guidelinesContent: {
    flex: 1,
  },
  guidelinesTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.info,
    marginBottom: 4,
  },
  guidelinesText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
