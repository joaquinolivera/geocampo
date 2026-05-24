import { Tabs } from 'expo-router';
import { Text } from '@geocampo/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DEFF9A',
        tabBarInactiveTintColor: '#6A6A6B',
        tabBarStyle: {
          backgroundColor: '#0A0A0B',
          borderTopColor: '#2A2A2B',
        },
        headerStyle: {
          backgroundColor: '#0A0A0B',
        },
        headerTintColor: '#DEFF9A',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="herds"
        options={{
          title: 'Herds',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🐄</Text>,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <Text style={{ color }}>💉</Text>,
        }}
      />
    </Tabs>
  );
}
