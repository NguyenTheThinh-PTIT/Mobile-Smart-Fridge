import { MD3LightTheme } from 'react-native-paper';
import { getPaperVariantFontFamily } from './typography';

const fonts = Object.fromEntries(
  Object.entries(MD3LightTheme.fonts).map(([variant, value]) => [
    variant,
    {
      ...value,
      fontFamily: getPaperVariantFontFamily(variant as keyof typeof MD3LightTheme.fonts),
    },
  ])
);

export const paperTheme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#F97316',
    secondary: '#FB923C',
    background: '#F8FAFC',
    surface: '#FFFFFF',
  },
};
