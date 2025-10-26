# Host Platform Selector Integration Guide

> **Complete Guide for Integrating Module Selectors into Host Platform**

**Version**: 1.0.0  
**Last Updated**: December 19, 2024  
**Target**: Host platform developers integrating modular applications

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Implementation Strategies](#implementation-strategies)
4. [Chosen Strategy: Sync Script Replacement](#chosen-strategy-sync-script-replacement)
5. [Host Platform Changes](#host-platform-changes)
6. [Sync Script Modifications](#sync-script-modifications)
7. [Folder Structure Implications](#folder-structure-implications)
8. [Implementation Steps](#implementation-steps)
9. [Testing & Validation](#testing--validation)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Problem Statement

### The Challenge

When a module is integrated into a host platform, the Redux store structure changes:

**Module (Standalone):**

```typescript
{
  auth: { user: {...}, loading: false },
  miscellaneous: { sideBarOpened: true }
}
```

**Host Platform (Integrated):**

```typescript
{
  auth: { user: {...}, loading: false },                    // Host slice
  miscellaneous: { sideBarOpened: true },                   // Host slice
  taskManagementAuth: { user: {...}, loading: false },     // Module slice
  taskManagementMisc: { sideBarOpened: true },             // Module slice
}
```

### The Issue

Module code imports selectors that don't exist in the host platform:

```typescript
// This fails in host platform
import { selectUser } from "@/store/auth/selectors-context-aware";
```

**Error**: `Cannot find module '@/store/auth/selectors-context-aware'`

### Why This Happens

1. **Module selectors** are designed for standalone mode
2. **Host platform** doesn't have the module's selector files
3. **Slice names change** when integrated (e.g., `auth` → `taskManagementAuth`)
4. **Import paths** point to non-existent files in host platform

---

## Solution Overview

### Our Approach: Manual Selector Replacement

Instead of complex runtime detection, we use a **simple and reliable** approach:

1. **Module syncs** with original selectors
2. **Host platform creates** context-aware selectors for the module
3. **Sync script replaces** module's selector imports
4. **Module works seamlessly** in integrated mode

### Benefits

✅ **Simple implementation** - No complex runtime logic  
✅ **Reliable** - No runtime errors or edge cases  
✅ **Performance** - Direct slice access, no overhead  
✅ **Maintainable** - Clear, explicit selectors  
✅ **Predictable** - No hidden runtime behavior

---

## Implementation Strategies

### Strategy 1: Dynamic Selector Generation ❌

**Approach**: Generate selectors at runtime based on module context

**Pros**:

- No manual work required
- Handles multiple modules automatically

**Cons**:

- Complex runtime logic
- Performance overhead
- Runtime errors possible
- Difficult to debug
- Unpredictable behavior

**Verdict**: Too complex and unreliable

### Strategy 2: Build-Time Replacement ❌

**Approach**: Replace imports during build process

**Pros**:

- No runtime overhead
- Handles multiple modules

**Cons**:

- Complex build configuration
- Hard to debug
- Build-time errors
- Limited flexibility

**Verdict**: Too complex for build process

### Strategy 3: Manual Replacement ✅

**Approach**: Manually create selectors and replace imports

**Pros**:

- Simple and reliable
- Easy to debug
- Predictable behavior
- Full control over selectors

**Cons**:

- Manual work required
- Need to maintain selectors

**Verdict**: Best balance of simplicity and reliability

### Strategy 4: Sync Script Replacement ✅ (Chosen)

**Approach**: Automate selector creation and import replacement during sync

**Pros**:

- Automated process
- Consistent results
- Easy to maintain
- Handles multiple modules

**Cons**:

- Requires sync script modifications
- Need to maintain selector templates

**Verdict**: **Chosen strategy** - Best of both worlds

---

## Chosen Strategy: Sync Script Replacement

### How It Works

1. **Module syncs** to host platform
2. **Sync script analyzes** module's selector imports
3. **Sync script creates** context-aware selectors for the module
4. **Sync script replaces** imports in module files
5. **Module works** seamlessly in integrated mode

### Implementation Flow

```
Module Sync → Analyze Selectors → Create Context-Aware Selectors → Replace Imports → Module Works
```

---

## Host Platform Changes

### 1. Folder Structure Changes

**New Structure:**

```
host-platform/
├── src/
│   ├── lib/
│   │   └── modules/
│   │       ├── task-management/
│   │       │   ├── selectors.ts              # Context-aware selectors
│   │       │   ├── module-descriptor.ts      # Module descriptor
│   │       │   └── selector-mapping.json     # Import mapping
│   │       └── accounting/
│   │           ├── selectors.ts              # Context-aware selectors
│   │           ├── module-descriptor.ts      # Module descriptor
│   │           └── selector-mapping.json     # Import mapping
│   ├── app/
│   │   ├── task-management/                  # Synced module
│   │   └── accounting/                       # Synced module
│   └── store/
│       └── index.ts                          # Combined store
```

### 2. Selector Template System

**Create selector templates** for different slice types:

```typescript
// src/lib/modules/templates/auth-selectors.ts
export const createAuthSelectors = (sliceKey: string) => ({
	selectUser: (state: RootState) => state[sliceKey]?.user?.value,
	selectUserLoading: (state: RootState) => state[sliceKey]?.user?.loading,
	selectAccessToken: (state: RootState) => state[sliceKey]?.accessToken,
	selectRefreshToken: (state: RootState) => state[sliceKey]?.refreshToken,
	selectSelectedInstitution: (state: RootState) => state[sliceKey]?.selectedInstitution?.value,
	selectSelectedInstitutionLoading: (state: RootState) =>
		state[sliceKey]?.selectedInstitution?.loading,
	selectSelectedBranch: (state: RootState) => state[sliceKey]?.selectedBranch?.value,
	selectSelectedBranchLoading: (state: RootState) => state[sliceKey]?.selectedBranch?.loading,
	selectSelectedTill: (state: RootState) => state[sliceKey]?.selectedTill?.value,
	selectSelectedTillLoading: (state: RootState) => state[sliceKey]?.selectedTill?.loading,
	selectAttachedInstitutions: (state: RootState) =>
		state[sliceKey]?.InstitutionsAttached?.value || [],
	selectAttachedInstitutionsLoading: (state: RootState) =>
		state[sliceKey]?.InstitutionsAttached?.loading,
	selectTemporaryPermissions: (state: RootState) => state[sliceKey]?.temporaryPermissions,
	selectInactivityTimeout: (state: RootState) => state[sliceKey]?.inactivityTimeout,
	selectLogoutWarningVisible: (state: RootState) => state[sliceKey]?.logoutWarningVisible,
	selectRefreshInProgress: (state: RootState) => state[sliceKey]?.refreshInProgress,
});

// src/lib/modules/templates/misc-selectors.ts
export const createMiscSelectors = (sliceKey: string) => ({
	selectSideBarOpened: (state: RootState) => state[sliceKey]?.sideBarOpened,
	selectSelectedTask: (state: RootState) => state[sliceKey]?.selectedTask,
});
```

### 3. Import Mapping System

**Create mapping files** to track import replacements:

```json
// src/lib/modules/task-management/selector-mapping.json
{
	"moduleName": "task-management",
	"version": "1.0.0",
	"importMappings": [
		{
			"from": "@/store/auth/selectors-context-aware",
			"to": "@/lib/modules/task-management/selectors",
			"selectors": [
				"selectUser",
				"selectUserLoading",
				"selectAccessToken",
				"selectRefreshToken",
				"selectSelectedInstitution",
				"selectSelectedInstitutionLoading",
				"selectSelectedBranch",
				"selectSelectedBranchLoading",
				"selectSelectedTill",
				"selectSelectedTillLoading",
				"selectAttachedInstitutions",
				"selectAttachedInstitutionsLoading",
				"selectTemporaryPermissions",
				"selectInactivityTimeout",
				"selectLogoutWarningVisible",
				"selectRefreshInProgress"
			]
		},
		{
			"from": "@/store/miscellaneous/selectors-context-aware",
			"to": "@/lib/modules/task-management/selectors",
			"selectors": ["selectSideBarOpened", "selectSelectedTask"]
		}
	]
}
```

---

## Sync Script Modifications

### 1. Enhanced Sync Script

**Update `scripts/sync-module.mjs`** to include selector integration:

```javascript
// Add to sync script
async function integrateModuleSelectors(moduleName, moduleDescriptor, targetDir) {
	console.log("🔧 Integrating module selectors...");

	// 1. Create context-aware selectors
	await createContextAwareSelectors(moduleName, moduleDescriptor);

	// 2. Replace imports in module files
	await replaceSelectorImports(moduleName, targetDir);

	// 3. Create selector mapping
	await createSelectorMapping(moduleName, moduleDescriptor);

	console.log("✅ Module selectors integrated successfully");
}

async function createContextAwareSelectors(moduleName, moduleDescriptor) {
	const selectorsDir = path.join(rootDir, "src/lib/modules", moduleName);
	await fs.mkdir(selectorsDir, { recursive: true });

	const selectorsContent = generateSelectorsContent(moduleName, moduleDescriptor);
	await fs.writeFile(path.join(selectorsDir, "selectors.ts"), selectorsContent);
}

async function replaceSelectorImports(moduleName, targetDir) {
	const mapping = await loadSelectorMapping(moduleName);

	// Find all TypeScript files in module
	const files = await findTypeScriptFiles(targetDir);

	for (const file of files) {
		await replaceImportsInFile(file, mapping);
	}
}
```

### 2. Selector Generation Logic

```javascript
function generateSelectorsContent(moduleName, moduleDescriptor) {
	const slices = moduleDescriptor.slices;
	let content = `// AUTO-GENERATED - DO NOT EDIT
// Generated for module: ${moduleName}
// Generated at: ${new Date().toISOString()}

import { RootState } from '@/store';

`;

	// Generate selectors for each slice
	Object.keys(slices).forEach((sliceKey) => {
		const sliceName = extractSliceName(sliceKey);
		const selectorType = getSelectorType(sliceName);

		if (selectorType === "auth") {
			content += generateAuthSelectors(sliceKey);
		} else if (selectorType === "misc") {
			content += generateMiscSelectors(sliceKey);
		}
	});

	return content;
}

function generateAuthSelectors(sliceKey) {
	return `
// Auth selectors for slice: ${sliceKey}
export const selectUser = (state: RootState) => state.${sliceKey}?.user?.value;
export const selectUserLoading = (state: RootState) => state.${sliceKey}?.user?.loading;
export const selectAccessToken = (state: RootState) => state.${sliceKey}?.accessToken;
export const selectRefreshToken = (state: RootState) => state.${sliceKey}?.refreshToken;
export const selectSelectedInstitution = (state: RootState) => state.${sliceKey}?.selectedInstitution?.value;
export const selectSelectedInstitutionLoading = (state: RootState) => state.${sliceKey}?.selectedInstitution?.loading;
export const selectSelectedBranch = (state: RootState) => state.${sliceKey}?.selectedBranch?.value;
export const selectSelectedBranchLoading = (state: RootState) => state.${sliceKey}?.selectedBranch?.loading;
export const selectSelectedTill = (state: RootState) => state.${sliceKey}?.selectedTill?.value;
export const selectSelectedTillLoading = (state: RootState) => state.${sliceKey}?.selectedTill?.loading;
export const selectAttachedInstitutions = (state: RootState) => state.${sliceKey}?.InstitutionsAttached?.value || [];
export const selectAttachedInstitutionsLoading = (state: RootState) => state.${sliceKey}?.InstitutionsAttached?.loading;
export const selectTemporaryPermissions = (state: RootState) => state.${sliceKey}?.temporaryPermissions;
export const selectInactivityTimeout = (state: RootState) => state.${sliceKey}?.inactivityTimeout;
export const selectLogoutWarningVisible = (state: RootState) => state.${sliceKey}?.logoutWarningVisible;
export const selectRefreshInProgress = (state: RootState) => state.${sliceKey}?.refreshInProgress;

`;
}

function generateMiscSelectors(sliceKey) {
	return `
// Miscellaneous selectors for slice: ${sliceKey}
export const selectSideBarOpened = (state: RootState) => state.${sliceKey}?.sideBarOpened;
export const selectSelectedTask = (state: RootState) => state.${sliceKey}?.selectedTask;

`;
}
```

### 3. Import Replacement Logic

```javascript
async function replaceImportsInFile(filePath, mapping) {
	let content = await fs.readFile(filePath, "utf-8");
	let modified = false;

	for (const mappingItem of mapping.importMappings) {
		const { from, to, selectors } = mappingItem;

		// Replace import statements
		const importRegex = new RegExp(
			`import\\s*{([^}]+)}\\s*from\\s*["']${escapeRegExp(from)}["'];?`,
			"g",
		);

		content = content.replace(importRegex, (match, importList) => {
			// Check if any of the selectors are being imported
			const importedSelectors = importList.split(",").map((s) => s.trim());
			const relevantSelectors = importedSelectors.filter((selector) =>
				selectors.includes(selector),
			);

			if (relevantSelectors.length > 0) {
				modified = true;
				return `import { ${relevantSelectors.join(", ")} } from "${to}";`;
			}

			return match;
		});
	}

	if (modified) {
		await fs.writeFile(filePath, content);
		console.log(`✅ Updated imports in: ${filePath}`);
	}
}
```

---

## Folder Structure Implications

### 1. Host Platform Structure

**Required Changes:**

```
host-platform/
├── src/
│   ├── lib/
│   │   └── modules/                    # NEW: Module-specific files
│   │       ├── templates/              # NEW: Selector templates
│   │       │   ├── auth-selectors.ts
│   │       │   ├── misc-selectors.ts
│   │       │   └── index.ts
│   │       └── [module-name]/          # NEW: Per-module files
│   │           ├── selectors.ts        # Generated selectors
│   │           ├── module-descriptor.ts
│   │           └── selector-mapping.json
│   ├── app/
│   │   └── [module-name]/              # Synced module files
│   └── store/
│       └── index.ts                    # Combined store
```

### 2. TypeScript Configuration

**Update `tsconfig.json`:**

```json
{
	"compilerOptions": {
		"paths": {
			"@/*": ["./src/*"],
			"@/lib/modules/*": ["./src/lib/modules/*"]
		}
	}
}
```

### 3. Import Path Strategy

**Module imports become:**

```typescript
// FROM (in module):
import { selectUser } from "@/store/auth/selectors-context-aware";

// TO (in host platform):
import { selectUser } from "@/lib/modules/task-management/selectors";
```

---

## Implementation Steps

### Step 1: Prepare Host Platform Structure

```bash
# Create module directories
mkdir -p src/lib/modules/templates
mkdir -p src/lib/modules/task-management
mkdir -p src/lib/modules/accounting

# Create selector templates
touch src/lib/modules/templates/auth-selectors.ts
touch src/lib/modules/templates/misc-selectors.ts
touch src/lib/modules/templates/index.ts
```

### Step 2: Create Selector Templates

**Create `src/lib/modules/templates/auth-selectors.ts`:**

```typescript
export const createAuthSelectors = (sliceKey: string) => ({
	selectUser: (state: RootState) => state[sliceKey]?.user?.value,
	selectUserLoading: (state: RootState) => state[sliceKey]?.user?.loading,
	// ... other selectors
});
```

### Step 3: Update Sync Script

**Modify `scripts/sync-module.mjs`:**

```javascript
// Add selector integration to sync process
await integrateModuleSelectors(moduleName, moduleDescriptor, targetDir);
```

### Step 4: Test Module Sync

```bash
# Sync a module
node scripts/sync-module.mjs \
  --repo "https://github.com/yourorg/task-management-module" \
  --tag "v1.0.0" \
  --name "task-management"

# Verify selectors were created
ls src/lib/modules/task-management/
# Should show: selectors.ts, module-descriptor.ts, selector-mapping.json

# Verify imports were replaced
grep -r "selectors-context-aware" src/app/task-management/
# Should show no results
```

### Step 5: Validate Integration

```bash
# Build the application
npm run build

# Test the application
npm run dev

# Verify selectors work
# Check browser console for any selector errors
```

---

## Testing & Validation

### 1. Unit Tests

**Create tests for selector generation:**

```typescript
// tests/selector-integration.test.ts
describe("Selector Integration", () => {
	it("should generate correct auth selectors", () => {
		const selectors = generateAuthSelectors("taskManagementAuth");
		expect(selectors.selectUser).toBeDefined();
		expect(selectors.selectUserLoading).toBeDefined();
	});

	it("should replace imports correctly", () => {
		const content = 'import { selectUser } from "@/store/auth/selectors-context-aware";';
		const result = replaceImports(content, mapping);
		expect(result).toContain("@/lib/modules/task-management/selectors");
	});
});
```

### 2. Integration Tests

**Test module integration:**

```typescript
// tests/module-integration.test.ts
describe("Module Integration", () => {
	it("should work in integrated mode", () => {
		const state = {
			taskManagementAuth: { user: { value: { fullname: "Test User" } } },
		};

		const user = selectUser(state);
		expect(user.fullname).toBe("Test User");
	});
});
```

### 3. Manual Testing

**Test in browser:**

1. Sync module to host platform
2. Start development server
3. Navigate to module routes
4. Verify selectors work correctly
5. Check for any console errors

---

## Troubleshooting

### Issue: Selectors not generated

**Symptoms**: Missing `selectors.ts` file in module directory

**Solution**:

1. Check sync script logs for errors
2. Verify module descriptor has correct slice structure
3. Ensure selector templates exist
4. Check file permissions

### Issue: Imports not replaced

**Symptoms**: Module still imports from old paths

**Solution**:

1. Check import mapping configuration
2. Verify regex patterns in replacement logic
3. Check file encoding and line endings
4. Ensure all TypeScript files are processed

### Issue: Selectors return undefined

**Symptoms**: Selectors work but return undefined values

**Solution**:

1. Check slice key mapping in generated selectors
2. Verify Redux store structure
3. Check selector logic for correct property access
4. Verify module slices are properly integrated

### Issue: TypeScript errors

**Symptoms**: Build fails with type errors

**Solution**:

1. Check RootState type includes module slices
2. Verify selector return types
3. Check import paths in generated selectors
4. Ensure all dependencies are properly imported

---

## Best Practices

### 1. Selector Templates

- **Keep templates simple** - Avoid complex logic
- **Use consistent naming** - Follow established patterns
- **Handle edge cases** - Add null checks and fallbacks
- **Document selectors** - Add comments for complex selectors

### 2. Import Replacement

- **Use precise regex** - Avoid false positives
- **Handle multiple imports** - Support complex import statements
- **Preserve formatting** - Maintain code style
- **Validate replacements** - Check that replacements are correct

### 3. Module Management

- **Version selectors** - Track selector versions with modules
- **Handle updates** - Support module updates and selector changes
- **Clean up old files** - Remove unused selector files
- **Document changes** - Keep track of selector modifications

### 4. Error Handling

- **Graceful failures** - Handle sync script errors gracefully
- **Detailed logging** - Provide clear error messages
- **Rollback capability** - Support reverting failed syncs
- **Validation checks** - Verify integration before completing

---

## Conclusion

This approach provides a **simple, reliable, and maintainable** solution for integrating module selectors into the host platform:

✅ **Simple implementation** - No complex runtime logic  
✅ **Reliable operation** - No runtime errors or edge cases  
✅ **Good performance** - Direct slice access, no overhead  
✅ **Easy maintenance** - Clear, explicit selectors  
✅ **Predictable behavior** - No hidden runtime behavior

The sync script replacement strategy gives you the best balance of automation and control, ensuring your modules work seamlessly in both standalone and integrated modes.

---

**Document Version**: 1.0.0  
**Last Updated**: December 19, 2024
