# aidroid1

A small Node.js project (ES modules, Node ≥ 20).

## Getting started

```bash
npm install
npm start            # prints "Hello, world!"
npm start -- Ada     # prints "Hello, Ada!"
```

## Scripts

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `npm start`      | Run the app                        |
| `npm test`       | Run the test suite (`node --test`) |
| `npm run lint`   | Lint with ESLint                   |
| `npm run format` | Format with Prettier               |

## Project layout

```
src/
  index.js        # entry point
  lib/greet.js    # library module
test/
  greet.test.js   # tests
```

For contributor and AI-assistant guidance, see [CLAUDE.md](./CLAUDE.md).
