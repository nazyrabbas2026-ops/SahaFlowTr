# Architecture decisions

- ADR-001: Modular monolith NestJS, separate worker, Next.js, future Expo. No microservice deployment complexity before domain boundaries are proven.
- ADR-002: Shared PostgreSQL with explicit tenant scope. Role/member relations use composite tenant FK. Authorization policy is deny-by-default; no tenant data API exists before authenticated membership guard.
- ADR-003: Bigint minor currency units; provider-agnostic integrations; no invented remote endpoints.
- ADR-004: Foundation UI describes build state. No fabricated dashboard KPIs or inactive operation controls.
- ADR-005: Prisma 6 compatibility line is intentionally used with conventional schema datasource URL and generated client. Major upgrades require migration review.
- ADR-006: Development containers bind only loopback host ports. Production deployment needs TLS, secret management, backups, non-public data services and signed storage access.
- ADR-007: Recurring maintenance uses a versioned job template, recurrence rule and immutable generation ledger. Worker runs are timezone-aware and idempotent; service agreements own coverage, visit rights, SLA and renewal state instead of overloading jobs or assets.
- ADR-008: Operational profitability is derived from an append-only cost subledger fed by approved labor, travel, inventory and external-service records. SahaFlow exports validated operational documents to accounting/payroll adapters; it does not act as a general ledger or payroll system.
- ADR-009: Plans, feature entitlements, quotas and usage counters are backend-authoritative and tenant-scoped. UI visibility is only a presentation of the same policy decision and never replaces API authorization.
- ADR-010: Location, time, communication and feedback data are purpose-limited, retained by policy and access-audited. Review requests use a neutral rule for all eligible customers; rating-based redirection or review gating is prohibited.
