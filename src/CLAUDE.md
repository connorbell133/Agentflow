# Chat Platform Source Code

Enterprise AI chat management platform built with Next.js 14, TypeScript, and PostgreSQL.

## Architecture Overview

See @../README.md for product overview
See @../package.json for available scripts and dependencies

### Core Directories
See @app/CLAUDE.md for Next.js app router structure  
See @components/CLAUDE.md for React component library
See @db/CLAUDE.md for database schema and ORM
See @actions/CLAUDE.md for server-side mutations
See @hooks/CLAUDE.md for React custom hooks
See @lib/CLAUDE.md for utility libraries
See @types/CLAUDE.md for TypeScript definitions
See @utils/CLAUDE.md for helper functions

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless component primitives
- **Framer Motion** - Animations

### Backend
- **PostgreSQL** - Primary database (via Supabase)
- **Supabase** - Database client with RLS
- **Clerk** - Authentication and user management
- **Upstash** - Redis for rate limiting
- **Server Actions** - Data mutations

### AI Integration
- **OpenAI API** - GPT models
- **Anthropic API** - Claude models
- **Custom providers** - Extensible model system

## Project Structure
```
src/
├── app/              # Next.js app router pages
│   ├── (auth)/      # Authentication pages
│   ├── admin/       # Admin dashboard
│   ├── api/         # API routes
│   └── flow/        # Main chat interface
├── components/       # React components
│   ├── ui/          # Base UI components
│   ├── common/      # Shared components
│   ├── features/    # Feature-specific
│   └── layout/      # Layout components
├── db/              # Database layer (see supabase/migrations/)
├── actions/         # Server actions
├── hooks/           # Custom React hooks
├── lib/             # Core libraries
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Set up database
npm run db:push

# Run development server
npm run dev
```

### Common Tasks
```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Run production server

# Database (Supabase)
supabase migration new <name>  # Create migration
npm run db:reset               # Reset local database  
npm run db:push                # Push to remote
npm run db:types               # Generate types
npm run db:studio              # Open Supabase Studio
npm run db:seed                # Seed test data

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Code Quality
npm run lint           # ESLint
npm run lint:fix       # Fix linting issues
npm run type-check     # TypeScript check
```

## Key Patterns

### Authentication
```typescript
import { auth } from '@clerk/nextjs';

// In server components/actions
const { userId, org_id } = auth();
if (!userId) throw new Error('Unauthorized');

// In client components
import { useAuth } from '@/hooks/auth/useAuth';
const { user, isAuthenticated } = useAuth();
```

### Data Fetching
```typescript
// Server Components
async function Page() {
  const data = await db.query.users.findMany();
  return <UserList users={data} />;
}

// Client Components with SWR
function ClientComponent() {
  const { data, loading } = useSWR('/api/data', fetcher);
}
```

### Form Handling
```typescript
// With Server Actions
<form action={serverAction}>
  <input name="field" />
  <SubmitButton />
</form>

// With React Hook Form
const { register, handleSubmit } = useForm();
```

### Error Handling
```typescript
// Error boundaries for components
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>

// Try-catch in server actions
try {
  await riskyOperation();
} catch (error) {
  return { error: error.message };
}
```

## Security Practices

### Authentication & Authorization
- All routes protected by Clerk middleware
- Role-based access control (RBAC)
- Organization-scoped data access
- API key encryption at rest

### Data Protection
- Input validation with Zod
- SQL injection prevention via parameterized queries
- XSS protection with DOMPurify
- CSRF protection built-in

### Rate Limiting
```typescript
import { rateLimit } from '@/lib/rate-limit';

const { success } = await rateLimit.check(userId);
if (!success) throw new Error('Rate limited');
```

## Performance Optimization

### Frontend
- React component memoization
- Dynamic imports for code splitting
- Image optimization with next/image
- Font optimization
- Bundle analysis

### Backend
- Database query optimization
- Response caching
- Connection pooling
- Background job processing

### Monitoring
- Error tracking with Sentry
- Performance monitoring
- Custom metrics tracking
- Health check endpoints

## Environment Configuration
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # Local dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Security
CRON_SECRET=your_random_32_char_string

# AI Models (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Feature Flags
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_FILES=true
```

## Deployment

### Production Build
```bash
# Build application
npm run build

# Run production server
npm run start
```

### Docker Support
```bash
# Build image
docker build -t chat-platform .

# Run container
docker run -p 3000:3000 chat-platform
```

## Contributing
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Run linting before commits
- Use conventional commits

## Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev

# Database query logging
DATABASE_LOG_QUERIES=true npm run dev

# Performance profiling
npm run build -- --profile
```