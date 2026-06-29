# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Repository status

This repository (`smilk0400/aidroid1`) is currently a **bare starter repo**. As of
the latest commit it contains essentially no application code:

```
.
├── CLAUDE.md   # this file
└── s1          # placeholder file, contains the text "start"
```

There is **no** source tree, build system, dependency manifest, test suite,
CI configuration, or linter set up yet. Treat the project as greenfield: the
conventions below describe how to introduce structure as the codebase grows,
not an existing system to conform to.

> When real code lands, update this file to document the actual structure,
> commands, and conventions. Keep it in sync with the repository's real state —
> do not let it drift into describing things that no longer exist (or never did).

## Working in this repo

### Branching

- All development happens on dedicated feature branches, **never** directly on `main`.
- The active working branch for the current effort is `claude/claude-md-docs-frlyjm`.
- Create branches off `main` and keep them focused on a single change.

### Commits

- Write clear, descriptive commit messages in the imperative mood
  (e.g. "Add build script", not "Added build script").
- Keep commits scoped and self-contained.

### Pushing

- Push with `git push -u origin <branch-name>`.
- Do **not** push to `main` or any branch other than the designated working
  branch without explicit permission.
- Do **not** open a pull request unless explicitly asked.

## Conventions to establish as the project grows

Because nothing is wired up yet, an assistant adding the first real code should:

1. **Pick and document the stack.** When introducing a language/framework, add
   the appropriate manifest (e.g. `package.json`, `pyproject.toml`, `go.mod`,
   `Cargo.toml`) and record the chosen toolchain here.
2. **Add reproducible commands.** Once a build/test/lint setup exists, document
   the exact commands under a new "Development workflow" section, for example:
   - Install dependencies
   - Build
   - Run tests
   - Lint / format
3. **Mirror the existing style.** After the first module exists, match its
   naming, formatting, and structure rather than introducing competing patterns.
4. **Keep this file current.** Update the structure diagram and commands
   whenever they change.

## Notes

- The `s1` file is a placeholder and carries no functional meaning. It can be
  removed once real project files exist, unless a later change gives it a purpose.
- The repository name `aidroid1` suggests an AI/Android-oriented project, but the
  intended scope is not yet defined in code. Confirm direction with the user
  before assuming a particular stack.
