// ============================================
// REUSA - Image Picker Hook
// ============================================

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { IMAGE_CONFIG } from '@/constants';

interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
  fileSize?: number;
}

interface UseImagePickerOptions {
  maxImages?: number;
  quality?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

interface UseImagePickerReturn {
  images: ImageAsset[];
  isLoading: boolean;
  pickFromLibrary: () => Promise<ImageAsset[] | null>;
  takePhoto: () => Promise<ImageAsset | null>;
  showPicker: () => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
}

export function useImagePicker(options: UseImagePickerOptions = {}): UseImagePickerReturn {
  const {
    maxImages = IMAGE_CONFIG.maxImages,
    quality = IMAGE_CONFIG.quality,
    allowsEditing = false,
    aspect = [1, 1],
  } = options;

  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos acceso a la cámara para tomar fotos',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos acceso a tu galería para seleccionar fotos',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickFromLibrary = useCallback(async (): Promise<ImageAsset[] | null> => {
    if (images.length >= maxImages) {
      Alert.alert('Límite alcanzado', `Puedes subir máximo ${maxImages} fotos`);
      return null;
    }

    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) return null;

    setIsLoading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - images.length,
        quality,
        allowsEditing,
        aspect,
      });

      if (result.canceled) {
        return null;
      }

      const newImages: ImageAsset[] = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type ?? undefined,
        fileName: asset.fileName ?? undefined,
        fileSize: asset.fileSize ?? undefined,
      }));

      setImages((prev) => [...prev, ...newImages].slice(0, maxImages));
      return newImages;
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'No pudimos cargar las imágenes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [images.length, maxImages, quality, allowsEditing, aspect]);

  const takePhoto = useCallback(async (): Promise<ImageAsset | null> => {
    if (images.length >= maxImages) {
      Alert.alert('Límite alcanzado', `Puedes subir máximo ${maxImages} fotos`);
      return null;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    setIsLoading(true);

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality,
        allowsEditing,
        aspect,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      const newImage: ImageAsset = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type ?? undefined,
        fileName: asset.fileName ?? undefined,
        fileSize: asset.fileSize ?? undefined,
      };

      setImages((prev) => [...prev, newImage]);
      return newImage;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No pudimos tomar la foto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [images.length, maxImages, quality, allowsEditing, aspect]);

  const showPicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tomar foto', 'Elegir de la galería'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickFromLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Agregar foto',
        'Elige una opción',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tomar foto', onPress: takePhoto },
          { text: 'Elegir de la galería', onPress: pickFromLibrary },
        ]
      );
    }
  }, [takePhoto, pickFromLibrary]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      return newImages;
    });
  }, []);

  return {
    images,
    isLoading,
    pickFromLibrary,
    takePhoto,
    showPicker,
    removeImage,
    clearImages,
    reorderImages,
  };
}
