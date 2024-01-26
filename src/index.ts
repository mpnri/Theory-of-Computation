import promptSync from "prompt-sync";
import { GrammarRule } from "./types";

const prompt: (message?: string) => string = promptSync();

console.log("Enter number of grammar rules:");
let input = prompt();
const [numberOfProductions] = input.split(" ").map(Number);

console.log(`\nFormal grammar rules are in the following form: S -> ${String.fromCharCode(945)}`);
console.log(`Variables should be upper case(use '' for lambda)\nFor example:`);
console.log(`-----\nS -> aaAbb\nA -> cA | ''\n-----\n`);

const rules: GrammarRule[] = [];

for (let i = 0; i < numberOfProductions; i++) {
  input = prompt();
  const [variable, productions] = input.split("->").map((s) => s.trim());
  rules.push({ variable, productions: productions.split("|").map((p) => p.trim()) });
}
