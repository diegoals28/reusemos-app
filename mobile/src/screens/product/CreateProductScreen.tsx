// ============================================
// REUSA - Create Product Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi, categoriesApi } from '@/services/api';
import { Button } from '@/components/common/Button';

const CONDITIONS = [
  { id: 'new', label: 'Nuevo', description: 'Sin usar, con etiquetas' },
  { id: 'like_new', label: 'Como nuevo', description: 'Usado pocas veces, perfecto estado' },
  { id: 'good', label: 'Buen estado', description: 'Uso normal, sin defectos importantes' },
  { id: 'fair', label: 'Aceptable', description: 'Signos de uso, totalmente funcional' },
];

export default function CreateProductScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('');
  const [acceptsTrade, setAcceptsTrade] = useState(false);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.createProduct(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert(
        'Publicado',
        'Tu producto ha sido publicado exitosamente',
        [
          {
            text: 'Ver producto',
            onPress: () => navigation.replace(ROUTES.PRODUCT_DETAIL, { productId: product.id }),
          },
          {
            text: 'Seguir publicando',
            onPress: resetForm,
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No pudimos publicar tu producto');
    },
  });

  const resetForm = () => {
    setImages([]);
    setTitle('');
    setDescription('');
    setPrice('');
    setCategoryId('');
    setCondition('');
    setAcceptsTrade(false);
    setBrand('');
    setSize('');
  };

  const handleBack = () => {
    if (images.length > 0 || title || description) {
      Alert.alert(
        'Descartar borrador',
        '¿Estás seguro de que quieres salir? Perderás los cambios.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const pickImages = async () => {
    if (images.length >= 10) {
      Alert.alert('Límite alcanzado', 'Puedes subir máximo 10 fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 10) {
      Alert.alert('Límite alcanzado', 'Puedes subir máximo 10 fotos');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (images.length === 0) {
      Alert.alert('Error', 'Agrega al menos una foto');
      return false;
    }
    if (!title.trim() || title.length < 3) {
      Alert.alert('Error', 'El título debe tener al menos 3 caracteres');
      return false;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Error', 'La descripción debe tener al menos 10 caracteres');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return false;
    }
    if (!categoryId) {
      Alert.alert('Error', 'Selecciona una categoría');
      return false;
    }
    if (!condition) {
      Alert.alert('Error', 'Selecciona el estado del producto');
      return false;
    }
    return true;
  };

  const handlePublish = () => {
    if (!validateForm()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      categoryId,
      condition,
      acceptsTrade,
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      images, // In real app, would upload these first
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar producto</Text>
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
          showsVerticalScrollIndicator={false}
        >
          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos *</Text>
            <Text style={styles.sectionSubtitle}>
              Agrega hasta 10 fotos. La primera será la portada.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesContainer}
            >
              {/* Add Image Buttons */}
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Ionicons name="images-outline" size={28} color={COLORS.primary} />
                <Text style={styles.addImageText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                <Text style={styles.addImageText}>Cámara</Text>
              </TouchableOpacity>

              {/* Image Previews */}
              {images.map((uri, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverText}>Portada</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: iPhone 13 Pro 128GB"
              placeholderTextColor={COLORS.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe tu producto: estado, detalles, razón de venta..."
              placeholderTextColor={COLORS.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Precio *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
                value={price}
                onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
              <Text style={styles.currency}>ARS</Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categoría *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipContainer}
            >
              {(categories as any[] | undefined)?.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    categoryId === cat.id && styles.chipSelected,
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      categoryId === cat.id && styles.chipTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Condition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado *</Text>
            <View style={styles.conditionsGrid}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond.id}
                  style={[
                    styles.conditionCard,
                    condition === cond.id && styles.conditionCardSelected,
                  ]}
                  onPress={() => setCondition(cond.id)}
                >
                  <View style={styles.conditionHeader}>
                    <Text
                      style={[
                        styles.conditionLabel,
                        condition === cond.id && styles.conditionLabelSelected,
                      ]}
                    >
                      {cond.label}
                    </Text>
                    {condition === cond.id && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </View>
                  <Text style={styles.conditionDescription}>{cond.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Accept Trade */}
          <TouchableOpacity
            style={styles.tradeOption}
            onPress={() => setAcceptsTrade(!acceptsTrade)}
          >
            <View style={styles.tradeInfo}>
              <Ionicons name="swap-horizontal" size={24} color={COLORS.secondary} />
              <View style={styles.tradeTextContainer}>
                <Text style={styles.tradeTitle}>Acepto cambios</Text>
                <Text style={styles.tradeSubtitle}>
                  Permite que te propongan intercambiar por otros productos
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                acceptsTrade && styles.checkboxChecked,
              ]}
            >
              {acceptsTrade && (
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              )}
            </View>
          </TouchableOpacity>

          {/* Optional Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles opcionales</Text>
            <View style={styles.optionalFields}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Marca</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Apple, Nike..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Talla / Tamaño</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: M, 42, 128GB..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={size}
                  onChangeText={setSize}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button
            title="Publicar"
            onPress={handlePublish}
            loading={createMutation.isPending}
            fullWidth
            size="lg"
          />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.xs,
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
    paddingBottom: SPACING.xl,
  },
  section: {
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  imagesContainer: {
    gap: SPACING.sm,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  addImageText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  imagePreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: RADIUS.sm,
    paddingVertical: 2,
  },
  coverText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.white,
    textAlign: 'center',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 120,
    paddingTop: SPACING.md,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  priceInput: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  currency: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chipContainer: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.secondaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
  conditionsGrid: {
    gap: SPACING.sm,
  },
  conditionCard: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  conditionCardSelected: {
    backgroundColor: COLORS.secondaryLight,
    borderColor: COLORS.primary,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conditionLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  conditionLabelSelected: {
    color: COLORS.primary,
  },
  conditionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tradeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tradeTextContainer: {
    flex: 1,
  },
  tradeTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tradeSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionalFields: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footer: {
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
