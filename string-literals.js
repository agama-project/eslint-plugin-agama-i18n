/*
 * Copyright (c) [2023,2026] SUSE LLC
 *
 */

const { ESLintUtils } = require("@typescript-eslint/utils");

// names of all translation functions
const translations = ["_", "n_", "N_", "Nn_"];
// names of the plural translation functions
const plurals = ["n_", "Nn_"];

const errorMsgLiteral =
  "Use a string literal argument in the translation functions";
const errorMsgMissing = "Missing argument";

/**
 * Check whether the AST tree node is a string literal
 * @param {Object} node the node
 * @returns {boolean} true if the node is a string literal
 */
function isStringLiteral(node) {
  if (!node) return false;

  // plain string literal
  if (node.type === "Literal" && typeof node.value === "string") return true;

  // or a binary expression with "+" operator and string literals or a nested "+" operator
  return (
    node.type === "BinaryExpression" &&
    node.operator === "+" &&
    isStringLiteral(node.left) &&
    isStringLiteral(node.right)
  );
}

/**
 * Check whether the ATS node is a string literal
 * @param {Object} node the node to check
 * @param {Object} parentNode parent node for reporting error if `node` is undefined
 * @param {Object} context the context for reporting an error
 * @param {Object} services TypeScript parsing service to handle types
 */
function checkNode(node, parentNode, context, services) {
  if (node) {
    if (isStringLiteral(node)) return;

    // _() and n_() can accept texts previously marked with N_() and Nn_()
    if (["_", "n_"].includes(parentNode.callee.name)) {
      const type = services.getTypeAtLocation(node);
      const typeName = type.aliasSymbol?.escapedName || type.intrinsicName;

      if (typeName !== "MarkedString") {
        context.report(node, errorMsgLiteral);
      }
    } else {
      // wrong argument
      context.report(parentNode, errorMsgLiteral);
    }
  } else {
    // missing argument
    context.report(parentNode, errorMsgMissing);
  }
}

// define the eslint rule
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Check that only string literals are passed to the translation functions.",
      requiresTypeChecking: true,
    },
  },
  create: function (context) {
    const services = ESLintUtils.getParserServices(context);

    return {
      // callback for handling function calls
      CallExpression(node) {
        // not a translation function, skip it
        if (!translations.includes(node.callee.name)) return;

        // check the first argument
        checkNode(node.arguments[0], node, context, services);

        // check also the second argument for the plural forms
        if (plurals.includes(node.callee.name)) {
          checkNode(node.arguments[1], node, context, services);
        }
      },
    };
  },
};
