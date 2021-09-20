module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    // https://github.com/facebook/jest/issues/9430#issuecomment-782837946
    '^(.*)\\.js$': '$1',
  },
  // transform: {},
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
}
