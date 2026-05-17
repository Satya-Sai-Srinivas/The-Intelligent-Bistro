import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function useAiThinkingPulse(isActive: boolean) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      opacity.value = withRepeat(withTiming(0.55, { duration: 800 }), -1, true);
      scale.value = withRepeat(withTiming(1.04, { duration: 800 }), -1, true);
    } else {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isActive, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    borderColor: `rgba(212, 175, 55, ${opacity.value})`,
  }));

  return animatedStyle;
}
