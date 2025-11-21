/*
 * Copyright (c) [2025] SUSE LLC
 *
 */

const { RuleTester } = require("eslint");
const multipleSpaceRule = require("./multiple-space");

const ruleTester = new RuleTester();

ruleTester.run("multiple-space", multipleSpaceRule, {
  // valid code examples, these should pass
  valid: [
    { code: '_("f o\to")' },
    { code: "_(' f o\to ')" },
    { code: 'n_("one", "m a n y", count)' },
    { code: "n_('o n e', 'many', count)" },
  ],
  // invalid examples, these should fail
  invalid: [
    // double space
    { code: "_('f  o  o')", errors: 1 },
    { code: '_("f  o  o")', errors: 1 },
    { code: 'n_("one", "m  a  n  y", count)', errors: 1  },
    { code: 'n_("o  n  e", "many", count)', errors: 1  },
    // double tabs
    { code: "_('f\t\to\t\to')", errors: 1 },
    // mixed space + tab
    { code: "_('f \too')", errors: 1 },
    { code: "_('f\t oo')", errors: 1 },
  ],
});
