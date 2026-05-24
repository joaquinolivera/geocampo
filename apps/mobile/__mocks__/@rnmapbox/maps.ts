import React from 'react';
import { View } from 'react-native';

export const setAccessToken = jest.fn();

export const MapView = ({ children }: { children?: React.ReactNode }) => (
  <View testID="map-view">{children}</View>
);

export const Camera = () => null;

export const ShapeSource = ({ children }: { children?: React.ReactNode }) => (
  <View testID="shape-source">{children}</View>
);

export const FillLayer = () => null;

export const LineLayer = () => null;

export const PointAnnotation = ({ children }: { children?: React.ReactNode }) => (
  <View testID="point-annotation">{children}</View>
);
