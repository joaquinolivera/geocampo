import { View, Text, YStack } from '@geocampo/ui';

export default function HerdsScreen() {
  return (
    <View flex={1} backgroundColor="#0A0A0B" padding="$4">
      <YStack space="$4">
        <Text color="#DEFF9A" fontSize="$6" fontWeight="bold">
          Herd Management
        </Text>
        <Text color="#6A6A6B" fontSize="$3">
          Manage herds and movements between pastures
        </Text>
      </YStack>
    </View>
  );
}
