import { styled } from 'nativewind';
import {
  View as RNView,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity as RNTouchableOpacity,
  ScrollView as RNScrollView,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';

export const View = styled(RNView);
export const Text = styled(RNText);
export const TextInput = styled(RNTextInput);
export const TouchableOpacity = styled(RNTouchableOpacity);
export const ScrollView = styled(RNScrollView);
export const SafeAreaView = styled(SafeAreaViewContext);
export const KeyboardAvoidingView = styled(RNKeyboardAvoidingView);
