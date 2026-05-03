import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import type { FeedStackParamList } from '../navigation/types';
import { RecipeFeedScreen } from './RecipeFeedScreen';

type Props = NativeStackScreenProps<FeedStackParamList, 'FeedHome'>;

export function FeedHomeScreen(_props: Props) {
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
});
