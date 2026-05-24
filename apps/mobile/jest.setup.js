// Mobile app Jest setup
// Mock react-native modules that may cause issues in tests

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
