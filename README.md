# The ESLint Plugin

![NPM Version](https://img.shields.io/npm/v/@agama-project/eslint-plugin-agama-i18n)
[![CI](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml)

This directory contains a simple ESLint plugin which checks for some common
translation problems:

- Only string literals are allowed as arguments in the translation functions (or
  their concatenation using the `+` operator)
- Translation functions are not allowed at the top level (they are evaluated too
  early, before the actual translations are available)

It is closely tied to the [Agama](https://github.com/agama-project/agama)
project and probably does not make much sense for other projects.

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
      "agama-i18n/top-level-translation": "error"
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

## Testing changes during development

To test new changes locally during development install the plugin into an Agama
checkout using command `npm install ../../eslint-plugin-agama-i18n/` (the path
should point to checkout of this plugin).

This creates a symlink pointing to the plugin directory so it will always use
the latest files from the local plugin, that is very convenient during
development.

## Publishing new version

The NPM package is automatically published by a GitHub Action when a version tag
is created.

To create a new tag update the version in `package.json` and run the `npm run
tag` command.

## Links

- https://eslint.org/docs/latest/extend/custom-rule-tutorial - tutorial for
  writing an ESLint plugin
- https://eslint.org/docs/latest/extend/custom-rules - documentation for
  writing an ESLint plugin
- https://astexplorer.net - online tool for browsing a parsed AST tree,
  useful for inspecting the properties of parsed source code
