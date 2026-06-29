import { greet } from "./lib/greet.js";

/**
 * Application entry point.
 *
 * @returns {void}
 */
function main() {
  const name = process.argv[2] ?? "world";
  console.log(greet(name));
}

main();
