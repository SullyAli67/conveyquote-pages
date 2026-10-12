// scripts/verify-no-escape-text.js
//
// Fails if a JavaScript escape such as £ sits in JSX text, where React
// shows it literally ("£150.00" instead of "£150.00"). Inside quotes,
// backticks or regular expressions an escape is fine and is ignored here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  path.join(__dirname, "..", "src", "App.tsx"),
  ...fs
    .readdirSync(path.join(__dirname, "..", "src", "components"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(__dirname, "..", "src", "components", f)),
];

const stripLiterals = (line) =>
  line
    .replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|`(\\.|[^`\\])*`/g, "")
    .replace(/\/(\\.|[^/\\\n])+\/[gimsuy]*/g, "");

const problems = [];
for (const file of files) {
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("\\u") && /\\u[0-9a-fA-F]{4}/.test(stripLiterals(line))) {
        problems.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
}

if (problems.length) {
  console.error("Escape codes shown as text (use the real character instead):");
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}
console.log("No escape codes in on-screen text.");
