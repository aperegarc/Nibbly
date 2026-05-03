import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { colors } from '../../theme/colors';
import { NIBBLY_SOURCES } from './nibblySources';
import type { NibblyState } from './nibblyTypes';

export type NibblyProps = {
  /** Por defecto `idle` (misma apariencia que feliz). */
  state?: NibblyState;
  /** Tamaño máximo del cuadro contenedor (la imagen hace `contain` dentro). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Cuando hay `onPress`, el hit area es interactiva. */
  accessibilityLabel?: string;
  /** Desactiva animación al cambiar de estado (p. ej. tests). */
  animate?: boolean;
};

function NibblyInner({
  state = 'idle',
  size = 96,
  style,
  onPress,
  accessibilityLabel = 'Nibbly',
  animate = true,
}: NibblyProps) {
  const { width: screenW } = useWindowDimensions();
  const resolved = state ?? 'idle';
  const source = useMemo(() => NIBBLY_SOURCES[resolved], [resolved]);

  const box = Math.min(size, screenW * 0.42);

  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const prevKey = useRef<NibblyState | null>(null);
  const didMount = useRef(false);

  useEffect(() => {
    if (!animate) {
      return;
    }
    if (!didMount.current) {
      didMount.current = true;
      prevKey.current = resolved;
      return;
    }
    if (prevKey.current === resolved) {
      return;
    }
    prevKey.current = resolved;
    opacity.setValue(0.78);
    scale.setValue(0.94);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animate, opacity, resolved, scale]);

  const inner = (
    <Animated.View
      style={[
        styles.clip,
        {
          width: box,
          height: box,
          maxWidth: '100%',
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Image
        source={source}
        style={styles.image}
        contentFit="contain"
        transition={animate ? 200 : 0}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={style} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {inner}
    </View>
  );
}

export const Nibbly = memo(NibblyInner);

const styles = StyleSheet.create({
  clip: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
