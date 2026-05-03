import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SignOutHeaderButton } from '../components/SignOutHeaderButton';
import type { FeedStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { RecipeFeedScreen } from './RecipeFeedScreen';

type Props = NativeStackScreenProps<FeedStackParamList, 'FeedHome'>;

export function FeedHomeScreen({ navigation }: Props) {
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Nibbly',
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => navigation.navigate('RecipeSearch')}
            style={styles.headerIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Buscar recetas por título"
            hitSlop={8}
          >
            <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <SignOutHeaderButton />
        </View>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.flex}>
      <RecipeFeedScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
