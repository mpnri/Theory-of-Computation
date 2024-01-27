import { GrammarRule } from "./types";

const sample_rules = [
  { variable: "S", productions: ["AbB", "C"] },
  { variable: "B", productions: ["AA", "AC"] },
  { variable: "C", productions: ["b", "c"] },
  { variable: "A", productions: ["a", "''"] },
];

export function convertToChomskyNormalForm(rules: GrammarRule[]): GrammarRule[] {
  // console.log(Eliminate_εRules(sample_rules));
  return Eliminate_εRules(rules);
}

function Eliminate_εRules(rules: GrammarRule[]): GrammarRule[] {
  const isNullableMap = new Map<string, boolean>();
  const markMap = new Map<string, boolean>();
  const rulesMap = new Map<string, GrammarRule>();
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
      const currentArr = current.split("");

      const variablesCount = currentArr.filter((char) => char === char.toUpperCase()).length;
      for (let mask = 1; mask < 1 << variablesCount; mask++) {
        let variableIndex = 0;
        let tempStr = "";
        currentArr.forEach((char) => {
          if (char === char.toUpperCase()) {
            if (mask & (1 << variableIndex) && isNullableMap.get(char)) {
              tempStr += "-";
            } else {
              tempStr += char;
            }
            variableIndex++;
          } else {
            tempStr += char;
          }
        });
        productions.push(tempStr.replaceAll("-", ""));
      }
    }
    if (productions.length) {
      resultRules.push({
        variable: rule.variable,
        productions: productions
          .filter(Boolean)
          //* make production list unique
          .filter((current, index, self) => index === self.indexOf(current)),
      });
    }
  });
  return resultRules;
}
