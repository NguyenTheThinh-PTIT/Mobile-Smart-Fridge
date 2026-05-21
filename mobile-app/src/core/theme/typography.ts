import { Text, TextInput } from 'react-native';

type PaperFontVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall';

export const appFonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

const getFamilyByVariant = (variant: PaperFontVariant): string => {
  if (variant.startsWith('display')) {
    return appFonts.bold;
  }
  if (variant.startsWith('headline') || variant.startsWith('title')) {
    return appFonts.semiBold;
  }
  if (variant.startsWith('label')) {
    return appFonts.medium;
  }
  return appFonts.regular;
};

export const getPaperVariantFontFamily = (variant: PaperFontVariant): string =>
  getFamilyByVariant(variant);

export const applyGlobalTypography = (): void => {
  const textDefaultProps = Text.defaultProps || {};
  const textInputDefaultProps = TextInput.defaultProps || {};

  Text.defaultProps = {
    ...textDefaultProps,
    style: [{ fontFamily: appFonts.regular }, textDefaultProps.style],
  };

  TextInput.defaultProps = {
    ...textInputDefaultProps,
    style: [{ fontFamily: appFonts.regular }, textInputDefaultProps.style],
  };
};
