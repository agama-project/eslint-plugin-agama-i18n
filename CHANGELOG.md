# Eslint-plugin-agama-i18n changelog

## 1.2.0

- Track the global constants initialized with `N_()` so not using a string
  literal in this construct is not reported as an error:

  ```js
  const foo = N_("foo");
  () => _(foo);
  ```

## 1.1.0

- Allow merging strings with + operator in the translation functions (e.g.
  `_("foo" + "bar")`). The latest GNU gettext supports that in the Javascript
  input format.
- Added a new `top-level-translation` check which checks for calling the
  translation functions `_()` and `n_()` at the top level in the Javascript
  file. That does not work because these calls are evaluated too early, before
  the actual translations are available.
