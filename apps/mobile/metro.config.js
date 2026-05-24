const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the workspace root
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch all files in the workspace
config.watchFolders = [workspaceRoot];

// Resolve modules from the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force Metro to resolve symlinks
config.resolver.disableHierarchicalLookup = false;

// Web: Mock @rnmapbox/maps to avoid mapbox-gl dependency
if (process.env.EXPO_OS === 'web') {
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@rnmapbox/maps': path.resolve(projectRoot, '__mocks__/@rnmapbox/maps.ts'),
  };
}

module.exports = config;
