import React from 'react';
import { View } from './styled';

interface ResponsiveShellProps {
  children: React.ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  return (
    <View className="flex-1 w-full max-w-2xl mx-auto self-center relative">
      {children}
    </View>
  );
}
