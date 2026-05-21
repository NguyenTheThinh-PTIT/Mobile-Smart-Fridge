import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getWidthScale = (width: number) => clamp(width / BASE_WIDTH, 0.85, 1.2);

export const scaleSize = (size: number, width: number) => Math.round(size * getWidthScale(width));

export const isCompactWidth = (width: number) => width < 360;
export const isLargeWidth = (width: number) => width >= 420;

export const useResponsive = () => {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const scale = (size: number) => scaleSize(size, width);

    return {
      width,
      height,
      fontScale,
      isCompact: isCompactWidth(width),
      isLarge: isLargeWidth(width),
      scale,
      spacing: (size: number) => scale(size),
      icon: (size: number) => scale(size),
      typography: (size: number) => scale(size),
    };
  }, [width, height, fontScale]);
};
