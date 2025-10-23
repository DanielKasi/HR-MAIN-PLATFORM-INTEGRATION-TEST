# Host Platform Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                HOST PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   MODULE A       │    │   MODULE B      │    │   MODULE C      │            │
│  │  (Task Mgmt)     │    │  (Accounting)   │    │  (HR System)   │            │
│  │                  │    │                 │    │                 │            │
│  │  ┌─────────────┐ │    │  ┌─────────────┐ │    │  ┌─────────────┐ │            │
│  │  │   Routes     │ │    │  │   Routes     │ │    │  │   Routes     │ │            │
│  │  │ /tasks/*     │ │    │  │ /accounting/*│ │    │  │ /hr/*        │ │            │
│  │  └─────────────┘ │    │  └─────────────┘ │    │  └─────────────┘ │            │
│  │                  │    │                 │    │                 │            │
│  │  ┌─────────────┐ │    │  ┌─────────────┐ │    │  ┌─────────────┐ │            │
│  │  │   Redux     │ │    │  │   Redux     │ │    │  │   Redux     │ │            │
│  │  │   Slices    │ │    │  │   Slices    │ │    │  │   Slices    │ │            │
│  │  └─────────────┘ │    │  └─────────────┘ │    │  └─────────────┘ │            │
│  │                  │    │                 │    │                 │            │
│  │  ┌─────────────┐ │    │  ┌─────────────┐ │    │  ┌─────────────┐ │            │
│  │  │   Sagas     │ │    │  │   Sagas     │ │    │  │   Sagas     │ │            │
│  │  └─────────────┘ │    │  └─────────────┘ │    │  └─────────────┘ │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│           │                       │                       │                    │
│           └───────────────────────┼───────────────────────┘                    │
│                                   │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        PLATFORM API (v1)                               │    │
│  │                                                                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │    │
│  │  │    Auth     │  │     API     │  │ Components  │  │   Utils     │    │    │
│  │  │             │  │             │  │             │  │             │    │    │
│  │  │ • Selectors │  │ • Client    │  │ • UI        │  │ • Helpers   │    │    │
│  │  │ • Actions   │  │ • Headers   │  │ • Forms     │  │ • Format    │    │    │
│  │  │ • Types     │  │ • URLs      │  │ • Layout    │  │ • Validate  │    │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                   │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        HOST INFRASTRUCTURE                              │    │
│  │                                                                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │    │
│  │  │   Redux     │  │   Router    │  │   Build     │  │    CI/CD    │    │    │
│  │  │   Store     │  │             │  │   Tools     │  │             │    │    │
│  │  │             │  │             │  │             │  │             │    │    │
│  │  │ • Combined  │  │ • Next.js   │  │ • Sync      │  │ • Auto-sync │    │    │
│  │  │ • Sagas     │  │ • App       │  │ • Validate  │  │ • PRs       │    │    │
│  │  │ • Persist   │  │ • Router    │  │ • Registry  │  │ • Tests     │    │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYNC PROCESS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Module Repository  ──┐                                                        │
│                       │                                                        │
│                       ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    SYNC SCRIPT                                         │    │
│  │                                                                         │    │
│  │  1. Clone module repo at specific tag                                   │    │
│  │  2. Validate module.json                                                │    │
│  │  3. Check platform compatibility                                       │    │
│  │  4. Copy src/app/* to host/src/app/<module-name>/                      │    │
│  │  5. Copy module descriptor to src/lib/modules/                         │    │
│  │  6. Update module metadata in modules/                                  │    │
│  │  7. Update modules.lock.json                                           │    │
│  │  8. Generate Redux registry                                            │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                       │                                                        │
│                       ▼                                                        │
│  Host Platform  ──────┘                                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ROUTING STRUCTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Host Domain: https://yourdomain.com                                            │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   HOST ROUTES   │    │  MODULE ROUTES  │    │  MODULE ROUTES  │            │
│  │                 │    │   (Task Mgmt)   │    │  (Accounting)   │            │
│  │  /              │    │                 │    │                 │            │
│  │  /dashboard     │    │  /tasks         │    │  /accounting    │            │
│  │  /settings      │    │  /tasks/projects│    │  /accounting/inv │            │
│  │  /profile       │    │  /tasks/users   │    │  /accounting/led│            │
│  │  /login         │    │  /tasks/admin   │    │  /accounting/rpt│            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
│  All routes served from single Next.js application                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            STATE MANAGEMENT                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        REDUX STORE                                      │    │
│  │                                                                         │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │    │
│  │  │   HOST SLICES   │  │  MODULE SLICES  │  │  MODULE SLICES  │        │    │
│  │  │                 │  │   (Task Mgmt)  │  │  (Accounting)   │        │    │
│  │  │ • auth          │  │                 │  │                 │        │    │
│  │  │ • misc          │  │ • taskAuth      │  │ • accAuth       │        │    │
│  │  │ • redirects     │  │ • taskMisc      │  │ • accMisc       │        │    │
│  │  │ • notifications │  │ • taskProjects │  │ • accInvoices   │        │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │    │
│  │                                                                         │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │    │
│  │  │   HOST SAGAS    │  │  MODULE SAGAS   │  │  MODULE SAGAS   │        │    │
│  │  │                 │  │   (Task Mgmt)  │  │  (Accounting)   │        │    │
│  │  │ • authSaga      │  │                 │  │                 │        │    │
│  │  │ • notifSaga     │  │ • taskSaga      │  │ • accSaga       │        │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  All slices and sagas combined into single Redux store                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Architecture Principles

### 1. Build-Time Composition

- Modules are **copied** into host at build time
- **No runtime loading** complexity
- **Full SSR support** maintained
- **Single optimized bundle** for production

### 2. Namespaced State Management

- Host slices: `auth`, `misc`, `redirects`, `notifications`
- Module slices: `taskAuth`, `taskMisc`, `accAuth`, `accMisc`
- **No naming conflicts** between modules

### 3. Unified Routing

- All routes served from **single Next.js application**
- Module routes prefixed with mount path
- **No subdomain/CORS issues**

### 4. Shared Platform API

- **Versioned API surface** (`@/platform/v1`)
- **Consistent interfaces** across modules
- **Type-safe composition**

### 5. Automated Integration

- **Sync scripts** for module integration
- **Route validation** to prevent conflicts
- **CI/CD automation** for seamless updates

## Benefits

✅ **Independent Development** - Modules in separate repos  
✅ **Same Domain Deployment** - No subdomain/CORS issues  
✅ **Type-Safe Composition** - Build-time integration  
✅ **Shared Infrastructure** - Auth, UI, state management  
✅ **Standalone Testing** - Each module works independently  
✅ **Incremental Adoption** - Add modules gradually  
✅ **Performance** - Single optimized bundle  
✅ **Maintainability** - Clear separation of concerns
