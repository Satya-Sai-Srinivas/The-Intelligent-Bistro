import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function useAiThinkingPulse(isThinking: boolean) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isThinking) {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isThinking, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    borderColor: `rgba(212, 175, 55, ${opacity.value})`,
  }));

  return animatedStyle;
}
