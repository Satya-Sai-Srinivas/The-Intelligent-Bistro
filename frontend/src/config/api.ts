import { Platform } from 'react-native';

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  // Android emulator maps host localhost to 10.0.2.2
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:3000`;
}

export const API_BASE_URL = getApiBaseUrl();
