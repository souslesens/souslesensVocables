# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SousLesensVocables (SLSV) is a semantic web application for managing Thesaurus and Ontologies through SKOS, OWL, and RDF standards with graph visualization. It's a full-stack application with an Express backend, React frontend, and integration with triple stores (Virtuoso/SPARQL), ElasticSearch, and various external services.

## Development Commands

### Server Operations
```bash
npm start                    # Start production server (port 3010 by default)
npm run dev:server          # Start development server with nodemon
npm run dev:fullstack       # Start both backend and frontend in watch mode
```

### Frontend Development
```bash
npm run mainapp:build       # Build React app (outputs to mainapp/static)
npm run mainapp:watch       # Build React app in watch mode (development)
npm run mainapp:dev         # Start Vite dev server with HMR
```

### Code Quality
```bash
npm run prettier:check      # Check code formatting
npm run prettier:write      # Format code with Prettier
npm test                    # Run Jest tests (alias for npm run test:jest)
npm run test:jest           # Run all Jest tests with coverage
npm run tools:eslint        # Lint TypeScript/React code in mainapp/src
npm run tools:tsc           # Run TypeScript compiler checks
```

### Database
```bash
npm run migrate             # Run database migrations (uses scripts/run-migrations.sh)
```

### Versioning
```bash
npm run release:patch       # Create patch version (x.x.X)
npm run release:minor       # Create minor version (x.X.0)
npm run release:major       # Create major version (X.0.0)
npm publish:release         # Publish new release (runs release-new.sh)
```

## Architecture

### Backend Structure

**Entry Point**: `bin/www` → `app.js`

**Core Components**:
- `app.js`: Express application setup, authentication (Passport), OpenAPI integration, middleware configuration
- `bin/`: Server-side utilities and controllers (authentication, config management, KG triple building, source management, SPARQL utilities, user management)
- `model/`: Data models and business logic (config, databases, profiles, sources, tools, users, userData, rdfData)
- `api/v1/`: OpenAPI-based REST API endpoints organized by domain (admin, annotator, auth, databases, graphStore, kg, sources, sparql, users)

**Key Services**:
- `bin/configManager..js`: Configuration file management
- `bin/authentication..js`: Passport strategies (local, keycloak, auth0)
- `bin/KGtripleBuilder..js`: Knowledge graph triple building (76KB file - complex RDF/OWL processing)
- `bin/OntologyModel..js`: calculate ontologies models for resuming ontologies ressouces, the calculation is done on client side and the result is stored via ontologyModel server and API to not calculate it each time
- `bin/elasticRestProxy..js`: ElasticSearch proxy with authentication
- `bin/userRequestFiltering..js`: User request for sparql filtering and authorization

**Data Models** (in `model/`):
- Configuration stored in JSON files under `config/` directory (mainConfig.json, sources.json, profiles.json, users/users.json, databases.json)
- Uses Zod for configuration validation (see `model/config.js`)
- User data can be stored in either database or file system (configured via `userData.location`)

**Authentication**:
- Supports multiple auth methods: local, database, keycloak, auth0, or disabled
- Two-tier authorization: `restrictLoggedUser` (any authenticated user) and `restrictAdmin` (admin group members)
- Session-based with configurable cookie settings

### Frontend Structure

**Technology**: React + TypeScript + Vite --> for asset 
other in javascript + jquery

**Build Output**: `mainapp/static/` (served as static files)
Minority of the frontend 
**Main Entry Points** (see `mainapp/vite.config.js`):
- `index.tsx`: Main admin interface
- `graph-management.tsx`: Graph visualization and management
- `kg-upload-app.tsx`: Knowledge graph upload
- `user-management.tsx`: User administration
- `mappingModeler-upload-app.tsx`: Mapping model uploads
- Various modal components (EditSourceDialog, UploadGraphModal, etc.)

**Static Assets**:
- `public/vocables/`:  JavaScript modules, tools, and UI components most of the code used in the frontend and core
- `public/vocables/modules/`: Modular tool components
- `mainapp/static/`: Built React application

### API Structure

**API Documentation**: OpenAPI/Swagger UI available at `/api/v1`

**API Specification**: `api/v1/api-doc.js` defines all schemas and security definitions

**API Tags** (domains):
- Annotate, Authentication, Axiom, Config, Data, Databases
- ElasticSearch, Graph, JOWL, KG, Logs, Misc
- Ontology, Plugins, Profiles, RDF, Sources, Sparql, Tools, UserData, Users

**Route Pattern**: `api/v1/paths/{domain}/{resource}.js` or `api/v1/paths/{domain}/{resource}/{id}/{action}.js`

### Configuration System

**Main Config**: `config/mainConfig.json` (validated with Zod schema in `model/config.js`)

**Key Configuration Files**:
- `config/mainConfig.json`: Server URL, ports, auth settings, external services (SPARQL, ElasticSearch, JOWL, etc.)
- `config/sources.json`: RDF/OWL data sources with SPARQL endpoints
- `config/profiles.json`: User profiles defining permissions for sources and tools
- `config/users/users.json`: User accounts (when auth is local/file-based)
- `config/databases.json`: External database connections

**Environment Variables**:
- `CONFIG_PATH`: Configuration directory (default: "config")
- `PLUGINS_PATH`: Plugins directory (default: "plugins")
- `NODE_ENV`: Environment mode (development/production)

### Database & Triple Store

**Triple Store**: Virtuoso or any SPARQL 1.1 endpoint
- Configured via `mainConfig.json` → `sparql_server`
- Graph operations in `bin/graphStore..js` and `model/rdfData.js`
- SPARQL proxy at `api/v1/paths/sparqlProxy.js`

**Relational Database**: Optional (PostgreSQL, MySQL, MSSQL, SQLite)
- Managed via Knex.js (`model/databases.js`)
- Used for user data storage when `userData.location` is "database"

**ElasticSearch**: Optional indexing service
- Configured via `mainConfig.json` → `ElasticSearch`
- Proxy in `bin/elasticRestProxy..js`

### Plugin System

**Plugin Directory**: `plugins/` (empty by default)

**Plugin Configuration**:
- `config/plugins.json`: Plugin repository definitions
- `config/pluginsConfig.json`: Plugin-specific configuration
- Plugins are served at `/plugins/:plugin/*` with user authorization checks

**Plugin Access Control**: Checked against user profile's `allowedTools`

### Key Architectural Patterns

**Source Management**:
- Sources represent RDF/OWL datasets with a graphUri and sparql_server endpoint
- Each source has: controller (e.g., "Sparql_OWL"), schemaType (e.g., "OWL", "SKOS"), color, editability, group, predicates
- Sources can be "blended" (combined) - see `model/blenderSources.js`

**User Data System**:
- Flexible storage: database or file-based JSON
- Supports sharing between users and profiles
- Data types include: saved queries, graph configurations, annotations, etc.
- API at `api/v1/paths/users/data/`

**Profile-Based Authorization**:
- Profiles define: allowedSources, forbiddenSources, allowedTools, allowedSourceSchemas
- Users belong to groups (e.g., "admin")
- Resolved in `model/profiles.js`

**Graph Visualization**:
- Uses vis.js/vis-network library for interactive graph rendering
- Graph state managed through `public/vocables/modules/` JavaScript modules

## Testing

**Test Framework**: Jest

**Test Location**: `tests/` directory (mirroring `model/` structure)

**Run Single Test File**:
```bash
npx jest tests/model.users.test.js
```

**Coverage**: Generated in `tests/` directory after running `npm run test:jest`

## Git Workflow

**Main Branch**: `master`

**Branch Strategy**: Feature branches from master (see CONTRIBUTING.md)
1. Create feature branch from master: `git checkout -b feature/my-feature`
2. Make small, focused commits
3. Rebase to master HEAD before PR: `git rebase master`
4. Create PR against master
5. Merge with "Rebase and merge" for linear history

**Pre-commit Hook**: Prettier formatting check runs automatically

## Common Pitfalls

**Double Dots in Filenames**: Many JavaScript files in `bin/` use `..js` extension (e.g., `util..js`, `configManager..js`) - this is intentional convention in this codebase.

**Configuration Validation**: Changes to `config/mainConfig.json` must pass Zod validation defined in `model/config.js`. Run the server to validate.

**API Security**: All API endpoints should use either `restrictLoggedUser` or `restrictAdmin` security handlers unless specifically public.

**Frontend Build**: After modifying React components, run `npm run mainapp:build` or use watch mode. The built files in `mainapp/static/` are what gets served.

**SPARQL Server URL**: Two URLs needed: `souslesensUrl` (public-facing) and `souslesensUrlForVirtuoso` (internal, for when SLSV needs to access itself from within the server).

## Documentation

- Main docs: https://souslesens.github.io/souslesensVocables/
- Technical design: http://souslesens.org/index.php/documentation
- Videos: http://souslesens.org/index.php/videos/
- Glossary: http://souslesens.org/index.php/slsv-glossary/
