import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, config } from '@geocampo/ui';

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="geocampo">
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </TamaguiProvider>
  );
}
