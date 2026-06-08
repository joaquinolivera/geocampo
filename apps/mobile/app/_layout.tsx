import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, config } from '@geocampo/ui';
import { LanguageProvider } from '@/lib/i18n';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import OfflineBanner from '@/components/OfflineBanner';
import { setupNotificationListeners, requestNotificationPermission } from '@/lib/notifications';
import type { QueuedAction } from '@/lib/offlineQueue';

/**
 * Default queue executor — extend this to handle your specific action types.
 * Photo uploads, API calls, etc. should be added here.
 */
async function defaultExecutor(_action: QueuedAction): Promise<void> {
  // TODO: dispatch based on action.type
  // e.g. if (action.type === 'upload_photo') await uploadPhoto(JSON.parse(action.payload));
  console.warn('[OfflineQueue] No executor registered for type:', _action.type);
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { isOnline, pendingCount } = useOfflineSync(defaultExecutor);

  useEffect(() => {
    // Request notification permission on first launch
    requestNotificationPermission().catch(() => {});

    // Set up notification listeners
    const { removeListeners } = setupNotificationListeners(
      (notification) => {
        console.log('[Notifications] Received:', notification.request.content.title);
      },
      (_response) => {
        // TODO: navigate to relevant screen based on _response.notification.request.content.data
      }
    );
    return removeListeners;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="geocampo">
      <LanguageProvider>
        <AppShell>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </AppShell>
      </LanguageProvider>
    </TamaguiProvider>
  );
}
