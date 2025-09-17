# Frontend Development Setup with Husky

This guide provides complete setup instructions for automated code quality checks using Husky, Prettier, ESLint, and TypeScript in a monorepo structure.

## Project Structure

```
MAIN_PROJECT/
├── backend/          # Django REST API
├── frontend/         # Next.js application
│   ├── .husky/       # Git hooks
│   ├── scripts/      # Setup scripts
│   ├── package.json  # Dependencies and scripts
│   └── ...
└── README.md
```

## Prerequisites

- Node.js (version 18.0 or higher)
- npm or yarn
- Git

## Quick Start

### For New Team Members

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd MAIN_PROJECT
   ```

2. Install frontend dependencies (this automatically sets up git hooks):

   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

That's it! Git hooks are now configured and will work from anywhere in the repository.

## What Gets Automated

When you commit changes, the following happens automatically:

- **🎨 Code Formatting**: Prettier formats your staged files
- **🔍 Linting**: ESLint checks and fixes code issues
- **📝 Type Checking**: TypeScript validates your code
- **⚡ Smart Processing**: Only runs on frontend files that have changed

## Complete Setup Instructions

### 1. Install Required Packages

```bash
cd frontend
npm install --save-dev husky prettier lint-staged eslint-config-prettier
```

### 2. Create Configuration Files

#### Package.json Scripts

```json
{
	"scripts": {
		"postinstall": "husky && node scripts/setup-hooks.js",
		"prepare": "husky",
		"lint": "next lint",
		"lint:fix": "next lint --fix",
		"format": "prettier --write . --ignore-path .prettierignore",
		"format:check": "prettier --check . --ignore-path .prettierignore",
		"type-check": "tsc --noEmit"
	},
	"lint-staged": {
		"*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
		"*.{json,md,css,scss}": ["prettier --write"]
	},
	"devDependencies": {
		"husky": "^9.0.0",
		"prettier": "^3.0.0",
		"lint-staged": "^15.0.0",
		"eslint-config-prettier": "^9.0.0"
	}
}
```

#### Prettier Configuration (.prettierrc)

```json
{
	"semi": true,
	"trailingComma": "es5",
	"singleQuote": true,
	"printWidth": 80,
	"tabWidth": 2,
	"useTabs": false
}
```

#### Prettier Ignore (.prettierignore)

```
node_modules/
.next/
out/
build/
dist/
*.min.js
package-lock.json
yarn.lock
.env.local
.env.production.local
.env.development.local
coverage/
.nyc_output/
public/
```

#### ESLint Configuration (.eslintrc.json)

```json
{
	"extends": ["next/core-web-vitals", "prettier"],
	"ignorePatterns": ["node_modules/", ".next/", "out/", "build/", "dist/"],
	"rules": {
		// Your custom rules here
	}
}
```

#### ESLint Ignore (.eslintignore)

```
node_modules/
.next/
out/
build/
dist/
*.min.js
.env.local
.env.production.local
.env.development.local
coverage/
.nyc_output/
```

#### TypeScript Configuration (tsconfig.json)

```json
{
	"compilerOptions": {
		"lib": ["dom", "dom.iterable", "es6"],
		"allowJs": true,
		"skipLibCheck": true,
		"strict": true,
		"noEmit": true,
		"esModuleInterop": true,
		"module": "esnext",
		"moduleResolution": "bundler",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"jsx": "preserve",
		"incremental": true,
		"plugins": [
			{
				"name": "next"
			}
		],
		"paths": {
			"@/*": ["./*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
	"exclude": ["node_modules", ".next", "out", "build", "dist", "coverage"]
}
```

### 3. Create Setup Script

Create `frontend/scripts/setup-hooks.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

try {
	// Get the git root directory
	const gitRoot = execSync("git rev-parse --show-toplevel", {
		encoding: "utf8",
		cwd: __dirname,
	}).trim();

	// Calculate relative path from git root to frontend/.husky
	const frontendDir = path.resolve(__dirname, "..");
	const huskyPath = path.relative(gitRoot, path.join(frontendDir, ".husky"));

	// Configure git hooks path
	execSync(`git config core.hooksPath "${huskyPath}"`, {
		cwd: gitRoot,
		stdio: "inherit",
	});

	console.log("✅ Git hooks configured successfully!");
	console.log(`🔧 Hooks path set to: ${huskyPath}`);
} catch (error) {
	console.log("⚠️  Could not configure git hooks automatically.");
	console.log("💡 Please run: git config core.hooksPath frontend/.husky");
	process.exit(0);
}
```

### 4. Initialize Husky and Create Hooks

```bash
cd frontend
npx husky init
```

Create `frontend/.husky/pre-commit`:

```bash
#!/usr/bin/env sh

# Get git root
GIT_ROOT=$(git rev-parse --show-toplevel)

# Check if any frontend files are staged
FRONTEND_FILES_CHANGED=$(git diff --cached --name-only | grep "^frontend/" | wc -l)

if [ "$FRONTEND_FILES_CHANGED" -eq 0 ]; then
  echo "ℹ️  No frontend files changed, skipping frontend hooks."
  exit 0
fi

echo "🔍 Running frontend pre-commit checks..."

# Navigate to frontend directory
cd "$GIT_ROOT/frontend"

# Run lint-staged (formatting and linting)
npx lint-staged

# Check if any TypeScript files were changed before running type-check
TS_FILES_CHANGED=$(git diff --cached --name-only --relative=frontend | grep -E '\.(ts|tsx)$' | grep -v -E '^\.next/' | wc -l)

if [ "$TS_FILES_CHANGED" -gt 0 ]; then
  echo "🔍 Running TypeScript check on source files..."
  npm run type-check
else
  echo "ℹ️  No TypeScript files changed, skipping type check."
fi

echo "✅ Frontend pre-commit checks passed!"
```

Make the hook executable:

```bash
chmod +x frontend/.husky/pre-commit
```

### 5. VS Code Integration (Optional)

Create `frontend/.vscode/settings.json`:

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	},
	"[javascript]": {
		"editor.defaultFormatter": "esbenp.prettier-vscode"
	},
	"[typescript]": {
		"editor.defaultFormatter": "esbenp.prettier-vscode"
	},
	"[json]": {
		"editor.defaultFormatter": "esbenp.prettier-vscode"
	}
}
```

## Committing Your Setup

Make sure to commit all configuration files:

```bash
cd MAIN_PROJECT

# Add all configuration files
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/.husky/
git add frontend/scripts/
git add frontend/.eslintrc.json
git add frontend/.eslintignore
git add frontend/.prettierrc
git add frontend/.prettierignore
git add frontend/tsconfig.json
git add frontend/.vscode/

# Commit the setup
git commit -m "feat: setup husky with prettier, eslint, and typescript checks

- Add automatic code formatting and linting on commit
- Configure husky to work from any directory in monorepo
- Add pre-commit hooks for frontend files only
- Include setup script for automatic git hooks configuration"

# Push to repository
git push origin main
```

## How It Works

1. **Installation**: When someone runs `npm install` in the frontend directory:
   - The `postinstall` script runs automatically
   - Husky is initialized
   - The `setup-hooks.js` script configures Git to use `frontend/.husky` for hooks

2. **Committing**: When someone commits from anywhere in the monorepo:
   - Git looks for hooks in `frontend/.husky`
   - The pre-commit hook checks if frontend files are staged
   - If yes, it runs formatting, linting, and type checking
   - If no frontend changes, it skips the checks

3. **Smart Processing**:
   - Only processes files that are actually staged for commit
   - Respects ignore files (`.eslintignore`, `.prettierignore`)
   - Automatically formats and fixes issues when possible

## Troubleshooting

### Manual Hook Setup

If automatic setup fails, run manually:

```bash
git config core.hooksPath frontend/.husky
```

### Reset Hooks

To reset or reconfigure:

```bash
cd frontend
rm -rf .husky
npx husky init
# Recreate your hook files
```

### Skip Hooks (Emergency)

To skip hooks for a single commit:

```bash
git commit -m "emergency fix" --no-verify
```

### Check Current Configuration

```bash
git config core.hooksPath  # Should show: frontend/.husky
```

## Benefits

- ✅ **Zero Manual Setup**: New team members just run `npm install`
- ✅ **Consistent Code Style**: Automatic formatting across the team
- ✅ **Early Error Detection**: TypeScript and linting errors caught before commit
- ✅ **Monorepo Compatible**: Works from any directory in the repository
- ✅ **Fast**: Only processes changed files
- ✅ **Configurable**: Easy to modify rules and add new checks

## Available Scripts

After setup, these scripts are available in the frontend directory:

```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Fix linting errors automatically
npm run format        # Format all files with Prettier
npm run format:check  # Check if files are formatted correctly
npm run type-check    # Run TypeScript type checking
```

## Adding More Hooks

To add additional hooks (like commit message validation):

1. Create the hook file in `frontend/.husky/` (e.g., `commit-msg`)
2. Make it executable: `chmod +x frontend/.husky/commit-msg`
3. Add your validation logic

Example commit message hook:

```bash
#!/usr/bin/env sh

commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "Format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore"
    exit 1
fi
```

This setup ensures your team maintains consistent code quality without manual intervention!
