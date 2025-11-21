/*
 * Copyright (c) [2023] SUSE LLC
 *
 */

const stringLiteralsRule = require("./string-literals");
const topLevelRule = require("./top-level-translation");
const multipleSpaceRule = require("./multiple-space");

module.exports = {
  rules: {
    // name of the rule
    "string-literals": stringLiteralsRule,
    "top-level-translation": topLevelRule,
    "multiple-space": multipleSpaceRule,
  },
};
