import { GrammarRule } from "./types";
import cloneDeep from "lodash.clonedeep";

// const sample_rules = [
//   { variable: "S", productions: ["AbB", "C"] },
//   { variable: "B", productions: ["AA", "AC"] },
//   { variable: "C", productions: ["b", "c"] },
//   { variable: "A", productions: ["a", "''"] },
// ];
// const sample_rules = [
//   { variable: "S", productions: ["AbBc", "C"] },
//   { variable: "B", productions: ["AAc", "ACa"] },
//   { variable: "C", productions: ["b", "c"] },
//   { variable: "A", productions: ["a", "T", "''"] },
//   { variable: "T", productions: ["a", "K"] },
//   { variable: "K", productions: ["k", "''"] },
// ];

export function convertToChomskyNormalForm(rules: GrammarRule[]): GrammarRule[] {
  // const res1 = eliminate_εRules(sample_rules);
  const res1 = eliminate_εRules(rules);
  console.log("After eliminating ε Rules:");
  console.log(res1);
  console.log("\n");
  const res2 = eliminateUnitRules(res1);
  console.log("After eliminating Unit Rules:");
  console.log(res2);

  const final = makeFormalRules(res2);
  return final;
}

function eliminate_εRules(rules: GrammarRule[]): GrammarRule[] {
  const isNullableMap = new Map<string, boolean>();
  const markMap = new Map<string, boolean>();
  const rulesMap = new Map<string, GrammarRule>();
  rules.forEach((rule) => rulesMap.set(rule.variable, rule));

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
  markMap.clear();
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

function eliminateUnitRules(rules: GrammarRule[]): GrammarRule[] {
  //* If (A,B) is in this map, then B is a A_derivative variable.
  const derivableMap = new Map<string, Map<string, true>>();
  const markMap = new Map<string, boolean>();
  const resultRules: GrammarRule[] = cloneDeep(rules);
  const rulesMap = new Map<string, GrammarRule>();
  resultRules.forEach((rule) => rulesMap.set(rule.variable, rule));

  const findDrivableVariables = (rule: GrammarRule) => {
    markMap.set(rule.variable, true);
    if (!derivableMap.has(rule.variable)) {
      derivableMap.set(rule.variable, new Map());
    }
    //* Add direct derivable variables
    const derivableVariables: string[] = [];
    rule.productions.forEach(
      (production) =>
        production !== "'" &&
        production.length === 1 &&
        production === production.toUpperCase() &&
        derivableVariables.push(production),
    );
    derivableVariables.forEach((variable) => {
      derivableMap.get(rule.variable).set(variable, true);
    });
    derivableVariables.forEach((variable) => {
      //?????
      if (!markMap.get(variable)) {
        if (!rulesMap.has(variable)) throw Error(`grammar rule for ${variable} not found`);
        findDrivableVariables(rulesMap.get(variable));
      }
    });

    //* If B is A_derivative and C is B_derivative, then C is A_derivative.
    derivableVariables.forEach(
      (variable) =>
        derivableMap.has(variable) &&
        derivableMap
          .get(variable)
          .forEach((_, key) => derivableMap.get(rule.variable).set(key, true)),
    );
    // console.log(
    //   rule.variable,
    //   derivableVariables
    //     .map((v) => rulesMap.get(v).productions)
    //     .reduce((prev, current) => [...prev, ...current], []),
    // );
    rule.productions.push(
      ...derivableVariables
        .map((v) => rulesMap.get(v).productions)
        .reduce((prev, current) => [...prev, ...current], []),
    );
    rule.productions = rule.productions.filter((p) => !(p.length === 1 && p === p.toUpperCase()));
    rule.productions = rule.productions.filter((p, index, self) => self.indexOf(p) === index);
  };

  rules.forEach((rule, index) => {
    if (!markMap.get(rule.variable)) {
      findDrivableVariables(resultRules[index]);
    }
  });
  return resultRules;
}

function makeFormalRules(rules: GrammarRule[]): GrammarRule[] {
  const convertMap = new Map<string, string>();
  let counter = 0;
  const resultRules = cloneDeep(rules).map((rule) => {
    const productions = [...rule.productions].map((p) => {
      if (p.length < 3) {
        return p;
      }
      let tempStr = p[p.length - 1];
      for (let i = p.length - 2; i >= 0; i--) {
        const _p = p[i] + tempStr[0];
        if (!convertMap.has(_p) && i > 0) {
          counter++;
          convertMap.set(_p, "Y_" + counter);
        }
        if (i > 0) {
          tempStr = convertMap.get(_p);
        } else {
          tempStr = p[i] + tempStr;
        }
      }
      return tempStr;
    });
    return { variable: rule.variable, productions: productions };
  });
  Array.from(convertMap.entries()).forEach(([newProduction, newVariable]) => {
    resultRules.push({ variable: newVariable, productions: [newProduction] });
  });
  const newVariables = new Map<string, string>();
  resultRules.forEach((rule) => {
    rule.productions.forEach((production) => {
      production
        .split("")
        .forEach((char) => char !== char.toUpperCase() && newVariables.set(char, "X_" + char));
    });
  });
  resultRules.forEach((rule) => {
    rule.productions = rule.productions.map((p) => {
      if (p.length === 1) return p;
      let str = "";
      p.split("").forEach((char) => {
        if ("a" <= char && char <= "z") {
          str += newVariables.get(char);
        } else {
          str += char;
        }
      });
      return str;
    });
  });
  Array.from(newVariables.entries()).forEach(([newProduction, newVariable]) => {
    resultRules.push({ variable: newVariable, productions: [newProduction] });
  });
  return resultRules;
}
