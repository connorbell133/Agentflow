# Documentation Index

Complete documentation for AgentFlow - AI Connection and Distribution Platform.

---

## 📖 User Documentation

### Getting Started

| Guide                                                   | Description                | Time   |
| ------------------------------------------------------- | -------------------------- | ------ |
| [Installation](./getting-started/INSTALLATION.md)       | Complete setup walkthrough | 30 min |
| [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md)         | Configure authentication   | 15 min |
| [First Endpoint](./getting-started/FIRST_ENDPOINT.md)   | Connect your first AI      | 15 min |
| [Troubleshooting](./getting-started/TROUBLESHOOTING.md) | Common issues and fixes    | -      |

### Feature Guides

| Guide                                                    | Description                      |
| -------------------------------------------------------- | -------------------------------- |
| [YAML Configuration](./guides/YAML_CONFIG.md)            | Complete configuration reference |
| [Access Control](./guides/ACCESS_CONTROL.md)             | Groups, roles, and permissions   |
| [Endpoint Integration](./guides/ENDPOINT_INTEGRATION.md) | Build compatible endpoints       |
| [Multi-Tenant Setup](./guides/MULTI_TENANT.md)           | Organization architecture        |

### Product Information

| Document                            | Description               |
| ----------------------------------- | ------------------------- |
| [Why AgentFlow](./WHY_AGENTFLOW.md) | Problem/solution overview |
| [Use Cases](./USE_CASES.md)         | Real-world scenarios      |
| [Features](./FEATURES.md)           | Complete feature list     |
| [Security](./SECURITY.md)           | Security policies         |

---

## 👨‍💻 Developer Documentation

### Development Guides

| Guide                                                                | Description                 |
| -------------------------------------------------------------------- | --------------------------- |
| [Development README](./development/README.md)                        | Developer quick start       |
| [RLS Implementation](./development/RLS_IMPLEMENTATION_GUIDE.md)      | Row-Level Security system   |
| [RLS Query Guide](./development/RLS_QUERY_GUIDE.md)                  | Database query patterns     |
| [Testing Strategy](./development/TESTING_STRATEGY.md)                | Testing approach            |
| [Performance Guide](./development/PERFORMANCE_OPTIMIZATION_GUIDE.md) | Optimization best practices |
| [Security Audit](./development/SECURITY_AUDIT_SUMMARY.md)            | Security audit results      |
| [Model Config](./development/MODEL_CONFIG_IMPORT_EXPORT.md)          | YAML import/export system   |

### Quick References

- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [CLA](../CLA.md) - Contributor License Agreement
- [Main README](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Development context

---

## 📋 Examples

### Configuration Examples

| Platform         | Configuration                                                            |
| ---------------- | ------------------------------------------------------------------------ |
| OpenAI GPT       | [openai-gpt-config.yaml](../examples/openai-gpt-config.yaml)             |
| Anthropic Claude | [anthropic-claude-config.yaml](../examples/anthropic-claude-config.yaml) |
| n8n Workflows    | [n8n-workflow-config.yaml](../examples/n8n-workflow-config.yaml)         |
| LangChain Agents | [langchain-agent-config.yaml](../examples/langchain-agent-config.yaml)   |
| Make.com         | [make-workflow-config.yaml](../examples/make-workflow-config.yaml)       |

See [Examples README](../examples/README.md) for detailed setup instructions.

---

## 🏗️ Architecture Overview

### Tech Stack

**Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
**Backend:** PostgreSQL (Supabase), Supabase Auth, Server Actions
**Infrastructure:** Supabase, Vercel, Row-Level Security

### Key Features

- **Multi-Tenant:** Complete organization-based data isolation via RLS
- **Access Control:** Group-based permissions with Owner/Admin/Guest roles
- **AI Connections:** Connect any HTTP endpoint with YAML config
- **Security:** Row-Level Security, encrypted credentials, audit trails
- **Performance:** < 5ms RLS overhead, intelligent caching

---

## 🚀 Quick Start

### For Users

1. Follow [Installation Guide](./getting-started/INSTALLATION.md)
2. Review [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md) (included in installation)
3. Connect [Your First Endpoint](./getting-started/FIRST_ENDPOINT.md)

### For Developers

1. Read [Development README](./development/README.md)
2. Review [RLS Implementation](./development/RLS_IMPLEMENTATION_GUIDE.md)
3. Check [Testing Strategy](./development/TESTING_STRATEGY.md)

### For Security Teams

1. Review [Security Audit Summary](./development/SECURITY_AUDIT_SUMMARY.md)
2. Check [Security Policies](./SECURITY.md)
3. Understand [RLS Architecture](./development/RLS_IMPLEMENTATION_GUIDE.md)

---

## 📞 Support & Community

- 💬 **[GitHub Discussions](https://github.com/your-org/chat-platform/discussions)** - Ask questions
- 🐛 **[GitHub Issues](https://github.com/your-org/chat-platform/issues)** - Report bugs
- 📧 **Email:** support@agentflow.live

---

## 🔄 Documentation Maintenance

### Regular Updates

- **Monthly:** Performance metrics and feature status
- **Quarterly:** Security documentation and audit results
- **As needed:** New features and API changes

### Contributing to Docs

1. Follow existing structure and formatting
2. Include code examples where applicable
3. Update this index when adding new docs
4. Test all links and commands

---

_Last Updated: January 2025_
_License: AGPL-3.0_
