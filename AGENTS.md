# AGENTS.md - HR-BAIFAM Development Guide

## Commands
- **Backend (Django)**: `cd backend && python manage.py runserver` (dev server), `python manage.py test` (all tests), `python manage.py test <app_name>` (single app tests)
- **Frontend (Next.js)**: `cd frontend && npm run dev` (dev), `npm run build` (build), `npm run eslint` (lint), `npm run format` (format)
- **Portal (Next.js)**: `cd portal && npm run dev` (dev), `npm run build` (build), `npm run lint` (lint)
- **Backend setup**: `python manage.py migrate`, `python manage.py load_schema_embeddings`, `celery -A core worker -l info`

## Architecture
- **Multi-app structure**: Django backend with HR modules (employee, recruitment, payroll, leave_mgt, training, etc.)
- **Frontend stack**: Next.js 15 with TypeScript, React 19, Tailwind CSS, Redux Toolkit, React Query
- **Database**: PostgreSQL with PostGIS and pgvector extensions for spatial and AI features
- **Services**: Redis for caching, Celery for async tasks, Channels for WebSocket support

## Code Style
- **Django backend**: Uses Black formatting, follows Django conventions with apps in dedicated folders
- **Frontend**: 2-space indentation, Prettier + ESLint with import ordering, no console logs in production
- **TypeScript**: Strict typing, unused imports cleaned automatically, object curly spacing disabled
- **Imports**: Ordered by type/builtin/external/internal with newlines between groups
- **React**: Self-closing components, sorted props (callbacks last, shorthand first)
