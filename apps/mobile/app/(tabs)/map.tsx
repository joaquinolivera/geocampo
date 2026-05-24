import { View, Text } from '@geocampo/ui';

export default function MapScreen() {
  return (
    <View flex={1} backgroundColor="#0A0A0B" justifyContent="center" alignItems="center">
      <Text color="#DEFF9A" fontSize="$6">
        MapCanvas
      </Text>
      <Text color="#6A6A6B" fontSize="$3" marginTop="$2">
        Mapbox integration coming in Phase 2
      </Text>
    </View>
  );
}
