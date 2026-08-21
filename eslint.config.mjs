// Flat ESLint config (ESLint 9 + Next 16).
//
// Next 16 removed the `next lint` subcommand, so linting now runs ESLint
// directly (see the `lint` script in package.json). This replaces the legacy
// `.eslintrc.json` and keeps the same `next/core-web-vitals` rule set.
import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["node_modules/**", ".next/**", "storage/**", "prisma/generated/**"] },
  ...coreWebVitals,
];

export default config;
