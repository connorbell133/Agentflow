# Chat Platform - AI Chat Management System

Enterprise-grade platform for managing AI-powered conversations at scale.

## Project Overview
See @README.md for detailed product information
See @package.json for scripts and dependencies
See @src/CLAUDE.md for source code architecture

## Quick Start
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Setup database (Local Development)
supabase start               # Start local Supabase
supabase db reset            # Apply migrations

# Setup database (Production)
supabase link --project-ref your-project-ref
supabase db push             # Push migrations to remote

# Start development
npm run dev

# Run tests
npm test
```

## Project Structure
```
chat_platform/
├── src/              # Source code (@src/CLAUDE.md)
├── public/           # Static assets
├── docs/             # Documentation (@docs/CLAUDE.md)
├── tools/            # Development tools (@tools/CLAUDE.md)
├── .env.example      # Environment template
├── package.json      # Dependencies & scripts
└── README.md         # Product overview
```

## Key Technologies
- **Next.js 14** - Full-stack React framework
- **TypeScript** - Type safety throughout
- **PostgreSQL** - Relational database (via Supabase)
- **Supabase** - Database, auth, and real-time subscriptions
- **Clerk** - Authentication & user management
- **Tailwind CSS** - Utility-first styling
- **Row-Level Security (RLS)** - Centralized authorization system

## Development Commands
```bash
# Core Development
npm run dev                  # Start dev server (port 3000)
npm run build               # Production build
npm run start               # Production server
npm run type-check          # TypeScript validation
npm run lint                # ESLint checks
npm run lint:fix            # Auto-fix issues

# Database Management (Supabase)
supabase migration new <name>  # Create new migration
npm run db:reset               # Reset local database
npm run db:push                # Push migrations to remote
npm run db:pull                # Pull schema from remote
npm run db:types               # Generate TypeScript types
npm run db:studio              # Open Supabase Studio
npm run db:seed                # Seed test data

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:ui           # Test UI components

# Utilities
npm run clean:cache        # Clear Next.js cache
npm run analyze           # Bundle analysis
npm run tunnel            # Webhook tunnel (dev)
```

## Architecture Principles

### Multi-Tenant Design
- Organization-based data isolation
- **Row-Level Security (RLS)**: Centralized authorization with database-agnostic tenant isolation
- Scalable permission system with role-based access control
- Complete audit trail for all data access

### Security First
- **RLS-Protected Database Access**: All queries automatically filtered by tenant
- Authentication required on all routes
- Input validation on every endpoint
- Encrypted sensitive data storage
- Rate limiting on API calls
- Comprehensive audit logging

### Performance Optimized
- Server-side rendering where appropriate
- Optimistic UI updates
- Efficient database queries
- Response caching strategies

### Developer Experience
- Full TypeScript coverage
- Comprehensive error messages
- Hot module replacement
- Detailed logging in development

## Code Organization Conventions

### Directory Structure Philosophy
We follow a **feature-first** organization pattern with clear separation of concerns:

```
src/
├── app/              # Next.js App Router - routing only
├── components/
│   ├── ui/          # Design system primitives
│   ├── shared/      # Reusable cross-feature components
│   ├── features/    # Feature-specific components
│   └── layout/      # Page structure components
├── lib/             # Core infrastructure & integrations
├── utils/           # Pure utility functions
├── actions/         # Server actions (mutations)
├── hooks/           # React custom hooks
└── types/           # Shared TypeScript types
```

### lib/ vs utils/ vs helpers/
- **`lib/`** - Core infrastructure, third-party integrations, complex business logic
  - Examples: Database clients, auth providers, AI integrations
  - Typically has side effects or external dependencies

- **`utils/`** - Pure functions, formatters, validators
  - Examples: Date formatting, string manipulation, data transformation
  - Should be side-effect free and easily testable
  - Organized by domain: `formatters/`, `validators/`, `parsers/`

- **No `helpers/` directory** - Avoid generic catch-all folders
  - Name by domain instead (formatters, validators, parsers)

### Component Organization
- **`components/ui/`** - Design system primitives (Button, Input, Dialog)
- **`components/shared/`** - Reusable composite components (BaseTable, EmptyState)
- **`components/features/`** - Feature-specific components with business logic
- **`components/layout/`** - Page structure components (Header, Sidebar, Layout)

### Colocation Principles
Keep related files together:
```
ComponentName/
  ├── ComponentName.tsx        # Component implementation
  ├── ComponentName.types.ts   # TypeScript types
  ├── ComponentName.test.tsx   # Unit tests
  └── index.ts                 # Optional barrel file
```

### Testing Strategy
- **Unit tests**: Colocated with source files (`Component.test.tsx`)
- **E2E tests**: Kept in `/tests/e2e/` directory
- **Test utilities**: In `/tests/utils/` for shared helpers

## Environment Setup

### Required Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # Local dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Security
CRON_SECRET=your_random_32_char_string

# AI Providers (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional Services
SENTRY_DSN=https://...
```

### Feature Flags
```env
# Enable/disable features
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_FILES=true
NEXT_PUBLIC_ENABLE_MARKDOWN=true
```

## Row-Level Security (RLS) System

### Overview
The platform implements a comprehensive Row-Level Security system that provides centralized, database-agnostic authorization for all database operations.

### Key Components
- **`src/middleware/rls/`** - Core RLS infrastructure
- **`src/middleware/rls/tables/`** - Table-specific security rules
- **`src/hooks/useRLS.ts`** - React hook for client-side permissions

### Usage Patterns

#### API Routes
```typescript
import { withRLS, getRLSQuery } from '@/middleware/rls';

export const GET = withRLS(
  { tableName: 'conversations', action: Action.LIST },
  async (req) => {
    const rlsQuery = await getRLSQuery('conversations');
    const data = await rlsQuery.findMany(conversations);
    return NextResponse.json({ data });
  }
);
```

#### Server Actions
```typescript
import { getRLSQuery } from '@/middleware/rls';

export async function getConversations() {
  const rlsQuery = await getRLSQuery('conversations');
  return await rlsQuery.findMany(conversations);
}
```

#### React Components
```tsx
import { RLSGuard, Action } from '@/hooks/useRLS';

<RLSGuard tableName="conversations" action={Action.READ}>
  <ProtectedContent />
</RLSGuard>
```

### Security Benefits
- **Tenant Isolation**: Automatic organization-based data filtering
- **Performance**: < 5ms overhead with intelligent caching
- **Audit Trail**: Complete logging of all access attempts
- **Type Safety**: Full TypeScript support with compile-time checks

## Common Workflows

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/name`
2. Add components in `src/components/features/`
3. Add server actions in `src/actions/` (use RLS patterns)
4. Add API routes if needed in `src/app/api/` (wrap with RLS)
5. Write tests alongside implementation
6. Update relevant CLAUDE.md files

### Debugging Issues
1. Check browser console for client errors
2. Check terminal for server errors
3. Enable debug logging: `DEBUG=* npm run dev`
4. Use React DevTools for component inspection
5. Check database with `npm run db:studio`

### Performance Optimization
1. Run bundle analyzer: `npm run analyze`
2. Check React DevTools Profiler
3. Monitor database queries in logs
4. Use Chrome DevTools Performance tab
5. Review Vercel Analytics (production)

## Testing Strategy
- Unit tests for utilities and hooks
- Component tests with React Testing Library
- API route tests with supertest
- E2E tests with Playwright (coming soon)
- Minimum 80% code coverage target

## Deployment
- Automatic deployments via GitHub Actions
- Preview deployments for pull requests
- Production deployment on merge to main
- Database migrations run automatically
- Environment variables managed in Vercel

## Security Considerations
- Never commit `.env` files
- Use environment variables for all secrets
- Follow OWASP guidelines
- Regular dependency updates
- Security headers configured

## Getting Help
- Check existing documentation in `/docs` - [Complete Documentation Index](./docs/README.md)
- Review RLS implementation in [RLS Implementation Guide](./docs/RLS_IMPLEMENTATION_GUIDE.md)
- Check security details in [Security Audit Summary](./docs/SECURITY_AUDIT_SUMMARY.md)
- Review performance best practices in [Performance Optimization Guide](./docs/PERFORMANCE_OPTIMIZATION_GUIDE.md)
- Search issues on GitHub
- Ask in team Slack channel
- Schedule pairing session

## Code Style
- Prettier for formatting (automatic)
- ESLint for code quality
- TypeScript strict mode enabled
- Conventional commits required
- PR reviews required before merge

Remember: When in doubt, prioritize security, then user experience, then developer experience.