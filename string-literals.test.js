/*
 * Copyright (c) [2023] SUSE LLC
 *
 */
const test = require("node:test");
const { RuleTester } = require("@typescript-eslint/rule-tester");
const stringLiteralsRule = require("./string-literals");

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;
RuleTester.itOnly = test.it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      // enable typed linting
      projectService: {
        allowDefaultProject: ["*.ts*"],
      },
    },
  },
});

// shared N_() function definition
const N_ = "function N_(s:string): MarkedString {return s as MarkedString}";

ruleTester.run("string-literals", stringLiteralsRule, {
  // valid code examples, these should pass
  valid: [
    { code: '_("foo")' },
    { code: "_('foo')" },
    { code: 'n_("one", "many", count)' },
    { code: "n_('one', 'many', count)" },
    // concatenating multiple string literals is allowed
    { code: '_("foo" + "bar")' },
    { code: '_("foo" + "bar" + "baz")' },
    { code: '_("foo" + "bar" + "baz" + "qux")' },
    { code: 'n_("foo" + "bar", "baz" + "qux", count)' },
    // using a variable initialized with N_()
    { code: `${N_}; const foo = N_("foo"); () => _(foo)` },
    { code: `${N_}; const foo = N_('foo'); () => _(foo)` },
    {
      code: `${N_}; const foo = N_("foo"); const bar = N_("bar"); () => _(foo) + _(bar)`,
    },
    // not optimal but still valid (rather use _("foo") directly)
    { code: `${N_}; () => {const foo = N_("foo"); _(foo)}` },
  ],
  // invalid examples, these should fail
  invalid: [
    // string literal errors
    { code: "_(null)", errors: 1 },
    { code: "_(undefined)", errors: 1 },
    { code: "_(42)", errors: 1 },
    { code: "_(foo)", errors: 1 },
    { code: "_(foo())", errors: 1 },
    { code: "_(`foo`)", errors: 1 },
    // missing argument errors
    { code: "_()", errors: 1 },
    { code: "n_('foo')", errors: 1 },
    { code: 'n_("foo")', errors: 1 },
    // string literal + missing argument errors
    { code: "n_(foo)", errors: 2 },
    // string literal error twice
    { code: "n_(foo, bar)", errors: 2 },
    { code: "Nn_(foo, bar)", errors: 2 },
    // concatenating is allowed only with string literals
    { code: "_(42 + 42)", errors: 1 },
    { code: '_("42" + 42)', errors: 1 },
    { code: '_(42 + "42")', errors: 1 },
    { code: '_(foo.toString() + "42")', errors: 1 },
    // different variable
    { code: `${N_}; const foo = N_("foo"); () => _(bar)`, errors: 1 },
    // initialized using an unknown function
    { code: 'const foo = foo("foo"); () => _(bar)', errors: 1 },
    // N_() cannot be used again
    { code: 'const foo = N_("foo"); () => N_(foo)', errors: 1 },
  ],
});
