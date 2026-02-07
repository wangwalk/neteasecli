# Contributing

Thanks for your interest in contributing to neteasecli!

## Getting Started

```bash
git clone https://github.com/wangwalk/neteasecli.git
cd neteasecli
npm install
npm run build
npm link  # makes `neteasecli` available globally
```

## Development

```bash
npm run dev -- search track "test"  # Run without building (via tsx)
npm run build                        # Compile TypeScript
npm run lint                         # ESLint
npm run lint:fix                     # ESLint with auto-fix
npm run format                       # Prettier format
npm run format:check                 # Prettier check
```

## Code Style

- TypeScript strict mode
- Formatted with Prettier (single quotes, trailing commas)
- Linted with ESLint + typescript-eslint
- Run `npm run lint && npm run format:check` before committing

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure `npm run build && npm run lint && npm run format:check` all pass
4. Submit a pull request

## Reporting Issues

- Use [GitHub Issues](https://github.com/wangwalk/neteasecli/issues)
- Include your Node.js version, OS, and steps to reproduce
