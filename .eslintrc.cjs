'use strict'

module.exports = {
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // TODO FIXME
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TODO FIXME temporary exceptions:
    'class-methods-use-this': 'off',
    'func-names': 'off',
    'max-classes-per-file': 'off',
    'no-param-reassign': 'off',
    'no-return-assign': 'off',
    'no-underscore-dangle': 'off',
    'object-shorthand': 'off',
    'prefer-destructuring': 'off',
    'prefer-object-spread': 'off',
    'prefer-template': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/dot-notation': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
  },
}

// {
//   "plugins": ["@typescript-eslint", "prettier"],
//   "extends": [
//     "eslint:recommended",
//     "plugin:@typescript-eslint/eslint-recommended",
//     "plugin:@typescript-eslint/recommended",
//     "prettier"
//   ],
//   "rules": {
//     "@typescript-eslint/restrict-plus-operands": "error",
//     "@typescript-eslint/interface-name-prefix": "off",
//     "no-async-promise-executor": "warn",
//     "@typescript-eslint/explicit-function-return-type": "off",
//     "@typescript-eslint/indent": "off",
//     "@typescript-eslint/ban-types": "warn",
//     "no-console": "warn",
//     "no-shadow": "warn"
//   },
//   "overrides": [
//     {
//       "files": ["test/**/*.ts"],
//       "rules": {
//         "no-console": "off",
//         "@typescript-eslint/no-explicit-any": "off",
//         "no-prototype-builtins": "off",
//         "strictBindCallApply": "off"
//       }
//     }
//   ]
// }
