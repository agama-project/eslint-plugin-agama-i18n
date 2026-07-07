/*
 * Copyright (c) [2023] SUSE LLC
 *
 */

const stringLiteralsRule = require("./string-literals");
const topLevelRule = require("./top-level-translation");
const multipleSpaceRule = require("./multiple-space");
const markedString = require("./marked-string");
const translatedProp = require("./translated-prop");

module.exports = {
  rules: {
    // name of the rule
    "string-literals": stringLiteralsRule,
    "top-level-translation": topLevelRule,
    "multiple-space": multipleSpaceRule,
    "marked-string": markedString,
    "translated-prop": translatedProp,
  },
};
