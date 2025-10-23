# Host Platform Quick Reference

> **Quick commands and common tasks for host platform management**

## Essential Commands

### Module Management

```bash
# Sync a module
npm run sync-module -- --repo <url> --tag <version> --name <module-name>

# Validate routes
npm run validate-routes

# Validate all modules
npm run validate-modules
```

### Development

```bash
# Start development server
npm run dev

# Type check
npm run type-check

# Build
npm run build

# Lint
npm run lint
```

### Module Sync Examples

```bash
# Sync task management module
npm run sync-module -- --repo "https://github.com/yourorg/task-management" --tag "v1.0.0" --name "tasks"

# Sync accounting module
npm run sync-module -- --repo "https://github.com/yourorg/accounting" --tag "v2.1.0" --name "accounting"

# Sync HR module
npm run sync-module -- --repo "https://github.com/yourorg/hr-system" --tag "v1.5.0" --name "hr"
```

## File Structure

```
host-platform/
├── src/
│   ├── platform/v1/          # Platform API
│   │   ├── auth/             # Auth utilities
│   │   ├── api/              # API client
│   │   ├── components/       # UI components
│   │   ├── config/           # Configuration
│   │   ├── types/            # Type definitions
│   │   └── utils/            # Utility functions
│   ├── app/                  # Host app routes
│   │   ├── tasks/            # Synced module
│   │   ├── accounting/       # Synced module
│   │   └── layout.tsx        # Host layout
│   ├── lib/
│   │   ├── modules/          # Module descriptors
│   │   │   ├── tasks.ts
│   │   │   └── accounting.ts
│   │   └── redux/
│   │       └── registry.ts   # Generated store config
│   └── components/           # Shared components
├── modules/                  # Module metadata
│   ├── tasks.json
│   └── accounting.json
├── scripts/
│   ├── sync-module.mjs       # Module syncing
│   └── validate-routes.mjs   # Route validation
├── modules.lock.json         # Version lockfile
└── package.json
```

## Common Tasks

### Adding a New Module

1. **Get module info**: Repository URL, version tag, module name
2. **Sync module**: `npm run sync-module -- --repo <url> --tag <version> --name <name>`
3. **Validate**: `npm run validate-routes`
4. **Test**: `npm run dev` and verify routes work
5. **Commit**: Add changes to git

### Updating a Module

1. **Check current version**: `cat modules.lock.json`
2. **Sync new version**: `npm run sync-module -- --repo <url> --tag <new-version> --name <name>`
3. **Validate**: `npm run validate-routes`
4. **Test**: Verify everything works
5. **Commit**: Update with new version

### Troubleshooting

#### Module not loading

```bash
# Check if module is synced
cat modules.lock.json | grep <module-name>

# Check routes
cat modules/<module-name>.json

# Check generated registry
cat src/lib/redux/registry.ts
```

#### Route conflicts

```bash
# Validate routes
npm run validate-routes

# Check module routes
cat modules/*.json | grep -A 10 "routes"
```

#### Build errors

```bash
# Type check
npm run type-check

# Check for missing dependencies
npm ls

# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production

# Optional
NEXT_PUBLIC_LOCALE=en-US
NEXT_PUBLIC_TIMEZONE=UTC
```

## GitHub Actions

### Manual Module Sync

```yaml
# Trigger: workflow_dispatch
# Inputs: module_name, module_tag, module_repo
# Action: Syncs module and creates PR
```

### Auto Sync (Webhook)

```yaml
# Trigger: repository_dispatch
# Event: module-release
# Action: Auto-syncs module on release
```

## Monitoring

### Key Metrics

- Module sync success rate
- Build success rate
- Route conflict frequency
- Bundle size impact
- Performance metrics

### Logs to Watch

- Module sync logs
- Build logs
- Route validation logs
- Type check results

## Best Practices

### Do's

✅ Use semantic versioning for modules  
✅ Test modules in standalone mode first  
✅ Validate routes after every sync  
✅ Keep platform API stable  
✅ Document breaking changes

### Don'ts

❌ Skip route validation  
❌ Sync untested modules  
❌ Break platform API without versioning  
❌ Ignore peer dependency warnings  
❌ Deploy without testing

## Emergency Procedures

### Rollback Module

```bash
# Sync to previous version
npm run sync-module -- --repo <url> --tag <previous-version> --name <name>

# Or remove module entirely
rm -rf src/app/<module-name>
rm -f src/lib/modules/<module-name>.ts
rm -f modules/<module-name>.json
# Update modules.lock.json manually
```

### Fix Route Conflicts

1. Identify conflicting routes
2. Adjust module mount paths
3. Re-sync affected modules
4. Validate routes

### Rebuild Everything

```bash
# Clean everything
rm -rf .next node_modules modules.lock.json

# Reinstall
npm install

# Re-sync all modules
# (Run sync commands for each module)

# Rebuild
npm run build
```

## Support

### Documentation

- [Full Migration Guide](./HOST_PLATFORM_MIGRATION_GUIDE.md)
- [Module Development Guide](./MODULE_README.md)
- [Platform API Documentation](./docs/platform-api.md)

### Common Issues

- Check troubleshooting section in main guide
- Review GitHub issues
- Contact platform team

### Getting Help

1. Check this quick reference
2. Review full migration guide
3. Check GitHub issues
4. Contact platform team
5. Create new issue if needed
