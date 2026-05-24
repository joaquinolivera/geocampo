module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/app', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@geocampo/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@geocampo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@geocampo/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@rnmapbox/maps$': '<rootDir>/__mocks__/@rnmapbox/maps.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
