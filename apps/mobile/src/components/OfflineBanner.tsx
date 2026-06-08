/**
 * OfflineBanner — shows a subtle yellow strip when the device is offline
 * or there are pending queue items awaiting sync.
 *
 * Usage:
 *   <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface OfflineBannerProps {
  isOnline:    boolean;
  pendingCount: number;
}

export default function OfflineBanner({ isOnline, pendingCount }: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  const message = !isOnline
    ? '📡 Sin conexión — los cambios se sincronizarán al reconectar'
    : `🔄 Sincronizando ${pendingCount} acción${pendingCount > 1 ? 'es' : ''}…`;

  const bgColor = !isOnline ? '#7C3A00' : '#2A3A00';
  const textColor = !isOnline ? '#FFB444' : '#DEFF9A';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width:          '100%',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems:     'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
