# The ESLint Plugin

![NPM Version](https://img.shields.io/npm/v/@agama-project/eslint-plugin-agama-i18n)
[![CI](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml/badge.svg)](https://github.com/agama-project/eslint-plugin-agama-i18n/actions/workflows/ci.yml)

This directory contains a simple ESLint plugin which checks for some common
translation problems:

- Only string literals are allowed as arguments in the translation functions (or
  their concatenation using the `+` operator)
- Translation functions are not allowed at the top level (they are evaluated too
  early, before the actual translations are available)
- The text should not contain multiple white space characters in a sequence (in
  HTML they are collapsed to a single space anyway and multiple spaces might be
  confusing for translators.)
- User-facing JSX props must receive translated texts, never plain strings.
  Third-party components are covered through a committed map classifying their
  props (see [the translated-prop rule](#the-translated-prop-rule) below).

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
      "agama-i18n/top-level-translation": "error",
      "agama-i18n/multiple-space": "error",
      "agama-i18n/marked-string": "error"
    }
  }
];
```

The `translated-prop` rule is not part of the snippet above: it needs typed
linting and a per-project configuration, see below.

## The translated-prop rule

A fail-closed check that user-facing JSX props receive translated texts. The
other rules cover JSX children and the translation functions themselves; this
rule covers the remaining gap, props on third-party components typed as plain
`string`:

```jsx
<ToggleGroupItem text="Summary" />   // valid TypeScript, untranslated text in the UI
```

A checked prop must receive a `TranslatedString` value (the result of the
`_()` or `n_()` functions); string literals, template literals,
plain-`string` typed expressions and strings branded with other tags
(`string & { tag }` intersections) are reported.

What is checked:

- The attributes carrying user-facing text on any element, plain HTML
  included: `alt`, `aria-description`, `aria-label`, `aria-placeholder`,
  `aria-roledescription`, `aria-valuetext`, `placeholder`, `title` (extendable
  with the `alwaysUserFacing` option).
- On components coming from the packages listed in the `packages` option, a
  human-authored map classifies the props, and a missing classification is an
  error:
  - a component missing from the map is reported at every use site, forcing a
    review of its props when it is used for the first time;
  - props listed as `translatable` must receive a `TranslatedString`;
  - props listed as `machine` are skipped, as well as the built-in
    machine-facing names (`id`, `className`, `data-*` and `on*` attributes,
    ...);
  - any other prop accepting a plain string is reported as unclassified, even
    when the passed value is translated: the classification must land in the
    map;
  - props which cannot receive an arbitrary string (booleans, numbers,
    callbacks, literal unions like `variant="primary"`) are out of scope
    automatically, so they need no classification.
- When the map records a reviewed package `version` and a different version is
  installed, the rule reports it. This forces a human review of the map on
  every package update: check the new release for components or props carrying
  user-facing text, adjust the map and record the new version.

Configuration example:

```js
// eslint.config.mjs
import translatedProps from "./translated-props.json" with { type: "json" };

// in the rules section (typed linting must be enabled, see
// https://typescript-eslint.io/getting-started/typed-linting/):
"agama-i18n/translated-prop": ["error", {
  packages: ["@patternfly/react-core"],
  map: translatedProps,
}]
```

With a committed `translated-props.json` like:

```json
{
  "@patternfly/react-core": {
    "version": "6.5.1",
    "components": {
      "ToggleGroupItem": {
        "translatable": ["text"],
        "machine": ["buttonId"]
      },
      "Button": { "translatable": [] }
    }
  }
}
```

An empty `"translatable": []` entry records that a human reviewed the
component and found nothing to translate beyond the checks above; it is what
makes the map auditable.

The `"*"` value in the `packages` option covers every non-HTML component, and
the `"*"` key in the map applies to components without a resolvable package
(local components).

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
- https://ts-ast-viewer.com - similar tool for TypeScript sources
