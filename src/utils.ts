import { GrammarRule } from "./types";

export function printGrammarRules(rules: GrammarRule[]) {
  rules.forEach((rule) => {
    console.log(rule.variable, "->", rule.productions.join(" | "));
  });
}
