# Development Documentation

Internal documentation for developers working on AgentFlow.

---

## Overview

This directory contains technical specifications, implementation guides, and development resources for contributing to AgentFlow.

**For users getting started, see:**
- [Getting Started Guides](../getting-started/) - Installation and setup
- [User Guides](../guides/) - Using AgentFlow features
- [Main README](../../README.md) - Product overview

---

## Development Guides

### Architecture & Implementation

**[RLS Implementation Guide](./RLS_IMPLEMENTATION_GUIDE.md)**
- Complete Row-Level Security implementation
- Database policies and patterns
- Security architecture
- Best practices for multi-tenant data isolation

**[RLS Query Guide](./RLS_QUERY_GUIDE.md)**
- Using RLS-protected queries in code
- Server actions and API routes
- Client components with RLS
- Performance optimization

**[Model Config Import/Export](./MODEL_CONFIG_IMPORT_EXPORT.md)**
- YAML configuration system
- Import/export functionality
- Validation and schema
- API integration

---

### Testing & Quality

**[Testing Strategy](./TESTING_STRATEGY.md)**
- Testing approach and philosophy
- Unit, integration, and E2E tests
- Test coverage requirements
- CI/CD integration

**[Test Documentation](./TEST_DOCUMENTATION.md)**
- Writing effective tests
- Test patterns and examples
- Mocking and fixtures
- Running tests locally

---

### Performance & Security

**[Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)**
- Database query optimization
- Caching strategies
- Frontend performance
- Monitoring and profiling

**[Security Audit Summary](./SECURITY_AUDIT_SUMMARY.md)**
- Security audit findings
- Vulnerability assessments
- Remediation status
- Security best practices

---

## Quick Reference

### Setting Up Development Environment

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Run development server
npm run dev
```

### Common Development Tasks

```bash
# Database
supabase migration new <name>  # Create migration
supabase db reset              # Reset local DB
supabase db push               # Push to remote
supabase db types              # Generate types

# Testing
npm test                       # Run all tests
npm run test:watch            # Watch mode
npm run test:e2e              # E2E tests
npm run test:coverage         # Coverage report

# Code Quality
npm run lint                  # ESLint
npm run lint:fix              # Fix issues
npm run type-check            # TypeScript check
```

---

## Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18 (Server Components)
- TypeScript
- Tailwind CSS

**Backend:**
- PostgreSQL (via Supabase)
- Clerk (Authentication)
- Row-Level Security (RLS)
- Server Actions

**Infrastructure:**
- Supabase (Database & RLS)
- Vercel (Deployment)
- Upstash (Rate limiting)

### Key Directories

```
src/
├── app/              # Next.js pages (App Router)
├── components/       # React components
├── actions/          # Server actions
├── lib/              # Core libraries
├── hooks/            # React hooks
└── utils/            # Utilities

docs/
├── getting-started/  # User onboarding
├── guides/           # User guides
└── development/      # Dev docs (you are here)
```

---

## Contributing

### Before You Start

1. Read [CONTRIBUTING.md](../../CONTRIBUTING.md)
2. Review [RLS Implementation Guide](./RLS_IMPLEMENTATION_GUIDE.md)
3. Check [Testing Strategy](./TESTING_STRATEGY.md)
4. Sign the [CLA](../../CLA.md)

### Development Workflow

1. **Create branch:** `git checkout -b feature/your-feature`
2. **Make changes:** Follow coding standards
3. **Write tests:** Maintain 80%+ coverage
4. **Update docs:** Keep documentation current
5. **Submit PR:** Include description and tests
6. **Sign CLA:** Automated bot will guide you

### Code Standards

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- 80%+ test coverage
- RLS-protected queries

---

## Documentation Structure

**User Documentation:**
- `/getting-started/` - Installation and onboarding
- `/guides/` - Feature guides and tutorials
- Root docs - Product overview (WHY_AGENTFLOW.md, USE_CASES.md, FEATURES.md)

**Developer Documentation:**
- `/development/` - This directory
- `CLAUDE.md` files - In-code context for AI assistance
- Inline code comments - Complex logic explained

**API Documentation:**
- Coming soon: OpenAPI/Swagger docs

---

## Need Help?

**Internal Resources:**
- Read existing code and CLAUDE.md files
- Check PR history for context
- Review test files for examples

**External Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [GitHub Discussions](https://github.com/your-org/chat-platform/discussions)

**Ask Questions:**
- Open an issue for bugs
- Use discussions for questions
- Reach out in team channels

---

## Roadmap

See [FEATURES.md](../FEATURES.md) for planned features and current status.

**Current priorities:**
- Analytics and usage tracking
- Multimedia support (files, voice, images)
- Advanced collaboration features
- Mobile applications

---

**Happy coding!** 🚀
