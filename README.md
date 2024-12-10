# The ESLint Plugin

![NPM Version](https://img.shields.io/npm/v/eslint-plugin-agama-i18n)
[![CI](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml)

This directory contains a simple ESLint plugin which checks that only string
literals are passed to the translation functions.

It is closely tied to the [Agama](https://github.com/agama-project/agama) project and
probably does not make much sense for other projects.

## Installation

Run

```shell
npm install --save-dev @agama-project/eslint-plugin-agama-i18n
```

Update your ESLint configuration:

```js
// eslint.config.mjs
import agamaI18nEslintPlugin from "@agama-project/eslint-plugin-agama-i18n";

export default [
  {
    plugins: {
      "agama-i18n": agamaI18nEslintPlugin,
    },
  },
  {
    rules: {
      "agama-i18n/string-literals": "error",
    }
  }
];
```

## Disabling the Check

In some rare cases using a variable instead of a string literal is correct. In
that case disable the check locally:

```js
const SIZES = [ N_("small"), N_("medium"), N_("large") ];

// returns one of the sizes above
const sz = getSize();

// eslint-disable-next-line agama-i18n/string-literals
return <span>{_(sz)}</span>;
```

## Publishing new version

The NPM package is automatically published by a GitHub Action when a version tag is created.

To create a new tag update the version in `package.json` and run the `npm run tag` command.

## Links

- https://eslint.org/docs/latest/extend/custom-rule-tutorial - tutorial for
  writing an ESLint plugin
- https://eslint.org/docs/latest/extend/custom-rules - documentation for
  writing an ESLint plugin
- https://astexplorer.net - online tool for browsing a parsed AST tree,
  useful for inspecting the properties of parsed source code
