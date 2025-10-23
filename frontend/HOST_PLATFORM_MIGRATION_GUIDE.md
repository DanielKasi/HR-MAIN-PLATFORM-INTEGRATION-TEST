# Host Platform Migration Guide

> **Complete Guide for Migrating a Host Platform to Support Integrated Modules**

**Version**: 1.0.0  
**Last Updated**: December 19, 2024  
**Target**: Host platforms that need to integrate modular applications

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Platform API Setup](#phase-1-platform-api-setup)
4. [Phase 2: Store Architecture](#phase-2-store-architecture)
5. [Phase 3: Module Integration System](#phase-3-module-integration-system)
6. [Phase 4: Routing & Navigation](#phase-4-routing--navigation)
7. [Phase 5: Build & Sync Tooling](#phase-5-build--sync-tooling)
8. [Phase 6: Testing & Validation](#phase-6-testing--validation)
9. [Phase 7: CI/CD Integration](#phase-7-cicd-integration)
10. [Phase 8: Production Deployment](#phase-8-production-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)
13. [Migration Checklist](#migration-checklist)

---

## Overview

### What This Guide Covers

This guide will transform your existing Next.js application into a **host platform** capable of integrating modular applications. The host platform will:

- ✅ **Host multiple modules** under a single domain
- ✅ **Provide shared infrastructure** (auth, UI, state management)
- ✅ **Enable build-time composition** (not runtime micro-frontends)
- ✅ **Maintain type safety** across module boundaries
- ✅ **Support standalone development** for each module

### Migration Strategy

**Build-time composition** approach:

- Modules are **copied** into host at build time
- **No runtime loading** complexity
- **Full SSR support** maintained
- **Single optimized bundle** for production

### Before vs After

**Before (Monolithic)**:

```
host-app/
├── src/app/
│   ├── dashboard/
│   ├── projects/
│   ├── users/
│   └── settings/
├── src/components/
├── src/store/
└── package.json
```

**After (Modular Host)**:

```
host-app/
├── src/
│   ├── platform/v1/          # Platform API
│   ├── app/
│   │   ├── tasks/            # Synced module
│   │   ├── accounting/       # Synced module
│   │   └── layout.tsx        # Host layout
│   ├── lib/
│   │   ├── modules/          # Module descriptors
│   │   └── redux/            # Generated store config
│   └── components/           # Shared components
├── modules/                  # Module metadata
├── scripts/
│   ├── sync-module.mjs       # Module syncing
│   └── validate-routes.mjs   # Route validation
└── modules.lock.json         # Version lockfile
```

---

## Prerequisites

### Required Knowledge

- Next.js App Router
- Redux Toolkit & Redux Saga
- TypeScript
- Git & GitHub
- Basic understanding of modular architecture

### Required Tools

- Node.js 18+
- Git
- Code editor (VS Code recommended)
- Terminal access

### Current Application Requirements

- Next.js 13+ with App Router
- Existing Redux store setup
- TypeScript configuration
- Component library (optional but recommended)

---

## Phase 1: Platform API Setup

### Step 1.1: Create Platform API Structure

Create the platform API directory structure:

```bash
mkdir -p src/platform/v1/{auth,api,components,config,types,utils}
```

### Step 1.2: Define Module Interface

Create `src/platform/v1/types/module.ts`:

```typescript
import { Reducer, AnyAction } from "@reduxjs/toolkit";

export interface ModuleDescriptor {
	name: string;
	version: string;
	platformVersion: string;
	routeBasePath: string;
	routes: string[];
	slices: Record<string, Reducer<any, AnyAction>>;
	sagas?: Array<() => Generator>;
	rtkApis?: Array<{
		reducerPath: string;
		reducer: any;
		middleware: any;
	}>;
	peerDeps: Record<string, string>;
}

export interface PlatformConfig {
	apiBaseUrl: string;
	locale: string;
	timezone: string;
	environment: "development" | "staging" | "production";
}

export const PLATFORM_VERSION = "1.0.0";
```

### Step 1.3: Create Platform Configuration

Create `src/platform/v1/config/index.ts`:

```typescript
export type PlatformConfig = {
	apiBaseUrl: string;
	locale: string;
	timezone: string;
	environment: "development" | "staging" | "production";
};

export const getServerConfig = (): PlatformConfig => ({
	apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
	locale: process.env.NEXT_PUBLIC_LOCALE ?? "en-US",
	timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "UTC",
	environment: (process.env.NODE_ENV as any) ?? "development",
});

export const getClientConfig = (): PlatformConfig => {
	if (typeof window === "undefined") {
		return getServerConfig();
	}

	return {
		apiBaseUrl: window.location.origin,
		locale: navigator.language,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		environment: (process.env.NODE_ENV as any) ?? "development",
	};
};
```

### Step 1.4: Create Platform API Client

Create `src/platform/v1/api/index.ts`:

```typescript
// Re-export your existing API client
export { default as apiRequest } from "@/lib/apiRequest";

export const buildApiUrl = (endpoint: string, baseUrl?: string): string => {
	const base = baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
	return `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
};

export const createApiHeaders = (token?: string) => ({
	"Content-Type": "application/json",
	...(token && { Authorization: `Bearer ${token}` }),
});
```

### Step 1.5: Create Platform Components

Create `src/platform/v1/components/index.ts`:

```typescript
// Re-export UI primitives from your existing components
export * from "@/components/ui/button";
export * from "@/components/ui/card";
export * from "@/components/ui/dialog";
export * from "@/components/ui/input";
export * from "@/components/ui/label";
export * from "@/components/ui/select";
export * from "@/components/ui/textarea";
export * from "@/components/ui/toast";
export * from "@/components/ui/form";
export * from "@/components/ui/table";
export * from "@/components/ui/badge";
export * from "@/components/ui/avatar";
export * from "@/components/ui/separator";
export * from "@/components/ui/sheet";
export * from "@/components/ui/tabs";
export * from "@/components/ui/accordion";
export * from "@/components/ui/alert";
export * from "@/components/ui/alert-dialog";
export * from "@/components/ui/aspect-ratio";
export * from "@/components/ui/checkbox";
export * from "@/components/ui/collapsible";
export * from "@/components/ui/context-menu";
export * from "@/components/ui/hover-card";
export * from "@/components/ui/menubar";
export * from "@/components/ui/navigation-menu";
export * from "@/components/ui/popover";
export * from "@/components/ui/progress";
export * from "@/components/ui/radio-group";
export * from "@/components/ui/scroll-area";
export * from "@/components/ui/slider";
export * from "@/components/ui/switch";
export * from "@/components/ui/toggle";
export * from "@/components/ui/toggle-group";
export * from "@/components/ui/tooltip";
export * from "@/components/ui/skeleton";
export * from "@/components/ui/command";

// Re-export common components that modules might need
export { default as FixedLoader } from "@/components/fixed-loader";
export { default as ProtectedComponent } from "@/components/ProtectedComponent";
export { default as StatusBadge } from "@/components/status-badge";
```

### Step 1.6: Create Platform Auth Utilities

Create `src/platform/v1/auth/index.ts`:

```typescript
// Re-export auth utilities from your existing store
export { hasPermission } from "@/lib/helpers";

export {
	selectAccessToken,
	selectSelectedInstitution,
	selectUser,
	selectUserLoading,
	selectAttachedInstitutions,
} from "@/store/auth/selectors";

export {
	fetchRemoteUserStart,
	fetchUpToDateInstitution,
	logoutStart,
	userActivityDetected,
	clearTemporaryPermissions,
} from "@/store/auth/actions";

// Auth types
export type { IUser } from "@/types/user.types";
export type { IUserInstitution } from "@/types/other";

// Auth utilities
export const getAuthHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
});

export const isAuthenticated = (token: string | null): boolean => {
	return !!token && token.length > 0;
};
```

### Step 1.7: Create Platform Utils

Create `src/platform/v1/utils/index.ts`:

```typescript
export { cn } from "@/lib/utils";
export { formatTransactionDate } from "@/lib/helpers";

export const formatDate = (date: Date | string): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

export const formatCurrency = (amount: number, currency = "USD"): string => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);
};

export const debounce = <T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): ((...args: Parameters<T>) => void) => {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
};
```

### Step 1.8: Create Main Platform Export

Create `src/platform/v1/index.ts`:

```typescript
export * from "./auth";
export * from "./api";
export * from "./components";
export * from "./types/module";
export * from "./utils";
export * from "./config";

export const PLATFORM_VERSION = "1.0.0";
```

### Step 1.9: Update TypeScript Configuration

Update `tsconfig.json`:

```json
{
	"compilerOptions": {
		"paths": {
			"@/*": ["./src/*"],
			"@/platform/*": ["./src/platform/*"],
			"@/platform/v1/*": ["./src/platform/v1/*"]
		}
	}
}
```

---

## Phase 2: Store Architecture

### Step 2.1: Create Module Store Registry

Create `src/lib/redux/registry.ts`:

```typescript
// AUTO-GENERATED - DO NOT EDIT
// This file will be generated by the sync script

import { combineReducers } from "@reduxjs/toolkit";
import { all, fork } from "redux-saga/effects";

// Import module descriptors (will be added by sync script)
// import { moduleDescriptor as taskManagement } from '@/lib/modules/task-management';

// Host slices (your existing slices)
import { authReducer } from "@/store/auth/reducer";
import { miscReducer } from "@/store/miscellaneous/reducer";
import { redirectsReducer } from "@/store/redirects/reducer";
import { notificationsReducer } from "@/store/notifications/reducer";

// Host sagas
import { authSaga } from "@/store/auth/sagas";
import { notificationsSaga } from "@/store/notifications/sagas";

// Combine host slices
const hostSlices = combineReducers({
	auth: authReducer,
	miscellaneous: miscReducer,
	redirects: redirectsReducer,
	notifications: notificationsReducer,
});

// Combine module slices (will be populated by sync script)
const moduleSlices = combineReducers({
	// Module slices will be added here automatically
});

// Root reducer
export const rootReducer = combineReducers({
	...hostSlices,
	...moduleSlices,
});

// Host sagas
function* hostSagas() {
	yield all([fork(authSaga), fork(notificationsSaga)]);
}

// Module sagas (will be populated by sync script)
function* moduleSagas() {
	yield all([
		// Module sagas will be added here automatically
	]);
}

// Root saga
export function* rootSaga() {
	yield all([fork(hostSagas), fork(moduleSagas)]);
}

export type RootState = ReturnType<typeof rootReducer>;
```

### Step 2.2: Update Store Configuration

Update `src/store/index.ts`:

```typescript
import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware, { Task } from "redux-saga";
import { Store } from "@reduxjs/toolkit";
import {
	persistStore,
	persistReducer,
	PersistConfig,
	FLUSH,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER,
	REHYDRATE,
} from "redux-persist";
import { createWrapper, MakeStore, Context } from "next-redux-wrapper";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

import { clearStateIfStructureChanged } from "./storeUtils";

// Import from registry instead of individual files
import { rootReducer, rootSaga, RootState } from "@/lib/redux/registry";

const createNoopStorage = () => {
	return {
		getItem(_key: any) {
			return Promise.resolve(null);
		},
		setItem(_key: any, value: any) {
			return Promise.resolve(value);
		},
		removeItem(_key: any) {
			return Promise.resolve();
		},
	};
};

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

const persistConfig: PersistConfig<RootState> = {
	key: "root",
	storage,
	version: 2,
	blacklist: [], // Define slices to blacklist here
	migrate: async (state, currentVersion) => {
		if (!state || state._persist.version !== currentVersion) {
			return undefined;
		}
		return state;
	},
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Extend Redux Store to include sagaTask for SSR
export interface AppStore extends Store<RootState> {
	sagaTask?: Task;
}

// Define type for dispatch
export type AppDispatch = ReturnType<typeof configureAppStore>["dispatch"];

// Configure the store
export const configureAppStore = () => {
	// Create the saga middleware
	const sagaMiddleware = createSagaMiddleware();

	clearStateIfStructureChanged();

	// Configure the store
	const store = configureStore({
		reducer: persistedReducer,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				thunk: false,
				serializableCheck: {
					ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
				},
			}).concat(sagaMiddleware),
	});

	// Run the root saga
	(store as AppStore).sagaTask = sagaMiddleware.run(rootSaga);

	return store;
};

// MakeStore function for next-redux-wrapper
const makeStore: MakeStore<ReturnType<typeof configureAppStore>> = (_: Context) =>
	configureAppStore();

export const wrapper = createWrapper(makeStore, {
	debug: process.env.NODE_ENV === "development",
});

export const store = configureAppStore();
export const persistor = persistStore(store);
```

---

## Phase 3: Module Integration System

### Step 3.1: Create Module Sync Script

Create `scripts/sync-module.mjs`:

```javascript
#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync a module from a Git repository into the host app
 *
 * Usage:
 *   node scripts/sync-module.mjs \
 *     --repo <git-url> \
 *     --tag <version-tag> \
 *     --name <module-name>
 */

async function syncModule({ repo, tag, name }) {
	console.log(`\n🔄 Syncing module: ${name}@${tag}\n`);

	const tempDir = `/tmp/module-sync-${name}-${Date.now()}`;
	const rootDir = path.join(__dirname, "..");
	const targetDir = path.join(rootDir, "src/app", name);
	const modulesDir = path.join(rootDir, "modules");

	try {
		// Step 1: Clone the module repo at specific tag
		console.log("📦 Cloning module repository...");
		execSync(`git clone --depth 1 --branch ${tag} ${repo} ${tempDir}`, {
			stdio: "inherit",
		});

		// Step 2: Read and validate module.json
		console.log("✅ Validating module manifest...");
		const manifestPath = path.join(tempDir, "module.json");
		const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));

		// Basic validation
		if (manifest.name !== name) {
			throw new Error(`Module name mismatch: expected ${name}, got ${manifest.name}`);
		}

		// Step 3: Check platform compatibility
		console.log("🔍 Checking platform compatibility...");
		const hostPackage = JSON.parse(await fs.readFile(path.join(rootDir, "package.json"), "utf-8"));

		// Validate peer dependencies
		for (const [pkg, version] of Object.entries(manifest.peerDeps || {})) {
			const hostVersion = hostPackage.dependencies[pkg];
			if (!hostVersion) {
				console.warn(`⚠️  Warning: ${pkg} not found in host dependencies`);
			}
			// TODO: Add semver range checking
		}

		// Step 4: Copy module core
		console.log("📋 Copying module files...");
		const srcAppPath = path.join(tempDir, "src/app");

		// Remove existing module if it exists
		try {
			await fs.rm(targetDir, { recursive: true, force: true });
		} catch (err) {
			// Ignore if doesn't exist
		}

		// Copy src/app/* to host
		await fs.mkdir(targetDir, { recursive: true });
		await copyDir(srcAppPath, targetDir);

		// Step 5: Copy module descriptor
		console.log("🔧 Copying module descriptor...");
		const descriptorSrc = path.join(tempDir, "src/platform-integration/module-descriptor.ts");
		const descriptorDest = path.join(rootDir, "src/lib/modules", `${name}.ts`);

		await fs.mkdir(path.dirname(descriptorDest), { recursive: true });
		await fs.copyFile(descriptorSrc, descriptorDest);

		// Step 6: Update module metadata
		console.log("📝 Updating module metadata...");
		await fs.mkdir(modulesDir, { recursive: true });

		const metadata = {
			name: manifest.name,
			version: manifest.version,
			tag,
			syncedAt: new Date().toISOString(),
			routes: manifest.routes,
			mountPath: manifest.mountPath,
		};

		await fs.writeFile(path.join(modulesDir, `${name}.json`), JSON.stringify(metadata, null, 2));

		// Step 7: Update lock file
		console.log("🔒 Updating modules.lock.json...");
		const lockPath = path.join(rootDir, "modules.lock.json");
		let lock = {};

		try {
			lock = JSON.parse(await fs.readFile(lockPath, "utf-8"));
		} catch (err) {
			// Create new lock if doesn't exist
		}

		lock[name] = {
			version: manifest.version,
			tag,
			repo,
			syncedAt: new Date().toISOString(),
			checksum: await getDirectoryChecksum(targetDir),
		};

		await fs.writeFile(lockPath, JSON.stringify(lock, null, 2));

		// Step 8: Generate registry
		console.log("⚙️  Generating module registry...");
		await generateRegistry(rootDir);

		// Cleanup
		await fs.rm(tempDir, { recursive: true, force: true });

		console.log(`\n✨ Successfully synced ${name}@${tag}\n`);
	} catch (error) {
		console.error("\n❌ Sync failed:", error.message);

		// Cleanup on error
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch (err) {
			// Ignore cleanup errors
		}

		process.exit(1);
	}
}

async function copyDir(src, dest) {
	await fs.mkdir(dest, { recursive: true });
	const entries = await fs.readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			await copyDir(srcPath, destPath);
		} else {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

async function getDirectoryChecksum(dir) {
	// Simplified checksum - could use crypto hash
	const stats = await fs.stat(dir);
	return stats.mtime.getTime().toString();
}

async function generateRegistry(rootDir) {
	const modulesLibDir = path.join(rootDir, "src/lib/modules");
	const registryPath = path.join(rootDir, "src/lib/redux/registry.ts");

	// Read all module descriptors
	const moduleFiles = await fs.readdir(modulesLibDir);
	const modules = moduleFiles
		.filter((f) => f.endsWith(".ts") && f !== "index.ts")
		.map((f) => f.replace(".ts", ""));

	const registryContent = `
// AUTO-GENERATED - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

import { combineReducers } from '@reduxjs/toolkit';
import { all, fork } from 'redux-saga/effects';

${modules.map((m) => `import { moduleDescriptor as ${m} } from '@/lib/modules/${m}';`).join("\n")}

// Host slices
import { authReducer } from '@/store/auth/reducer';
import { miscReducer } from '@/store/miscellaneous/reducer';
import { redirectsReducer } from '@/store/redirects/reducer';
import { notificationsReducer } from '@/store/notifications/reducer';

// Host sagas
import { authSaga } from '@/store/auth/sagas';
import { notificationsSaga } from '@/store/notifications/sagas';

// Combine host slices
const hostSlices = combineReducers({
  auth: authReducer,
  miscellaneous: miscReducer,
  redirects: redirectsReducer,
  notifications: notificationsReducer,
});

// Combine module slices with namespacing
const moduleSlices = combineReducers({
${modules.map((m) => `  ...${m}.slices,`).join("\n")}
});

// Root reducer
export const rootReducer = combineReducers({
  ...hostSlices,
  ...moduleSlices,
});

// Host sagas
function* hostSagas() {
  yield all([
    fork(authSaga),
    fork(notificationsSaga),
  ]);
}

// Module sagas
function* moduleSagas() {
  yield all([
${modules.map((m) => `    ...${m}.sagas.map(saga => fork(saga)),`).join("\n")}
  ]);
}

// Root saga
export function* rootSaga() {
  yield all([
    fork(hostSagas),
    fork(moduleSagas),
  ]);
}

export type RootState = ReturnType<typeof rootReducer>;
`.trim();

	await fs.writeFile(registryPath, registryContent);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
	const key = args[i].replace("--", "");
	params[key] = args[i + 1];
}

if (!params.repo || !params.tag || !params.name) {
	console.error("Usage: sync-module.mjs --repo <url> --tag <tag> --name <name>");
	process.exit(1);
}

syncModule(params);
```

### Step 3.2: Create Route Validation Script

Create `scripts/validate-routes.mjs`:

```javascript
#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

async function validateRoutes() {
	const modulesDir = path.join(process.cwd(), "modules");

	try {
		const files = await fs.readdir(modulesDir);
	} catch (err) {
		console.log("ℹ️  No modules directory found - skipping route validation");
		return;
	}

	const files = await fs.readdir(modulesDir);
	const routes = new Map();
	const conflicts = [];

	for (const file of files) {
		if (!file.endsWith(".json")) continue;

		const content = await fs.readFile(path.join(modulesDir, file), "utf-8");
		const module = JSON.parse(content);

		for (const route of module.routes) {
			const fullRoute = `${module.mountPath}${route}`;

			if (routes.has(fullRoute)) {
				conflicts.push({
					route: fullRoute,
					modules: [routes.get(fullRoute), module.name],
				});
			}

			routes.set(fullRoute, module.name);
		}
	}

	if (conflicts.length > 0) {
		console.error("\n❌ Route conflicts detected:\n");
		conflicts.forEach((c) => {
			console.error(`  ${c.route}: ${c.modules.join(", ")}`);
		});
		process.exit(1);
	}

	console.log("✅ No route conflicts found");
}

validateRoutes();
```

### Step 3.3: Create Module Lock File

Create `modules.lock.json`:

```json
{
	"description": "Module version lockfile - tracks synced module versions",
	"version": "1.0.0",
	"modules": {}
}
```

---

## Phase 4: Routing & Navigation

### Step 4.1: Create Module Navigation Hook

Create `src/hooks/use-module-navigation.ts`:

```typescript
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function buildModulePath(route: string): string {
	// In standalone mode, return route as-is
	// In integrated mode, this will be overridden by the host
	return route;
}

export function useModuleNavigation() {
	const router = useRouter();

	const navigation = useMemo(
		() => ({
			push: (route: string) => {
				router.push(buildModulePath(route));
			},
			replace: (route: string) => {
				router.replace(buildModulePath(route));
			},
		}),
		[router],
	);

	return navigation;
}
```

### Step 4.2: Update Host Layout

Update `src/app/layout.tsx`:

```typescript
import { ReduxProvider } from '@/providers/ReduxProvider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
```

### Step 4.3: Create Module Error Boundary

Create `src/platform/v1/components/ModuleErrorBoundary.tsx`:

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`[${this.props.moduleName}] Error:`, error, errorInfo);
    // Send to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border border-red-200 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Module Error: {this.props.moduleName}
          </h2>
          <p className="text-gray-600">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Phase 5: Build & Sync Tooling

### Step 5.1: Update Package.json Scripts

Update `package.json`:

```json
{
	"scripts": {
		"dev": "next dev --turbopack",
		"build": "next build",
		"start": "next start",
		"lint": "next lint",
		"type-check": "tsc --noEmit",
		"sync-module": "node scripts/sync-module.mjs",
		"validate-routes": "node scripts/validate-routes.mjs",
		"validate-modules": "npm run validate-routes && npm run type-check"
	}
}
```

### Step 5.2: Create Module Schema Validation

Create `schemas/module.schema.json`:

```json
{
	"$schema": "http://json-schema.org/draft-07/schema#",
	"type": "object",
	"required": ["name", "version", "platformVersion", "mountPath", "routes"],
	"properties": {
		"name": {
			"type": "string",
			"pattern": "^[a-z][a-z0-9-]*$"
		},
		"version": {
			"type": "string",
			"pattern": "^\\d+\\.\\d+\\.\\d+$"
		},
		"platformVersion": {
			"type": "string",
			"description": "Semver range for compatible platform versions"
		},
		"mountPath": {
			"type": "string",
			"pattern": "^/[a-z][a-z0-9-]*$"
		},
		"routes": {
			"type": "array",
			"items": {
				"type": "string",
				"pattern": "^/"
			}
		},
		"peerDeps": {
			"type": "object",
			"additionalProperties": {
				"type": "string"
			}
		}
	}
}
```

### Step 5.3: Create ESLint Rules for Modules

Create `.eslintrc.modules.js`:

```javascript
module.exports = {
	rules: {
		"import/no-restricted-paths": [
			"error",
			{
				zones: [
					{
						target: "./src/app/**/*",
						from: "./app/**/*",
						message: "Module core (src/app) cannot import standalone shell (app)",
					},
					{
						target: "./src/app/**/*",
						from: "./src/platform-integration/**/*",
						message: "Module app cannot import platform integration",
					},
				],
			},
		],
		"no-restricted-imports": [
			"error",
			{
				patterns: [
					{
						group: ["@/lib/*", "!@/platform/**"],
						message: "Modules must use @/platform API, not direct @/lib imports",
					},
				],
			},
		],
	},
};
```

---

## Phase 6: Testing & Validation

### Step 6.1: Test Module Sync

```bash
# Make scripts executable
chmod +x scripts/sync-module.mjs
chmod +x scripts/validate-routes.mjs

# Test sync with a module
node scripts/sync-module.mjs \
  --repo "https://github.com/yourorg/task-management-module" \
  --tag "v1.0.0" \
  --name "tasks"
```

### Step 6.2: Validate Routes

```bash
npm run validate-routes
```

### Step 6.3: Test Build

```bash
npm run type-check
npm run build
```

### Step 6.4: Test Development Mode

```bash
npm run dev
```

Visit `http://localhost:3000` and verify:

- Host platform loads correctly
- Module routes are accessible
- Navigation works between modules
- State management works across modules

---

## Phase 7: CI/CD Integration

### Step 7.1: Create GitHub Actions Workflow

Create `.github/workflows/module-sync.yml`:

```yaml
name: Module Sync

on:
  workflow_dispatch:
    inputs:
      module_name:
        description: "Module name"
        required: true
      module_tag:
        description: "Module version tag"
        required: true
      module_repo:
        description: "Module repository URL"
        required: true

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Sync module
        run: |
          node scripts/sync-module.mjs \
            --repo ${{ github.event.inputs.module_repo }} \
            --tag ${{ github.event.inputs.module_tag }} \
            --name ${{ github.event.inputs.module_name }}

      - name: Validate routes
        run: node scripts/validate-routes.mjs

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: sync ${{ github.event.inputs.module_name }}@${{ github.event.inputs.module_tag }}"
          title: "Sync module: ${{ github.event.inputs.module_name }}@${{ github.event.inputs.module_tag }}"
          body: |
            Auto-sync of module from repository.

            - Module: ${{ github.event.inputs.module_name }}
            - Version: ${{ github.event.inputs.module_tag }}
            - Repository: ${{ github.event.inputs.module_repo }}
          branch: sync/${{ github.event.inputs.module_name }}-${{ github.event.inputs.module_tag }}
```

### Step 7.2: Create Auto-Sync Workflow

Create `.github/workflows/auto-sync.yml`:

```yaml
name: Auto Sync Modules

on:
  repository_dispatch:
    types: [module-release]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Sync module
        run: |
          node scripts/sync-module.mjs \
            --repo "https://github.com/${{ github.event.client_payload.module_repo }}" \
            --tag "${{ github.event.client_payload.module_tag }}" \
            --name "${{ github.event.client_payload.module_name }}"

      - name: Validate and build
        run: |
          node scripts/validate-routes.mjs
          npm run type-check
          npm run build

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: auto-sync ${{ github.event.client_payload.module_name }}@${{ github.event.client_payload.module_tag }}"
          title: "Auto-sync: ${{ github.event.client_payload.module_name }}@${{ github.event.client_payload.module_tag }}"
          body: |
            Automated sync triggered by module release.

            **Review required** - Please verify:
            - [ ] Routes don't conflict
            - [ ] Build passes
            - [ ] Tests pass
            - [ ] No breaking changes

            - Module: ${{ github.event.client_payload.module_name }}
            - Version: ${{ github.event.client_payload.module_tag }}
            - Repository: ${{ github.event.client_payload.module_repo }}
          assignees: platform-team
          reviewers: platform-team
```

---

## Phase 8: Production Deployment

### Step 8.1: Environment Configuration

Create `.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_LOCALE=en-US
NEXT_PUBLIC_TIMEZONE=UTC
NODE_ENV=production
```

### Step 8.2: Docker Configuration

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 8.3: Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Build the application
echo "📦 Building application..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run validate-modules

# Deploy to production
echo "🌐 Deploying to production..."
# Add your deployment commands here

echo "✅ Deployment complete!"
```

---

## Troubleshooting

### Common Issues

#### Issue: Module sync fails with "Module name mismatch"

**Solution**: Ensure the module name in `module.json` matches the `--name` parameter

#### Issue: Route conflicts detected

**Solution**: Check for overlapping routes between modules and adjust mount paths

#### Issue: TypeScript errors after sync

**Solution**: Run `npm run type-check` and fix any type issues

#### Issue: Build fails after module integration

**Solution**: Check that all module dependencies are compatible with host

#### Issue: Module not accessible in browser

**Solution**: Verify routes are correctly generated and module is properly synced

### Debug Commands

```bash
# Check module status
cat modules.lock.json

# Validate routes
npm run validate-routes

# Check TypeScript
npm run type-check

# Test build
npm run build

# Check generated registry
cat src/lib/redux/registry.ts
```

---

## Best Practices

### For Host Platform Maintainers

1. **Keep Platform API Stable**: Version breaking changes
2. **Review Module PRs**: Ensure compatibility before merging
3. **Monitor Bundle Size**: Watch for bloat from modules
4. **Maintain Type Safety**: Keep platform types strict
5. **Document Platform API**: Clear examples and contracts

### For Module Developers

1. **Use Platform API Only**: Don't bypass abstractions
2. **Test Standalone**: Ensure module works independently
3. **Version Carefully**: Follow semantic versioning
4. **Minimize Dependencies**: Only declare truly needed deps
5. **Document Routes**: Keep route manifest accurate

### For Teams

1. **Coordinate Releases**: Platform changes affect all modules
2. **Test Integration Early**: Don't wait until deployment
3. **Use Feature Flags**: For gradual rollouts
4. **Share UI Components**: Maintain consistent UX
5. **Keep modules.lock.json Updated**: Track what's deployed

---

## Migration Checklist

### Pre-Migration

- [ ] Backup current application
- [ ] Document current architecture
- [ ] Identify existing modules to extract
- [ ] Plan module boundaries
- [ ] Set up development environment

### Phase 1: Platform API

- [ ] Create platform API structure
- [ ] Define module interface
- [ ] Create platform configuration
- [ ] Set up API client
- [ ] Create component exports
- [ ] Set up auth utilities
- [ ] Create utility functions
- [ ] Update TypeScript config

### Phase 2: Store Architecture

- [ ] Create module store registry
- [ ] Update store configuration
- [ ] Set up Redux composition
- [ ] Configure saga integration
- [ ] Test store functionality

### Phase 3: Module Integration

- [ ] Create sync script
- [ ] Set up route validation
- [ ] Create module lock file
- [ ] Test module syncing
- [ ] Validate integration

### Phase 4: Routing & Navigation

- [ ] Create navigation hook
- [ ] Update host layout
- [ ] Set up error boundaries
- [ ] Test routing functionality
- [ ] Validate navigation

### Phase 5: Build & Sync Tooling

- [ ] Update package.json scripts
- [ ] Create schema validation
- [ ] Set up ESLint rules
- [ ] Test build process
- [ ] Validate tooling

### Phase 6: Testing & Validation

- [ ] Test module sync
- [ ] Validate routes
- [ ] Test build process
- [ ] Test development mode
- [ ] Run integration tests

### Phase 7: CI/CD Integration

- [ ] Create GitHub Actions workflows
- [ ] Set up auto-sync
- [ ] Configure PR automation
- [ ] Test CI/CD pipeline
- [ ] Set up monitoring

### Phase 8: Production Deployment

- [ ] Configure environment variables
- [ ] Set up Docker configuration
- [ ] Create deployment scripts
- [ ] Test production build
- [ ] Deploy to staging
- [ ] Deploy to production

### Post-Migration

- [ ] Monitor application performance
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Plan future modules
- [ ] Train team on new architecture

---

## Conclusion

This guide provides a complete roadmap for migrating your host platform to support integrated modules. The modular architecture enables:

✅ **Independent development** - Modules in separate repos  
✅ **Same domain deployment** - No subdomain/CORS issues  
✅ **Type-safe composition** - Build-time integration  
✅ **Shared infrastructure** - Auth, UI, state management  
✅ **Standalone testing** - Each module works independently  
✅ **Incremental adoption** - Add modules gradually

**Next Steps**:

1. Follow this guide step-by-step
2. Start with Phase 1 (Platform API Setup)
3. Test each phase thoroughly
4. Extract your first module
5. Build sync tooling
6. Test integration
7. Add more modules

For questions or issues, refer to the troubleshooting section or create an issue in your repository.

---

**Document Version**: 1.0.0  
**Last Updated**: December 19, 2024
