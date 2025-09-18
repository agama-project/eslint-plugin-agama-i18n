/*
 * Copyright (c) [2025] SUSE LLC
 *
 * Unit tests for the opt level translations check.
 */

const { RuleTester } = require("eslint");
const topLevelRule = require("./top-level-translation");

const ruleTester = new RuleTester();

ruleTester.run("top-level-translation", topLevelRule, {
  // valid code examples, these should pass
  valid: [
    // these can be used at the top level
    { code: 'const foo = N_("foo")' },
    { code: 'const foo = Nn_("foo", "bar", count)' },
    // these can be used in a function body
    // named function
    { code: 'function foo() {const foo = _("foo");}' },
    // anonymous function
    { code: 'const foo = function () {const foo = _("foo");}' },
    // arrow function
    { code: '() => {const foo = _("foo");}' },
    // nested arrow function
    { code: '() => () => { const foo = _("foo");}' },
  ],
  // invalid examples, these should fail
  invalid: [
    // these cannot be used at the top level
    { code: 'const foo = _("foo")', errors: 1 },
    { code: 'const foo = n_("foo", "bar", count)', errors: 1 },
    // top level after nested call
    {
      code: '() => () => { const foo = _("foo");}; const foo = n_("foo", "bar", count)',
      errors: 1,
    },
  ],
});
