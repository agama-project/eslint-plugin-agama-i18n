/*
 * Copyright (c) [2026] SUSE LLC
 *
 * Unit tests for the translated-prop rule
 */

const test = require("node:test");
// see https://typescript-eslint.io/packages/rule-tester/
const { RuleTester } = require("@typescript-eslint/rule-tester");
const translatedPropRule = require("./translated-prop");

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

// shared preamble: a branded translated type, a fake translation function
// and a third-party-like component with mixed props
const preamble = `
  type TranslatedString = string & { __tag: "Translated" };
  const _ = (text: string): TranslatedString => text as TranslatedString;
  const Item = (props: {
    text?: string;
    variant?: "primary" | "secondary";
    isDisabled?: boolean;
    buttonId?: string;
    count?: number;
  }) => null;
`;

// options covering every component (package resolution needs node_modules
// on disk, which the rule tester does not provide; for the same reason the
// map's version pin is exercised by the integration test only), with the
// given map entry for Item under the "*" fallback section
const withItemEntry = (entry) => [
  { packages: ["*"], map: { "*": { components: { Item: entry } } } },
];

ruleTester.run("translated-prop", translatedPropRule, {
  valid: [
    // translated literal in a translatable prop
    {
      code: `${preamble} <Item text={_("Summary")} />`,
      options: withItemEntry({ translatable: ["text"] }),
    },
    // translated value through a variable
    {
      code: `${preamble} const t = _("Summary"); <Item text={t} />`,
      options: withItemEntry({ translatable: ["text"] }),
    },
    // ternary of translated values
    {
      code: `${preamble} declare const c: boolean; <Item text={c ? _("A") : _("B")} />`,
      options: withItemEntry({ translatable: ["text"] }),
    },
    // literal-union props cannot receive arbitrary strings: out of scope
    {
      code: `${preamble} <Item variant="primary" />`,
      options: withItemEntry({ translatable: [] }),
    },
    // boolean and numeric props are out of scope
    {
      code: `${preamble} <Item isDisabled count={2} />`,
      options: withItemEntry({ translatable: [] }),
    },
    // machine-facing prop classified in the map entry
    {
      code: `${preamble} <Item buttonId="toggle-1" />`,
      options: withItemEntry({ translatable: [], machine: ["buttonId"] }),
    },
    // built-in machine props need no verdict in the map
    {
      code: `${preamble} <Item id="main" className="pf-m-compact" />`,
      options: withItemEntry({ translatable: [] }),
    },
    // data-* attributes are machine-facing
    {
      code: `${preamble} <Item data-state="open" />`,
      options: withItemEntry({ translatable: [] }),
    },
    // no packages covered: component props are not checked
    `${preamble} <Item text="Summary" />`,
    // plain HTML attributes outside the always-user-facing list
    'const el = <a href="https://example.com">link</a>;',
    // translated aria-label on plain HTML
    `${preamble} const el = <button aria-label={_("Close")} />;`,
  ],
  invalid: [
    // plain string literal in a translatable prop
    {
      code: `${preamble} <Item text="Summary" />`,
      options: withItemEntry({ translatable: ["text"] }),
      errors: [{ messageId: "untranslated" }],
    },
    // plain string variable in a translatable prop
    {
      code: `${preamble} const t = "Summary"; <Item text={t} />`,
      options: withItemEntry({ translatable: ["text"] }),
      errors: [{ messageId: "untranslated" }],
    },
    // template literal
    {
      code: `${preamble} const n = "eth0"; <Item text={\`Device \${n}\`} />`,
      options: withItemEntry({ translatable: ["text"] }),
      errors: [{ messageId: "untranslated" }],
    },
    // unclassified string prop fails closed, even if it looks machine-like
    {
      code: `${preamble} <Item buttonId="toggle-1" />`,
      options: withItemEntry({ translatable: ["text"] }),
      errors: [{ messageId: "unclassifiedProp" }],
    },
    // a string branded with another tag is still a plain string, not a
    // translated one
    {
      code: `${preamble} type ProductId = string & { __tag: "ProductId" };
        declare const id: ProductId; <Item text={id} />`,
      options: withItemEntry({ translatable: ["text"] }),
      errors: [{ messageId: "untranslated" }],
    },
    // classification is required even when the value is already translated
    {
      code: `${preamble} <Item text={_("Summary")} />`,
      options: withItemEntry({ translatable: [] }),
      errors: [{ messageId: "unclassifiedProp" }],
    },
    // covered component absent from the map, even without attributes
    {
      code: `${preamble} <Item />`,
      options: [{ packages: ["*"], map: {} }],
      errors: [{ messageId: "unmappedComponent" }],
    },
    // an unmapped component is reported as a whole, not per attribute
    {
      code: `${preamble} <Item text="Summary" />`,
      options: [{ packages: ["*"], map: {} }],
      errors: [{ messageId: "unmappedComponent" }],
    },
    // aria-label is user-facing on any element, plain HTML included
    {
      code: `const el = <button aria-label="Close" />;`,
      errors: [{ messageId: "untranslated" }],
    },
    // placeholder on plain HTML
    {
      code: `const el = <input placeholder="Search" />;`,
      errors: [{ messageId: "untranslated" }],
    },
  ],
});
