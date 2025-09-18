/*
 * Copyright (c) [2025] SUSE LLC
 *
 * Check that the translation functions are not used at the top level in the
 * source code.
 */

// names of all translation functions which should not be used at the top level,
// the "N_()", "Nn_()" actually do not translate the texts so they are allowed
const translations = ["_", "n_"];

// define the eslint rule
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Check that the translation functions are not used at the top level.",
    },
  },
  create: function (context) {
    // the current function level, 0 = toplevel global context
    let level = 0;

    function enterFunction() {
      // increase nesting
      level += 1;
    }

    function leaveFunction() {
      // decrease nesting
      level -= 1;
    }

    function callFunction(node) {
      // not a translation function, skip it
      if (!translations.includes(node.callee.name)) return;

      // check the current level
      if (level === 0) {
        context.report(
          node,
          `${node.callee.name}() does not work correctly at the toplevel (use N${node.callee.name}() or move it into a function)`
        );
      }
    }

    return {
      // entering a function definition
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction,
      ArrowFunctionExpression: enterFunction,
      // leaving a function definition
      "FunctionDeclaration:exit": leaveFunction,
      "FunctionExpression:exit": leaveFunction,
      "ArrowFunctionExpression:exit": leaveFunction,
      // calling a function
      CallExpression: callFunction,
    };
  },
};
