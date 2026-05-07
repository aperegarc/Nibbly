import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../app/providers/AuthProvider';
import { useProfile } from '../../app/providers/ProfileProvider';
import {
  extractSuggestedMinutesFromStep,
  getCookingSteps,
} from '../../shared/utils/recipeCookingSteps';
import { useRecipeDetail } from '../hooks/useRecipeDetail';
import type {
  FavoritesStackParamList,
  FeedStackParamList,
  WeeklyStackParamList,
} from '../navigation/types';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props =
  | NativeStackScreenProps<FeedStackParamList, 'CookingMode'>
  | NativeStackScreenProps<FavoritesStackParamList, 'CookingMode'>
  | NativeStackScreenProps<WeeklyStackParamList, 'CookingMode'>;

type TimerState = {
  remainingSec: number;
  running: boolean;
};

const PRESET_MINUTES = [1, 3, 5, 10, 15];

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CookingModeScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  useKeepAwake('nibbly-cooking');
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { profile } = useProfile();

  const preferences = useMemo(() => {
    if (!profile) {
      return null;
    }
    return {
      diet: profile.diet,
      allergies: profile.allergies,
      preferences: profile.preferences,
    };
  }, [profile]);

  const { recipe, loading, error } = useRecipeDetail(recipeId, preferences);

  const steps = useMemo(() => (recipe ? getCookingSteps(recipe) : []), [recipe]);

  const [stepIndex, setStepIndex] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [ingredientDone, setIngredientDone] = useState<boolean[]>([]);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [autoNextStep, setAutoNextStep] = useState(false);
  const [autoStartSuggestedTimer, setAutoStartSuggestedTimer] = useState(false);
  const lastAutoStartedStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (!recipe) {
      return;
    }
    setIngredientDone(recipe.ingredients.map(() => false));
    setStepIndex(0);
    setTimer(null);
    lastAutoStartedStepRef.current = null;
  }, [recipe?.id]);

  useEffect(() => {
    if (!timer?.running || timer.remainingSec <= 0) {
      return;
    }
    const id = setInterval(() => {
      setTimer((t) => {
        if (!t?.running) {
          return t;
        }
        const next = t.remainingSec - 1;
        if (next <= 0) {
          setTimeout(() => {
            Alert.alert('Temporizador', '¡Tiempo cumplido!');
            if (autoNextStep && stepIndex < steps.length - 1) {
              setStepIndex((i) => i + 1);
              setTimer(null);
            }
          }, 0);
          return { remainingSec: 0, running: false };
        }
        return { ...t, remainingSec: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [autoNextStep, stepIndex, steps.length, timer?.running]);

  const suggestedMinutes = useMemo(() => {
    if (!steps[stepIndex]) {
      return null;
    }
    return extractSuggestedMinutesFromStep(steps[stepIndex]);
  }, [steps, stepIndex]);

  useEffect(() => {
    if (!autoStartSuggestedTimer || !suggestedMinutes || timer) {
      return;
    }
    if (lastAutoStartedStepRef.current === stepIndex) {
      return;
    }
    lastAutoStartedStepRef.current = stepIndex;
    setTimer({ remainingSec: Math.min(Math.max(suggestedMinutes, 1), 24 * 60) * 60, running: true });
  }, [autoStartSuggestedTimer, stepIndex, suggestedMinutes, timer]);

  const toggleIngredient = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIngredientDone((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const startTimerMinutes = useCallback((minutes: number) => {
    const sec = Math.min(Math.max(minutes, 1), 24 * 60) * 60;
    setTimer({ remainingSec: sec, running: true });
  }, []);

  const pauseOrResumeTimer = useCallback(() => {
    setTimer((t) => (t && t.remainingSec > 0 ? { ...t, running: !t.running } : t));
  }, []);

  const stopTimer = useCallback(() => {
    setTimer(null);
  }, []);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
    setTimer(null);
  }, []);

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      Alert.alert('Receta', '¿Salir del modo cocinar?', [
        { text: 'Seguir', style: 'cancel' },
        { text: 'Salir', style: 'default', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setStepIndex((i) => i + 1);
    setTimer(null);
  }, [navigation, stepIndex, steps.length]);

  useEffect(() => {
    navigation.setOptions({
      title: recipe ? 'Modo cocinar' : 'Cocinar',
    });
  }, [navigation, recipe]);

  if (!session?.user.id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para usar el modo cocinar.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.muted, styles.loadingHint]}>Preparando la cocina…</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'No se pudo cargar la receta.'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.primaryBtn} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (steps.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>
          Esta receta no tiene pasos ni instrucciones dividibles. Añade pasos rápidos o instrucciones completas en
          datos.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.primaryBtn} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const progress = (stepIndex + 1) / steps.length;
  const currentStep = steps[stepIndex];
  const ingredientsReady =
    ingredientDone.length === 0 || ingredientDone.every(Boolean);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusCaption}>Sigue los pasos y usa el temporizador para cada preparación.</Text>
      </View>

      <Text style={styles.stepBadge} accessibilityLiveRegion="polite">
        Paso {stepIndex + 1} de {steps.length}
      </Text>
      <Text style={styles.recipeTitle} numberOfLines={2}>
        {recipe.title}
      </Text>

      {recipe.ingredients.length > 0 ? (
        <View style={styles.ingredientsCard}>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIngredientsOpen((o) => !o);
            }}
            style={styles.ingredientsHeader}
            accessibilityRole="button"
            accessibilityLabel={ingredientsOpen ? 'Ocultar ingredientes' : 'Mostrar ingredientes'}
          >
            <Text style={styles.ingredientsTitle}>Ingredientes</Text>
            <Text style={styles.ingredientsHint}>{ingredientsOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {ingredientsOpen ? (
            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((name, i) => (
                <Pressable
                  key={`${recipe.id}-cook-ing-${i}`}
                  onPress={() => toggleIngredient(i)}
                  style={styles.ingredientLine}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ingredientDone[i] }}
                >
                  <View style={[styles.ingredientCheck, ingredientDone[i] && styles.ingredientCheckOn]}>
                    {ingredientDone[i] ? <Text style={styles.ingredientCheckMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.ingredientLabel, ingredientDone[i] && styles.ingredientLabelDone]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!ingredientsReady ? (
            <Text style={styles.ingredientsWarn}>Marca los ingredientes que ya tengas listos.</Text>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepCard}>
          <Text style={styles.stepText}>{currentStep}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>Temporizador</Text>
          <Pressable
            onPress={() => setAutoNextStep((v) => !v)}
            style={[styles.autoNextToggle, autoNextStep && styles.autoNextToggleOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: autoNextStep }}
            accessibilityLabel="Pasar automáticamente al siguiente paso al terminar el temporizador"
          >
            <Text style={[styles.autoNextToggleText, autoNextStep && styles.autoNextToggleTextOn]}>
              Autoplay pasos: {autoNextStep ? 'Activado' : 'Desactivado'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAutoStartSuggestedTimer((v) => !v)}
            style={[styles.autoNextToggle, autoStartSuggestedTimer && styles.autoNextToggleOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: autoStartSuggestedTimer }}
            accessibilityLabel="Iniciar automáticamente el temporizador sugerido en cada paso"
          >
            <Text style={[styles.autoNextToggleText, autoStartSuggestedTimer && styles.autoNextToggleTextOn]}>
              Auto timer sugerido: {autoStartSuggestedTimer ? 'Activado' : 'Desactivado'}
            </Text>
          </Pressable>
          {timer ? (
            <View style={styles.timerRow}>
              <Text style={styles.timerClock} accessibilityLabel={`Quedan ${formatClock(timer.remainingSec)}`}>
                {formatClock(timer.remainingSec)}
              </Text>
              <View style={styles.timerActions}>
                <Pressable
                  onPress={pauseOrResumeTimer}
                  style={styles.secondaryBtn}
                  disabled={timer.remainingSec <= 0}
                  accessibilityRole="button"
                  accessibilityLabel={timer.running ? 'Pausar temporizador' : 'Reanudar temporizador'}
                >
                  <Text style={styles.secondaryBtnText}>{timer.running ? 'Pausa' : 'Sigue'}</Text>
                </Pressable>
                <Pressable
                  onPress={stopTimer}
                  style={styles.dangerOutlineBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Detener temporizador"
                >
                  <Text style={styles.dangerOutlineBtnText}>Detener</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.timerCaption}>Elige una duración para este paso (la pantalla no se apaga mientras cocinas).</Text>
          )}

          <View style={styles.presetRow}>
            {PRESET_MINUTES.map((m) => (
              <Pressable
                key={m}
                onPress={() => startTimerMinutes(m)}
                style={styles.presetChip}
                accessibilityRole="button"
                accessibilityLabel={`Iniciar temporizador de ${m} minutos`}
              >
                <Text style={styles.presetChipText}>{m} min</Text>
              </Pressable>
            ))}
          </View>

          {suggestedMinutes ? (
            <Pressable
              onPress={() => startTimerMinutes(suggestedMinutes)}
              style={styles.suggestedBtn}
              accessibilityRole="button"
              accessibilityLabel={`Usar tiempo sugerido del paso: ${suggestedMinutes} minutos`}
            >
              <Text style={styles.suggestedBtnText}>
                Usar tiempo del paso ({suggestedMinutes} min)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.navRow}>
        <Pressable
          onPress={goPrev}
          disabled={stepIndex === 0}
          style={[styles.navBtn, stepIndex === 0 && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Paso anterior"
        >
          <Text style={[styles.navBtnText, stepIndex === 0 && styles.navBtnTextDisabled]}>Anterior</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          style={styles.navBtnPrimary}
          accessibilityRole="button"
          accessibilityLabel={stepIndex >= steps.length - 1 ? 'Terminar modo cocinar' : 'Siguiente paso'}
        >
          <Text style={styles.navBtnPrimaryText}>
            {stepIndex >= steps.length - 1 ? 'Terminar' : 'Siguiente'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingHint: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusCaption: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  stepBadge: {
    ...typography.caption,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recipeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  ingredientsCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  ingredientsTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  ingredientsHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ingredientsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ingredientLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ingredientCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  ingredientCheckOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  ingredientCheckMark: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  ingredientLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  ingredientLabelDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  ingredientsWarn: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  stepCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    minHeight: 120,
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 28,
  },
  timerCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  timerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  autoNextToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  autoNextToggleOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  autoNextToggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  autoNextToggleTextOn: {
    color: colors.accent,
  },
  timerCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timerRow: {
    gap: spacing.sm,
  },
  timerClock: {
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  timerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 14,
  },
  dangerOutlineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerOutlineBtnText: {
    ...typography.subtitle,
    color: colors.danger,
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  presetChipText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  suggestedBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  suggestedBtnText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  navBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  navBtnText: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
  },
  navBtnPrimary: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  navBtnPrimaryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  primaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  primaryBtnText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
});
