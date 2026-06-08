import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, config } from '@geocampo/ui';
import { LanguageProvider } from '@/lib/i18n';

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="geocampo">
      <LanguageProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </LanguageProvider>
    </TamaguiProvider>
  );
}
