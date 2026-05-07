import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import type { FavoritesStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'CreateRecipe'>;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const DIETS = ['balanced', 'vegetarian', 'vegan', 'gluten_free', 'keto', 'paleo'] as const;
const RECIPE_UPLOADS_BUCKET = 'recipe-images';

export function CreateRecipeScreen({ navigation }: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [cookTimeMinutes, setCookTimeMinutes] = useState('30');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [dietType, setDietType] = useState<(typeof DIETS)[number]>('balanced');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const ingredientList = useMemo(
    () =>
      ingredientsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [ingredientsText],
  );

  const stepList = useMemo(
    () =>
      stepsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [stepsText],
  );

  const chooseImage = async (mode: 'camera' | 'library') => {
    const permission =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso', 'Necesitamos permiso para usar la cámara o galería.');
      return;
    }

    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.72,
            mediaTypes: ['images'],
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.72,
            mediaTypes: ['images'],
          });

    if (result.canceled || result.assets.length === 0) {
      return;
    }
    const asset = result.assets[0];
    if (!asset?.uri) {
      return;
    }
    setPickedImageUri(asset.uri);
    setImageUrl('');
  };

  const uploadPickedImageIfAny = async (targetUserId: string): Promise<string> => {
    if (!pickedImageUri) {
      return imageUrl.trim();
    }

    setUploadingImage(true);
    try {
      const localFile = await fetch(pickedImageUri);
      const blob = await localFile.blob();
      const extGuess = pickedImageUri.split('.').pop()?.toLowerCase();
      const ext = extGuess && extGuess.length <= 5 ? extGuess : 'jpg';
      const contentType =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const filePath = `${targetUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(RECIPE_UPLOADS_BUCKET).upload(filePath, blob, {
        contentType,
        upsert: false,
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('bucket') && msg.includes('not found')) {
          throw new Error(
            'No existe el bucket de imágenes. Ejecuta la migración 20260506135000_recipe_images_storage.sql en Supabase.',
          );
        }
        throw error;
      }
      const { data } = supabase.storage.from(RECIPE_UPLOADS_BUCKET).getPublicUrl(filePath);
      return data.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const saveRecipe = async () => {
    if (!userId) {
      Alert.alert('Sesión', 'Inicia sesión para crear recetas.');
      return;
    }
    const titleTrimmed = title.trim();
    const imageTrimmed = imageUrl.trim();
    const minutes = Number(cookTimeMinutes);

    if (titleTrimmed.length < 3) {
      Alert.alert('Título', 'Escribe un título de al menos 3 caracteres.');
      return;
    }
    if (!pickedImageUri && !/^https?:\/\//i.test(imageTrimmed)) {
      Alert.alert('Foto', 'Sube una imagen (cámara/galería) o pon una URL válida.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Tiempo', 'El tiempo debe ser un número mayor que 0.');
      return;
    }
    if (ingredientList.length === 0) {
      Alert.alert('Ingredientes', 'Añade al menos un ingrediente (uno por línea).');
      return;
    }
    if (stepList.length === 0) {
      Alert.alert('Pasos', 'Añade al menos un paso (uno por línea).');
      return;
    }

    setSaving(true);
    try {
      const uploadedImageUrl = await uploadPickedImageIfAny(userId);
      if (!/^https?:\/\//i.test(uploadedImageUrl)) {
        throw new Error('No se pudo obtener URL de la imagen.');
      }

      const supabase = getSupabaseClient();
      const { data: insertedRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: titleTrimmed,
          description: description.trim() || null,
          image_url: uploadedImageUrl,
          quick_steps: stepList.slice(0, 40),
          full_instructions: stepList.join('\n'),
          cook_time_minutes: Math.round(minutes),
          difficulty,
          diet_type: dietType,
          is_published: false,
          created_by: userId,
          data_source_name: 'Nibbly Community',
          data_source_url: null,
          external_id: null,
        })
        .select('id')
        .single();

      if (recipeError || !insertedRecipe?.id) {
        throw recipeError ?? new Error('No se pudo crear la receta.');
      }

      const ingredientIds: string[] = [];
      for (const raw of ingredientList) {
        const normalized = raw.trim();
        const { data: existing } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', normalized)
          .maybeSingle();

        if (existing?.id) {
          ingredientIds.push(existing.id);
          continue;
        }

        const { data: created, error: createIngredientError } = await supabase
          .from('ingredients')
          .insert({ name: normalized })
          .select('id')
          .single();

        if (createIngredientError || !created?.id) {
          const { data: afterRace } = await supabase
            .from('ingredients')
            .select('id')
            .ilike('name', normalized)
            .maybeSingle();
          if (!afterRace?.id) {
            throw createIngredientError ?? new Error('No se pudo crear ingrediente.');
          }
          ingredientIds.push(afterRace.id);
          continue;
        }
        ingredientIds.push(created.id);
      }

      const links = ingredientIds.map((ingredientId, idx) => ({
        recipe_id: insertedRecipe.id,
        ingredient_id: ingredientId,
        sort_order: idx,
      }));
      const { error: linksError } = await supabase.from('recipe_ingredients').insert(links);
      if (linksError) {
        throw linksError;
      }

      await supabase.from('favorites').insert({ user_id: userId, recipe_id: insertedRecipe.id });

      Alert.alert('Lista', 'Tu receta se creó como privada y se guardó en favoritos.');
      navigation.replace('RecipeDetail', { recipeId: insertedRecipe.id });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo guardar la receta.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Nueva receta</Text>
        <Text style={styles.subtitle}>Añade tu foto, ingredientes y pasos para cocinar.</Text>

        <Field label="Título">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Pasta cremosa con setas"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Foto (URL)">
          {pickedImageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: pickedImageUri }} style={styles.previewImage} contentFit="cover" />
              <Pressable onPress={() => setPickedImageUri(null)} style={styles.removePreviewBtn}>
                <Text style={styles.removePreviewText}>Quitar imagen</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.photoActions}>
            <Pressable
              onPress={() => void chooseImage('camera')}
              style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
            >
              <Text style={styles.photoBtnText}>Abrir cámara</Text>
            </Pressable>
            <Pressable
              onPress={() => void chooseImage('library')}
              style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
            >
              <Text style={styles.photoBtnText}>Elegir de galería</Text>
            </Pressable>
          </View>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://... (opcional si subes foto)"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Descripción">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Cuenta de qué va tu receta"
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <View style={styles.row}>
          <Field label="Tiempo (min)" containerStyle={styles.half}>
            <TextInput
              value={cookTimeMinutes}
              onChangeText={setCookTimeMinutes}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
          <Field label="Dificultad" containerStyle={styles.half}>
            <View style={styles.chipsWrap}>
              {DIFFICULTIES.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[styles.chip, difficulty === d && styles.chipActive]}
                >
                  <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </View>

        <Field label="Tipo de dieta">
          <View style={styles.chipsWrap}>
            {DIETS.map((d) => (
              <Pressable key={d} onPress={() => setDietType(d)} style={[styles.chip, dietType === d && styles.chipActive]}>
                <Text style={[styles.chipText, dietType === d && styles.chipTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Ingredientes (uno por línea)">
          <TextInput
            value={ingredientsText}
            onChangeText={setIngredientsText}
            placeholder={'Tomate\nQueso\nAceite de oliva'}
            style={[styles.input, styles.textareaLarge]}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Pasos (uno por línea)">
          <TextInput
            value={stepsText}
            onChangeText={setStepsText}
            placeholder={'Corta los ingredientes\nSofríe 5 minutos\nSirve caliente'}
            style={[styles.input, styles.textareaLarge]}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Pressable
          onPress={() => void saveRecipe()}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            (saving || uploadingImage) && styles.saveBtnDisabled,
          ]}
          disabled={saving || uploadingImage}
          accessibilityRole="button"
          accessibilityLabel="Guardar receta"
        >
          <Text style={styles.saveBtnText}>
            {uploadingImage ? 'Subiendo imagen...' : saving ? 'Guardando...' : 'Guardar receta'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
  containerStyle,
}: {
  label: string;
  children: ReactNode;
  containerStyle?: object;
}) {
  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 22,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  textarea: {
    minHeight: 90,
  },
  textareaLarge: {
    minHeight: 120,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previewWrap: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  removePreviewBtn: {
    alignSelf: 'flex-start',
  },
  removePreviewText: {
    ...typography.caption,
    color: colors.danger,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
  },
  photoBtnPressed: {
    opacity: 0.9,
  },
  photoBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
});
