/*
 * Copyright (c) [2026] SUSE LLC
 *
 * Unit tests for the marked-string rule
 */

const test = require("node:test");
// see https://typescript-eslint.io/packages/rule-tester/
const { RuleTester } = require("@typescript-eslint/rule-tester");
const markedStringRule = require("./marked-string");

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
      // enable JSX parsing
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run("marked-string", markedStringRule, {
  valid: [
    'const t = "test"; <div>{t}</div>',
    'const t:string = "test"; <div>{t}</div>',
    'const t:string = "test"; <div className={t}></div>',
  ],
  invalid: [
    {
      // MarkedString in JSX child content
      code: 'const t:MarkedString = "test"; <div>{t}</div>',
      errors: [
        {
          column: 38,
          endColumn: 39,
          line: 1,
          endLine: 1,
          message:
            "Texts created with N_() function need to be wrapped in _() before using in React components",
        },
      ],
    },
    {
      // MarkedString in JSX attribute
      code: 'const t:MarkedString = "test"; <div className={t}></div>',
      errors: [
        {
          column: 48,
          endColumn: 49,
          line: 1,
          endLine: 1,
          message:
            "Texts created with N_() function need to be wrapped in _() before using in React components",
        },
      ],
    },
  ],
});
