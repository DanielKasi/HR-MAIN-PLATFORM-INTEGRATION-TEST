#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function validateRoutes() {
  const modulesDir = path.join(process.cwd(), 'modules');
  
  try {
    const files = await fs.readdir(modulesDir);
  } catch (err) {
    console.log('ℹ️  No modules directory found - skipping route validation');
    return;
  }
  
  const files = await fs.readdir(modulesDir);
  const routes = new Map();
  const conflicts = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const content = await fs.readFile(
      path.join(modulesDir, file),
      'utf-8'
    );
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
    console.error('\n❌ Route conflicts detected:\n');
    conflicts.forEach(c => {
      console.error(`  ${c.route}: ${c.modules.join(', ')}`);
    });
    process.exit(1);
  }

  console.log('✅ No route conflicts found');
}

validateRoutes();
