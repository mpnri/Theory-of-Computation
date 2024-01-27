import { GrammarRule } from "./types";
import { Map } from "immutable";

function convertToChomskyNormalForm(rules: GrammarRule[]) {}

function Eliminate_εRules(rules: GrammarRule[]): GrammarRule[] {
  const isNullableMap = Map<string, boolean>();
  const markMap = Map<string, boolean>();
  const rulesMap = Map<string, GrammarRule>();
  rules.forEach((rule) => rulesMap.set(rule.variable[0], rule));

  const signNullableRules = (rule: GrammarRule) => {
    markMap.set(rule.variable, true);
    if (rule.productions.some((production) => production === "''")) {
      isNullableMap.set(rule.variable, true);
    }
    rule.productions.forEach((production) => {
      if (production === "''") return;
      for (const char of production) {
        //* if char is a variable
        if (char === char.toUpperCase()) {
          if (!markMap.get(char)) {
            if (!rulesMap.has(char)) throw Error(`grammar rule for ${char} not found`);
            const nextRule = rulesMap.get(char);
            signNullableRules(nextRule);
          }
        }
      }
    });
    if (
      //* Check if `variable -> X1 ... Xn` and for every i: `Xi` is nullable
      rule.productions.some(
        (production) =>
          production !== "''" &&
          production === production.toUpperCase() &&
          production.split("").every((variable) => isNullableMap.get(variable)),
      )
    ) {
      isNullableMap.set(rule.variable, true);
    }
  };

  signNullableRules(rules[0]);
  //* second run for ensuring recursive nullable grammars
  signNullableRules(rules[0]);

  const resultRules: GrammarRule[] = [];

  rules.forEach((rule) => {
    const productions = [...rule.productions].filter((production) => production !== "''");
    const originalLength = productions.length;
    for (let index = 0; index < originalLength; index++) {
      const current = productions[index];
      current.split("").forEach((char, i) => {
        if (char === char.toUpperCase() && isNullableMap.get(char)) {
          productions.push(current.substring(0, i).concat(current.substring(i)));
        }
      });
    }
    if (productions.length) {
      resultRules.push({ variable: rule.variable, productions });
    }
  });
  return resultRules;
}
