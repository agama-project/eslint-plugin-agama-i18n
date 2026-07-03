/*
 * Copyright (c) [2026] SUSE LLC
 *
 * See an example eslint plugin with typed linting:
 * https://github.com/typescript-eslint/examples/tree/main/packages/eslint-plugin-example-typed-linting
 *
 */

import { ESLintUtils } from "@typescript-eslint/utils";

// define the eslint rule
export const meta = {
  type: "problem",
  docs: {
    description:
      "Avoid using texts created with N_() function in React components",
    requiresTypeChecking: true,
  },
};

export function create(context) {
  const services = ESLintUtils.getParserServices(context);

  return {
    // handle curly brace expressions in JSX components (like `{foo}`)
    JSXExpressionContainer(node) {
      const type = services.getTypeAtLocation(node.expression);
      const typeName = type.aliasSymbol?.escapedName || type.intrinsicName;

      // type of the expression must not be "MarkedString"
      if (typeName === "MarkedString") {
        context.report(
          node.expression,
          "Texts created with N_() function need to be wrapped in _() before using in React components",
        );
      }
    },
  };
}
