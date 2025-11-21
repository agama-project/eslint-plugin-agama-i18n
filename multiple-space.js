/*
 * Copyright (c) [2025] SUSE LLC
 *
 */

// names of all translation functions
const translations = ["_", "n_", "N_", "Nn_"];
// names of the plural translation functions
const plurals = ["n_", "Nn_"];

const errorMsgSpaces =
  "Do not use multiple spaces in sequence, they are ignored in HTML";

/**
 * Check whether the AST node is a string literal with multiple spaces
 * @param {Object} node the node to check
 * @param {Object} context the context for reporting an error
 */
function checkNode(node, context) {
  if (
    node &&
    node.type === "Literal" &&
    typeof node.value === "string" &&
    node.value.match(/\s{2,}/)
  )
    context.report(node, errorMsgSpaces);
}

// define the eslint rule
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Check that string literals do not contain multiple whitespace characters in sequence.",
    },
  },
  create: function (context) {
    return {
      // callback for handling function calls
      CallExpression(node) {
        // not a translation function, skip it
        if (!translations.includes(node.callee.name)) return;

        // check the first argument
        checkNode(node.arguments[0], context);

        // check also the second argument for the plural forms
        if (plurals.includes(node.callee.name)) {
          checkNode(node.arguments[1], context);
        }
      },
    };
  },
};
