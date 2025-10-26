#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const rootDir = path.join(__dirname, '..');
  const targetDir = path.join(rootDir, 'app', '(main_app)', '(dashboard)', 'apps', name);
  const modulesDir = path.join(rootDir, 'modules');

  try {
    // Step 1: Clone the module repo at specific tag
    console.log('📦 Cloning module repository...');
    execSync(`git clone --depth 1 --branch ${tag} ${repo} ${tempDir}`, {
      stdio: 'inherit',
    });

    // Step 2: Read and validate module.json
    console.log('✅ Validating module manifest...');
    // Check for module.json in root or frontend directory
    let manifestPath = path.join(tempDir, 'module.json');
    if (!await fs.access(manifestPath).then(() => true).catch(() => false)) {
      manifestPath = path.join(tempDir, 'frontend', 'module.json');
    }
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    // Basic validation
    if (manifest.name !== name) {
      throw new Error(`Module name mismatch: expected ${name}, got ${manifest.name}`);
    }

    // Step 3: Check platform compatibility
    console.log('🔍 Checking platform compatibility...');
    const hostPackage = JSON.parse(
      await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8')
    );
    
    // Validate peer dependencies
    for (const [pkg, version] of Object.entries(manifest.peerDeps || {})) {
      const hostVersion = hostPackage.dependencies[pkg];
      if (!hostVersion) {
        console.warn(`⚠️  Warning: ${pkg} not found in host dependencies`);
      }
      // TODO: Add semver range checking
    }

    // Step 4: Copy module core
    console.log('📋 Copying module files...');
    // Check for src/app in root or frontend directory
    let srcAppPath = path.join(tempDir, 'src/app');
    if (!await fs.access(srcAppPath).then(() => true).catch(() => false)) {
      srcAppPath = path.join(tempDir, 'frontend', 'src/app');
    }
    
    // Remove existing module if it exists
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore if doesn't exist
    }

    // Copy src/app/* to host
    await fs.mkdir(targetDir, { recursive: true });
    await copyDir(srcAppPath, targetDir);

    // Step 4.5: Replace module root layout with simplified version
    console.log('🔧 Replacing module root layout...');
    await replaceModuleRootLayout(targetDir);

    // Step 5: Copy module store files
    console.log('🔧 Copying module store files...');
    await copyModuleStoreFiles(tempDir, name, rootDir);

    // Step 5.5: Copy platform utilities that modules might need
    console.log('🔧 Copying platform utilities...');
    await copyPlatformUtilities(rootDir);

    // Step 6: Copy and update module descriptor
    console.log('🔧 Copying and updating module descriptor...');
    // Check for descriptor in root or frontend directory
    let descriptorSrc = path.join(tempDir, 'src/platform-integration/module-descriptor.ts');
    if (!await fs.access(descriptorSrc).then(() => true).catch(() => false)) {
      descriptorSrc = path.join(tempDir, 'frontend', 'src/platform-integration/module-descriptor.ts');
    }
    const descriptorDest = path.join(
      rootDir,
      'src/lib/modules',
      `${name}.ts`
    );
    
    await fs.mkdir(path.dirname(descriptorDest), { recursive: true });
    await fs.copyFile(descriptorSrc, descriptorDest);
    
    // Update descriptor to import from module's own store
    await updateModuleDescriptorImports(descriptorDest, name);

    // Step 7: Update module metadata
    console.log('📝 Updating module metadata...');
    await fs.mkdir(modulesDir, { recursive: true });
    
    const metadata = {
      name: manifest.name,
      version: manifest.version,
      tag,
      syncedAt: new Date().toISOString(),
      routes: manifest.routes,
      mountPath: manifest.mountPath,
    };
    
    await fs.writeFile(
      path.join(modulesDir, `${name}.json`),
      JSON.stringify(metadata, null, 2)
    );

    // Step 8: Update lock file
    console.log('🔒 Updating modules.lock.json...');
    const lockPath = path.join(rootDir, 'modules.lock.json');
    let lock = {};
    
    try {
      lock = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
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

    // Step 9: Integrate module selectors
    console.log('🔧 Integrating module selectors...');
    // Read the module descriptor to get slice information
    const moduleDescriptorPath = path.join(rootDir, 'src/lib/modules', `${name}.ts`);
    let moduleDescriptor = null;
    try {
      const descriptorContent = await fs.readFile(moduleDescriptorPath, 'utf-8');
      // Extract slice names from the content using a more specific regex
      const sliceMatches = descriptorContent.match(/'([^']*(?:Auth|Misc|Redirects|Notifications))':/g);
      if (sliceMatches) {
        moduleDescriptor = { slices: {} };
        sliceMatches.forEach(match => {
          const sliceName = match.match(/'([^']+)'/)[1];
          moduleDescriptor.slices[sliceName] = true; // We just need the keys
        });
        console.log(`📋 Found slices: ${Object.keys(moduleDescriptor.slices).join(', ')}`);
      }
    } catch (err) {
      console.warn('⚠️  Could not read module descriptor, skipping selector generation');
    }
    
    if (moduleDescriptor && moduleDescriptor.slices && Object.keys(moduleDescriptor.slices).length > 0) {
      // Get mount path from manifest (e.g., /apps/task-management)
      // Use manifest.mountPath if available, otherwise construct from /apps/{name}
      let mountPath = manifest.mountPath || `/apps/${name}`;
      // Ensure mountPath starts with / and includes /apps/
      if (!mountPath.startsWith('/apps/')) {
        if (mountPath.startsWith('/')) {
          mountPath = `/apps${mountPath}`;
        } else {
          mountPath = `/apps/${mountPath}`;
        }
      }
      await integrateModuleSelectors(name, moduleDescriptor, targetDir, rootDir, mountPath);
    } else {
      console.log('⚠️  No module descriptor found or no slices detected, skipping selector integration');
    }

    // Step 10: Generate registry
    console.log('⚙️  Generating module registry...');
    await generateRegistry(rootDir);

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log(`\n✨ Successfully synced ${name}@${tag}\n`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    
    // Cleanup on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Platform utilities copying function
async function copyPlatformUtilities(rootDir) {
  // Ensure hooks directory exists at root level
  const hooksDir = path.join(rootDir, 'hooks');
  await fs.mkdir(hooksDir, { recursive: true });
  
  // Copy use-module-navigation to hooks directory if it doesn't exist
  const srcHook = path.join(rootDir, 'src', 'hooks', 'use-module-navigation.ts');
  const destHook = path.join(hooksDir, 'use-module-navigation.ts');
  
  try {
    await fs.access(destHook);
    // File already exists, skip
  } catch {
    // File doesn't exist, copy it
    if (await fs.access(srcHook).then(() => true).catch(() => false)) {
      await fs.copyFile(srcHook, destHook);
      console.log('✅ Copied use-module-navigation.ts to hooks/');
    }
  }
}

// Store copying function
async function copyModuleStoreFiles(tempDir, moduleName, rootDir) {
  // Check for store in root or frontend directory
  let storeSrc = path.join(tempDir, 'src', 'store');
  if (!await fs.access(storeSrc).then(() => true).catch(() => false)) {
    storeSrc = path.join(tempDir, 'frontend', 'src', 'store');
  }
  
  // Check if store exists
  const storeExists = await fs.access(storeSrc).then(() => true).catch(() => false);
  
  if (storeExists) {
    const storeDest = path.join(rootDir, 'src', 'lib', 'modules', moduleName, 'store');
    await fs.mkdir(storeDest, { recursive: true });
    await copyDir(storeSrc, storeDest);
    console.log(`✅ Copied module store to: src/lib/modules/${moduleName}/store`);
    
    // Update store file imports
    await updateStoreFilesImports(storeDest, moduleName);
    
    // Namespace module action types to prevent conflicts
    await namespaceModuleActionTypes(storeDest, moduleName);
  } else {
    console.log('ℹ️  No store directory found in module');
  }
}

// Update module descriptor imports
async function updateModuleDescriptorImports(descriptorPath, moduleName) {
  try {
    let content = await fs.readFile(descriptorPath, 'utf-8');
    let modified = false;
    
    // Replace imports from '@/store/...' to '@/lib/modules/{moduleName}/store/...'
    const importRegex = /import\s+{[^}]+}\s+from\s+["']@\/store\/([^"']+)["']/g;
    
    content = content.replace(importRegex, (match, storePath) => {
      modified = true;
      const newImport = match.replace('@/store/', `@/lib/modules/${moduleName}/store/`);
      return newImport;
    });
    
    if (modified) {
      await fs.writeFile(descriptorPath, content);
      console.log(`✅ Updated module descriptor imports for: ${moduleName}`);
    }
  } catch (err) {
    console.log(`⚠️  Could not update module descriptor imports: ${err.message}`);
  }
}

// Namespace module action types to prevent conflicts with host
async function namespaceModuleActionTypes(storeDir, moduleName) {
  try {
    const files = await findTypeScriptFiles(storeDir);
    let totalModified = 0;
    
    // Map of old action types to new namespaced ones
    const actionTypeMap = {
      'misc/': `${moduleName}Misc/`,
      'auth/': `${moduleName}Auth/`,
      'redirects/': `${moduleName}Redirects/`,
      'notifications/': `${moduleName}Notifications/`,
      'miscellaneous/': `${moduleName}Misc/`,
    };
    
    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;
      
      // Replace action types in enum definitions
      for (const [oldPrefix, newPrefix] of Object.entries(actionTypeMap)) {
        const regex = new RegExp(`"${oldPrefix}([^"]+)"`, 'g');
        content = content.replace(regex, (match, actionName) => {
          modified = true;
          return `"${newPrefix}${actionName}"`;
        });
        
        // Also replace in comments and strings
        content = content.replace(
          new RegExp(oldPrefix, 'g'),
          (match) => {
            modified = true;
            return newPrefix;
          }
        );
      }
      
      if (modified) {
        await fs.writeFile(file, content);
        totalModified++;
      }
    }
    
    if (totalModified > 0) {
      console.log(`✅ Namespaced action types in ${totalModified} store files for module: ${moduleName}`);
    }
  } catch (err) {
    console.log(`⚠️  Could not namespace module action types: ${err.message}`);
  }
}

// Update store files imports
async function updateStoreFilesImports(storeDir, moduleName) {
  try {
    const files = await findTypeScriptFiles(storeDir);
    let totalModified = 0;
    
    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;
      
      // Replace imports from '@/lib/redux/create-context-aware-selector'
      content = content.replace(
        /import\s+{[^}]+}\s+from\s+["']@\/lib\/redux\/create-context-aware-selector["']/g,
        (match) => {
          modified = true;
          return match.replace('@/lib/redux/create-context-aware-selector', `@/lib/modules/${moduleName}/store/create-context-aware-selector`);
        }
      );
      
      // Also replace imports from '@/platform-integration/context-aware-selectors'
      content = content.replace(
        /import\s+{[^}]+}\s+from\s+["']@\/platform-integration\/context-aware-selectors["']/g,
        (match) => {
          modified = true;
          return match.replace('@/platform-integration/context-aware-selectors', `@/lib/modules/${moduleName}/store/create-context-aware-selector`);
        }
      );
      
      if (modified) {
        await fs.writeFile(file, content);
        totalModified++;
      }
    }
    
    if (totalModified > 0) {
      console.log(`✅ Updated imports in ${totalModified} store files`);
    }
  } catch (err) {
    console.log(`⚠️  Could not update store files imports: ${err.message}`);
  }
}

// Layout replacement function
async function replaceModuleRootLayout(targetDir) {
  const layoutPath = path.join(targetDir, 'layout.tsx');
  
  try {
    // Check if layout exists
    await fs.access(layoutPath);
    
    // Replace with simplified layout
    const simplifiedLayout = `"use client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`;
    
    await fs.writeFile(layoutPath, simplifiedLayout);
    console.log('✅ Replaced module root layout with simplified version');
  } catch (err) {
    // Layout file doesn't exist, which is fine
    console.log('ℹ️  No layout.tsx found at module root');
  }
}

// Selector integration functions
async function integrateModuleSelectors(moduleName, moduleDescriptor, targetDir, rootDir, mountPath) {
  try {
    // 1. Create context-aware selectors
    await createContextAwareSelectors(moduleName, moduleDescriptor, rootDir);
    
    // 2. Replace imports in module files
    await replaceSelectorImports(moduleName, targetDir, rootDir);
    
    // 3. Replace buildModulePath function calls
    await replaceBuildModulePath(moduleName, targetDir, mountPath, rootDir);
    
    console.log('✅ Module selectors integrated successfully');
  } catch (error) {
    console.error('❌ Selector integration failed:', error.message);
    throw error;
  }
}

async function createContextAwareSelectors(moduleName, moduleDescriptor, rootDir) {
  const selectorsDir = path.join(rootDir, 'src/lib/modules', moduleName);
  await fs.mkdir(selectorsDir, { recursive: true });
  
  const selectorsContent = generateSelectorsContent(moduleName, moduleDescriptor);
  await fs.writeFile(path.join(selectorsDir, 'selectors.ts'), selectorsContent);
  console.log(`✅ Generated selectors for module: ${moduleName}`);
}

function generateSelectorsContent(moduleName, moduleDescriptor) {
  const slices = moduleDescriptor.slices || {};
  let content = `// AUTO-GENERATED - DO NOT EDIT
// Generated for module: ${moduleName}
// Generated at: ${new Date().toISOString()}

import { RootState } from '@/store';

`;

  // Generate selectors for each slice
  Object.keys(slices).forEach(sliceKey => {
    const sliceType = getSliceType(sliceKey);
    
    if (sliceType === 'auth') {
      content += generateAuthSelectors(sliceKey);
    } else if (sliceType === 'misc') {
      content += generateMiscSelectors(sliceKey);
    } else if (sliceType === 'redirects') {
      content += generateRedirectsSelectors(sliceKey);
    } else if (sliceType === 'notifications') {
      content += generateNotificationsSelectors(sliceKey);
    }
  });

  return content;
}

function getSliceType(sliceKey) {
  if (sliceKey.includes('Auth')) return 'auth';
  if (sliceKey.includes('Misc')) return 'misc';
  if (sliceKey.includes('Redirects')) return 'redirects';
  if (sliceKey.includes('Notifications')) return 'notifications';
  return 'unknown';
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

function generateRedirectsSelectors(sliceKey) {
  return `
// Redirects selectors for slice: ${sliceKey}
export const selectRedirectIntent = (state: RootState) => state.${sliceKey}?.intent;
export const selectRedirectIntentId = (state: RootState) => state.${sliceKey}?.intent_id;

`;
}

function generateNotificationsSelectors(sliceKey) {
  return `
// Notifications selectors for slice: ${sliceKey}
export const selectNotifications = (state: RootState) => state.${sliceKey}?.notifications || [];
export const selectUnreadCount = (state: RootState) => state.${sliceKey}?.unreadCount || 0;

`;
}

async function replaceSelectorImports(moduleName, targetDir, rootDir) {
  const importMappings = [
    {
      from: '@/store/auth/selectors-context-aware',
      to: `@/lib/modules/${moduleName}/selectors`,
      selectors: [
        'selectUser', 'selectUserLoading', 'selectAccessToken', 'selectRefreshToken',
        'selectSelectedInstitution', 'selectSelectedInstitutionLoading',
        'selectSelectedBranch', 'selectSelectedBranchLoading',
        'selectSelectedTill', 'selectSelectedTillLoading',
        'selectAttachedInstitutions', 'selectAttachedInstitutionsLoading',
        'selectTemporaryPermissions', 'selectInactivityTimeout',
        'selectLogoutWarningVisible', 'selectRefreshInProgress'
      ]
    },
    {
      from: '@/store/miscellaneous/selectors-context-aware',
      to: `@/lib/modules/${moduleName}/selectors`,
      selectors: ['selectSideBarOpened', 'selectSelectedTask']
    },
    {
      from: '@/store/redirects/selectors-context-aware',
      to: `@/lib/modules/${moduleName}/selectors`,
      selectors: ['selectRedirectIntent', 'selectRedirectIntentId']
    },
    {
      from: '@/store/notifications/selectors-context-aware',
      to: `@/lib/modules/${moduleName}/selectors`,
      selectors: ['selectNotifications', 'selectUnreadCount']
    }
  ];

  // Find all TypeScript files in module
  const files = await findTypeScriptFiles(targetDir);
  
  for (const file of files) {
    await replaceImportsInFile(file, importMappings, rootDir);
  }
}

async function replaceBuildModulePath(moduleName, targetDir, mountPath, rootDir) {
  // Find all TypeScript files in module
  const files = await findTypeScriptFiles(targetDir);
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let modified = false;
    
    // Replace buildModulePath function calls with hardcoded mount path
    // Pattern: buildModulePath(route) -> /task-management/route
    const buildModulePathRegex = /buildModulePath\((['"`])([^'"`]+)\1\)/g;
    
    content = content.replace(buildModulePathRegex, (match, quote, route) => {
      modified = true;
      const cleanRoute = route.startsWith('/') ? route : `/${route}`;
      return `"${mountPath}${cleanRoute}"`;
    });
    
    // Also replace the function definition if it exists
    content = content.replace(
      /export function buildModulePath\([^)]*\)\s*\{[^}]*return route\s*;?\s*\}/g,
      `export function buildModulePath(route: string): string { return "${mountPath}" + route; }`
    );
    
    // Replace useModuleNavigation() calls to pass the mount path
    // Pattern: const router = useModuleNavigation();
    content = content.replace(
      /const\s+(\w+)\s*=\s*useModuleNavigation\(\);?/g,
      (match, varName) => {
        modified = true;
        return `const ${varName} = useModuleNavigation("${mountPath}");`;
      }
    );
    
    // Also handle direct hook calls without const assignment
    content = content.replace(
      /useModuleNavigation\(\);/g,
      () => {
        modified = true;
        return `useModuleNavigation("${mountPath}");`;
      }
    );
    
    if (modified) {
      await fs.writeFile(file, content);
      console.log(`✅ Updated module navigation in: ${path.relative(rootDir, file)}`);
    }
  }
}

async function findTypeScriptFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await findTypeScriptFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function replaceImportsInFile(filePath, importMappings, rootDir) {
  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;
  
  for (const mapping of importMappings) {
    const { from, to, selectors } = mapping;
    
    // Replace import statements
    const importRegex = new RegExp(
      `import\\s*{([^}]+)}\\s*from\\s*["']${escapeRegExp(from)}["'];?`,
      'g'
    );
    
    content = content.replace(importRegex, (match, importList) => {
      // Check if any of the selectors are being imported
      const importedSelectors = importList.split(',').map(s => s.trim());
      const relevantSelectors = importedSelectors.filter(selector => 
        selectors.includes(selector)
      );
      
      if (relevantSelectors.length > 0) {
        modified = true;
        return `import { ${relevantSelectors.join(', ')} } from "${to}";`;
      }
      
      return match;
    });
  }
  
  if (modified) {
    await fs.writeFile(filePath, content);
    console.log(`✅ Updated imports in: ${path.relative(rootDir, filePath)}`);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function copyDir(src, dest, rootSrc = src) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check if we're at the root level of the module (comparing against the original rootSrc)
    const isRootLevel = src === rootSrc;
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, rootSrc);
    } else {
      // Skip certain files at the module root level
      if (isRootLevel) {
        const skipFiles = ['not-found.tsx', 'globals.css', 'providers.tsx'];
        if (skipFiles.includes(entry.name)) {
          console.log(`⏭️  Skipping ${entry.name} at module root`);
          continue;
        }
      }
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
  const modulesLibDir = path.join(rootDir, 'src/lib/modules');
  const registryPath = path.join(rootDir, 'src/lib/redux/registry.ts');

  // Read all module descriptors
  const moduleFiles = await fs.readdir(modulesLibDir);
  const modules = moduleFiles
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .map(f => f.replace('.ts', ''));

  const registryContent = `
// AUTO-GENERATED - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

import { combineReducers } from '@reduxjs/toolkit';
import { all, fork } from 'redux-saga/effects';

${modules.map(m => {
  const alias = m.replace(/-/g, '');
  return `import { moduleDescriptor as ${alias} } from '@/lib/modules/${m}';`;
}).join('\n')}

// Host slices
import { authReducer } from '@/store/auth/reducer';
import { miscReducer } from '@/store/miscellaneous/reducer';
import { redirectsReducer } from '@/store/redirects/reducer';
import { notificationsReducer } from '@/store/notifications/reducer';

// Host sagas
import { authSaga } from '@/store/auth/sagas';
import { notificationsSaga } from '@/store/notifications/sagas';
import { miscSaga } from '@/store/miscellaneous/sagas';

// Root reducer - combine all slices directly
export const rootReducer = combineReducers({
  auth: authReducer,
  miscellaneous: miscReducer,
  redirects: redirectsReducer,
  notifications: notificationsReducer,
${modules.map(m => {
  const alias = m.replace(/-/g, '');
  return `  ...${alias}.slices,`;
}).join('\n')}
});

// Host sagas
function* hostSagas() {
  yield all([
    fork(authSaga),
    fork(notificationsSaga),
    fork(miscSaga),
  ]);
}

// Module sagas
function* moduleSagas() {
  yield all([
${modules.map(m => {
  const alias = m.replace(/-/g, '');
  return `    ...${alias}.sagas.map(saga => fork(saga)),`;
}).join('\n')}
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
  const key = args[i].replace('--', '');
  params[key] = args[i + 1];
}

if (!params.repo || !params.tag || !params.name) {
  console.error('Usage: sync-module.mjs --repo <url> --tag <tag> --name <name>');
  process.exit(1);
}

syncModule(params);
