# Eslint-plugin-agama-i18n changelog

## 1.5.0

- Added a new `translated-prop` rule. A fail-closed, type-aware check that
  user-facing JSX props receive translated texts (`TranslatedString`), never
  plain strings:

```jsx
// error: valid TypeScript, untranslated text in the UI
<ToggleGroupItem text="Summary" />

// correct
<ToggleGroupItem text={_("Summary")} />
```

Attributes like `aria-label`, `placeholder` or `title` are checked on every
element. Third-party components are covered through a committed, human-authored
map classifying their string props as translatable or machine-facing; a
component or prop without a classification is an error, and a version pin in
the map forces a review on every package update. See the README for the
details.

Note: the rule requires typed linting
(https://typescript-eslint.io/getting-started/typed-linting/).

## 1.4.0

- Added a new `marked-string` rule. This rule checks that the texts marked with
  `N_()` function are not used in React components as they need to be translated
  with the `_()` function before displaying in the UI.

```js
  // not translated, only marked for translation
  const text = N_("text");

  // error
  <div>{text}</div>

  // correct
  <div>{_(text)}</div>
```

Note: Internally the rule actually checks for using the `MarkedString` type. If
that is detected an error is reported.

- Improved the `string-literals` rule to use the TypeScript types to avoid false
  positives when `N_()` result is used in `_()` function.

## 1.3.0

- Check multiple white space characters in translated messages.

Example:

```js
{
  {
    {
      const message = _("Some very long message \
        which spans across multiple lines.");
    }
  }
}
```

The problem is that the indentation on the second line is actually included in
the message text. The HTML collapses multiple spaces to a single space when
rendered in a browser so in the end it is not a visible problem for users.

But it might be confusing for the translators, they will see text "Some very
long message &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; which spans across multiple
lines." to translate and they might be wondering if the the extra space
characters need to be kept or not.

The problem can be fixed in two ways:

1. Remove the indentation so the text starts on the beginning of the next line.
   But that visually breaks the code and that does not look nice.
2. Split the parts into separate substrings and merge them with the `+`
   operator. The latest GNU gettext correctly concatenates the string parts into
   a single translatable text when generating the POT file so it is a
   transparent operation for the translators.

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
