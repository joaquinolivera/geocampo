import { Tabs } from 'expo-router';
import { Text, XStack } from '@geocampo/ui';
import { TouchableOpacity } from 'react-native';
import { useT } from '@/lib/i18n';

/**
 * Language toggle pill rendered in the header.
 * Switches between EN and ES instantly, persisting to AsyncStorage.
 */
function HeaderLangToggle() {
  const { language, setLanguage } = useT();

  return (
    <XStack marginRight={12} borderRadius={8} borderWidth={1} borderColor="#2A2A2B" overflow="hidden">
      {(['en', 'es'] as const).map((lang) => {
        const active = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: active ? '#DEFF9A' : 'transparent',
            }}
            accessibilityLabel={lang === 'en' ? 'English' : 'Español'}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: active ? '#0A0A0B' : '#6A6A6B',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {lang}
            </Text>
          </TouchableOpacity>
        );
      })}
    </XStack>
  );
}

export default function TabLayout() {
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DEFF9A',
        tabBarInactiveTintColor: '#6A6A6B',
        tabBarStyle: {
          backgroundColor: '#0A0A0B',
          borderTopColor: '#2A2A2B',
        },
        headerStyle: { backgroundColor: '#0A0A0B' },
        headerTintColor: '#DEFF9A',
        headerRight: () => <HeaderLangToggle />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'GeoCampo',
          tabBarLabel: t('nav.home') || 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarLabel: t('nav.map') || 'Map',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="herds"
        options={{
          title: t('herds.title'),
          tabBarLabel: t('herds.title'),
          tabBarIcon: ({ color }) => <Text style={{ color }}>🐄</Text>,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: t('health.title'),
          tabBarLabel: t('health.title'),
          tabBarIcon: ({ color }) => <Text style={{ color }}>💉</Text>,
        }}
      />
    </Tabs>
  );
}
