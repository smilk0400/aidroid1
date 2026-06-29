# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Overview

`aidroid1` is a **Node.js** project (ES modules, Node ≥ 20). It is an early-stage
scaffold: a small library module, an executable entry point, a test suite using
the built-in Node test runner, and linting/formatting via ESLint + Prettier.

## Project structure

```
.
├── CLAUDE.md            # this file — guidance for AI assistants
├── README.md            # human-facing project readme
├── package.json         # metadata, scripts, dependencies (ESM: "type": "module")
├── package-lock.json    # pinned dependency tree (committed)
├── eslint.config.js     # ESLint flat config
├── .prettierrc.json     # Prettier formatting rules
├── .gitignore
├── src/
│   ├── index.js         # entry point (npm start) — CLI: prints a greeting
│   └── lib/
│       └── greet.js     # example library module (exports `greet`)
└── test/
    └── greet.test.js    # tests for src/lib/greet.js (node:test)
```

## Development workflow

Install dependencies first (requires network access):

```bash
npm install
```

Common commands (all defined in `package.json` `scripts`):

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm start`            | Run the app (`node src/index.js`); optional name arg |
| `npm test`             | Run the test suite (`node --test`)                   |
| `npm run test:watch`   | Run tests in watch mode                              |
| `npm run lint`         | Lint with ESLint                                     |
| `npm run lint:fix`     | Lint and auto-fix                                    |
| `npm run format`       | Format all files with Prettier                       |
| `npm run format:check` | Check formatting without writing                     |

Example: `npm start -- Ada` prints `Hello, Ada!`.

Before committing, run `npm test`, `npm run lint`, and `npm run format:check`
(or `npm run format`) so changes stay green.

## Conventions

- **ES modules only.** `package.json` sets `"type": "module"`. Use `import` /
  `export`, and include the `.js` extension in relative imports
  (e.g. `import { greet } from "./lib/greet.js";`).
- **Node ≥ 20.** Rely on the built-in test runner (`node:test`) and
  `node:assert/strict` — no third-party test framework.
- **Tests** live in `test/`, named `*.test.js`, and import from `src/`.
- **Library code** goes in `src/lib/`; the runnable entry point is `src/index.js`.
- **Formatting** is Prettier-owned (see `.prettierrc.json`): semicolons, double
  quotes, 80-column width. Don't hand-format against it — run `npm run format`.
- **Linting** uses ESLint's flat config (`eslint.config.js`) with the
  recommended ruleset; unused vars are warnings.
- **JSDoc** comments are used on exported functions; keep them accurate when
  changing signatures.
- Validate inputs and throw `TypeError` for bad argument types, as in
  `src/lib/greet.js`.

When adding a new module, mirror the existing style: a focused file under
`src/lib/`, a matching `test/<name>.test.js`, and JSDoc on exports.

## Git workflow

- Develop on dedicated feature branches; **never** commit directly to `main`.
- The active working branch for the current effort is
  `claude/claude-md-docs-frlyjm`.
- Push with `git push -u origin <branch-name>`.
- Do **not** push to `main` or another branch, and do **not** open a pull
  request, without explicit permission.
- Commit `package-lock.json`; do **not** commit `node_modules/` (gitignored).

## Keeping this file current

Update this document whenever the structure, commands, or conventions change —
new top-level directories, new scripts in `package.json`, a switch in tooling,
or added dependencies. Keep the structure diagram and command table in sync with
reality.
