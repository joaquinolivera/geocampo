import { createTamagui } from '@tamagui/core';
import { config as tamaguiConfig } from '@tamagui/config/v3';

/**
 * GeoCampo Design System Configuration
 * Colors: Neon Lime (#DEFF9A) on Charcoal Black (#0A0A0B)
 */
export const config = createTamagui({
  ...tamaguiConfig,
  themes: {
    ...tamaguiConfig.themes,
    geocampo: {
      background: '#0A0A0B',
      backgroundHover: '#1A1A1B',
      backgroundPress: '#2A2A2B',
      backgroundFocus: '#1A1A1B',
      borderColor: '#2A2A2B',
      borderColorHover: '#3A3A3B',
      borderColorPress: '#4A4A4B',
      borderColorFocus: '#3A3A3B',
      color: '#DEFF9A', // Neon Lime primary
      colorHover: '#EEFFBA',
      colorPress: '#CEEF8A',
      colorFocus: '#EEFFBA',
      placeholderColor: '#6A6A6B',
      shadowColor: '#000000',
      shadowColorHover: '#000000',
      shadowColorPress: '#000000',
      shadowColorFocus: '#000000',
    },
  },
  defaultTheme: 'geocampo',
});

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
