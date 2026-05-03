import type { ImageSourcePropType } from 'react-native';

import type { NibblyState } from './nibblyTypes';

/** Mapa estático: Metro empaqueta cada asset una sola vez. */
export const NIBBLY_SOURCES: Record<NibblyState, ImageSourcePropType> = {
  idle: require('../../../../assets/nibbly/feliz.png'),
  feliz: require('../../../../assets/nibbly/feliz.png'),
  alegre: require('../../../../assets/nibbly/alegre.png'),
  celebrando: require('../../../../assets/nibbly/celebrando.png'),
  pensativa: require('../../../../assets/nibbly/pensativa.png'),
  cocinera: require('../../../../assets/nibbly/cocinera.png'),
  dudosa: require('../../../../assets/nibbly/dudosa.png'),
};
