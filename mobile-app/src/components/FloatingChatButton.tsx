import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

type FloatingChatButtonProps = {
  visible?: boolean;
  onPress?: () => void;
};

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  visible = true,
  onPress,
}) => {
  const theme = useTheme();
  const window = Dimensions.get('window');
  const buttonSize = 58;
  const defaultX = window.width - 20 - buttonSize;
  const defaultY = window.height - 118 - buttonSize;

  const position = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const breathingScale = useRef(new Animated.Value(1)).current;
  const floatingOffset = useRef(new Animated.Value(0)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryScale = useRef(new Animated.Value(0.7)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const tapWave = useRef(new Animated.Value(0)).current;

  const playTapWave = () => {
    tapWave.setValue(0);
    Animated.timing(tapWave, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onPanResponderGrant: () => {
          position.extractOffset();
          Animated.spring(pressScale, {
            toValue: 0.92,
            useNativeDriver: true,
            friction: 5,
            tension: 170,
          }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          position.flattenOffset();
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6,
            tension: 160,
          }).start();

          const distance = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
          if (distance < 5) {
            playTapWave();
            onPress?.();
          }
        },
      }),
    [onPress, position, pressScale]
  );

  useEffect(() => {
    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingScale, {
          toValue: 1.06,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(breathingScale, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingOffset, {
          toValue: -4,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatingOffset, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    const ringLoop = Animated.loop(
      Animated.timing(ringPulse, {
        toValue: 1,
        duration: 2100,
        useNativeDriver: true,
      })
    );

    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(entryScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 160,
      }),
    ]).start();

    breathingLoop.start();
    floatingLoop.start();
    ringLoop.start();

    return () => {
      breathingLoop.stop();
      floatingLoop.stop();
      ringLoop.stop();
    };
  }, [breathingScale, entryOpacity, entryScale, floatingOffset, ringPulse]);

  if (!visible) {
    return null;
  }

  const primary = theme.colors.primary;
  const ringScale = ringPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });
  const ringOpacity = ringPulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.22, 0.1, 0],
  });
  const tapWaveScale = tapWave.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const tapWaveOpacity = tapWave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0],
  });

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingWrap,
          {
            opacity: entryOpacity,
            transform: [
              ...position.getTranslateTransform(),
              { translateY: floatingOffset },
              { scale: entryScale },
              { scale: breathingScale },
              { scale: pressScale },
            ],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              borderColor: `${primary}55`,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              borderColor: `${primary}66`,
              transform: [{ scale: tapWaveScale }],
              opacity: tapWaveOpacity,
            },
          ]}
        />
        <View style={[styles.button, { backgroundColor: primary }]}>
          <View style={styles.innerGlow} />
          <MaterialCommunityIcons name="robot-happy-outline" size={28} color="#FFFFFF" />
          <View style={styles.badge}>
            <MaterialCommunityIcons name="star-four-points" size={11} color="#FFFFFF" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  floatingWrap: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 11,
  },
  innerGlow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badge: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FB7185',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
