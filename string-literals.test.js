/*
 * Copyright (c) [2023] SUSE LLC
 *
 */

const { RuleTester } = require("eslint");
const stringLiteralsRule = require("./string-literals");

const ruleTester = new RuleTester();

ruleTester.run(
  "string-literals",
  stringLiteralsRule,
  {
    // valid code examples, these should pass
    valid: [
      { code: "_(\"foo\")" },
      { code: "_('foo')" },
      { code: "n_(\"one\", \"many\", count)" },
      { code: "n_('one', 'many', count)" },
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
      { code: "_(\"foo\" + \"bar\")", errors: 1 },
      { code: "_('foo' + 'bar')", errors: 1 },
      // missing argument errors
      { code: "_()", errors: 1 },
      { code: "n_('foo')", errors: 1 },
      { code: "n_(\"foo\")", errors: 1 },
      // string literal + missing argument errors
      { code: "n_(foo)", errors: 2 },
      // string literal error twice
      { code: "n_(foo, bar)", errors: 2 },
      { code: "Nn_(foo, bar)", errors: 2 },
    ],
  }
);
