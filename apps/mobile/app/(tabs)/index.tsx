import { View, Text, YStack } from '@geocampo/ui';

export default function HomeScreen() {
  return (
    <View flex={1} backgroundColor="#0A0A0B" padding="$4">
      <YStack space="$4">
        <Text color="#DEFF9A" fontSize="$8" fontWeight="bold">
          GeoCampo
        </Text>
        <Text color="#FFFFFF" fontSize="$4">
          Offline-First Livestock Management
        </Text>
        <View backgroundColor="#1A1A1B" padding="$4" borderRadius="$4">
          <Text color="#DEFF9A" fontSize="$5" fontWeight="600">
            System Status
          </Text>
          <Text color="#6A6A6B" fontSize="$3" marginTop="$2">
            🟢 Active sync
          </Text>
          <Text color="#6A6A6B" fontSize="$3">
            📡 Offline mode available
          </Text>
        </View>
      </YStack>
    </View>
  );
}
