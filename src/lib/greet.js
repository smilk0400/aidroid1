/**
 * Build a friendly greeting.
 *
 * @param {string} name - The name to greet.
 * @returns {string} A greeting message.
 */
export function greet(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("name must be a non-empty string");
  }
  return `Hello, ${name}!`;
}
