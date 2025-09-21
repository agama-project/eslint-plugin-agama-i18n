/*
 * Copyright (c) [2023] SUSE LLC
 *
 */

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
 * @param {Object} variables list of the declared global variables initialized with N_()
 */
function checkNode(node, parentNode, context, variables) {
  if (node) {
    // not a string literal
    if (!isStringLiteral(node)) {
      // not a global variable
      if (node.type !== "Identifier" || !variables.includes(node.name)) {
        context.report(node, errorMsgLiteral);
      }
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
    },
  },
  create: function (context) {
    // track the global variables initialized with N_() function
    const variables = [];

    return {
      // callback for handling function calls
      CallExpression(node) {
        // not a translation function, skip it
        if (!translations.includes(node.callee.name)) return;

        // check the first argument
        checkNode(node.arguments[0], node, context, variables);

        // check also the second argument for the plural forms
        if (plurals.includes(node.callee.name)) {
          checkNode(node.arguments[1], node, context, variables);
        }
      },
      // variable declaration
      VariableDeclarator(node) {
        if (
          node.init &&
          // initialized via N_()
          node.init.type === "CallExpression" &&
          node.init.callee.name === "N_" &&
          // in the top level context
          node.parent.parent.type === "Program"
        ) {
          variables.push(node.id.name);
        }
      },
    };
  },
};
