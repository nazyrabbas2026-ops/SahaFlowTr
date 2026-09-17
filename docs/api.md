# API

Base path: `/api/v1`. OpenAPI UI: `/api/docs`.

## Health

- `GET /health`: process liveness.
- `GET /health/ready`: PostgreSQL, Redis and S3/MinIO readiness; dependency details never include credentials.

## Authentication

- `POST /auth/register`: creates a user, first organization, owner role, membership and database session atomically.
- `POST /auth/login`: validates credentials and creates a database session.
- `POST /auth/refresh`: rotates the one-time refresh token. Reuse revokes the complete token family.
- `POST /auth/logout`: revokes the refresh-token family and clears both cookies.
- `GET /auth/me`: returns the authenticated user and active organization memberships.

The web client receives short-lived access and rotating refresh tokens only as `HttpOnly` cookies. Cookies use `SameSite=Strict`, `Secure` in production, and scoped expiry/path settings. Browser mutations validate the trusted origin. Registration and login are rate limited, passwords use Argon2id, and repeated failed logins temporarily lock the account.

## Organizations and RBAC

All organization routes require an active access session. `organizationId` is resolved from the route and matched to a live database membership; a client-supplied tenant claim is never trusted.

- `GET /organizations`: memberships for the current user.
- `GET /organizations/:organizationId`: tenant context; requires `organization.read`.
- `GET /organizations/:organizationId/members`: requires `member.read`.
- `POST /organizations/:organizationId/members`: requires `member.manage`.
- `PATCH /organizations/:organizationId/members/:memberId`: requires `member.manage`.
- `POST /organizations/:organizationId/roles`: requires `role.manage`.
- `GET /organizations/:organizationId/workspace`: returns the server-validated role, permissions, plan entitlements, onboarding progress and workspace counters; requires `workspace.read`.
- `GET /organizations/:organizationId/notifications`: tenant/member-scoped paginated notification list; requires `notification.read`.
- `PATCH /organizations/:organizationId/notifications/:notificationId`: updates the current member's notification read state; requires `notification.read`.

All request bodies use Zod validation. Cross-tenant role identifiers are rejected. Membership and role mutations write an audit record.

Tenant guard, endpoint'in gerektirdiği permission ile plan entitlement değerini veritabanından birlikte yükler. İstemcinin gönderdiği rol, izin veya paket bilgisi yetkilendirme kararı olarak kullanılmaz.

## CRM / Customers

Tüm müşteri rotaları aktif oturum, tenant membership, `crm.customers` plan hakkı ve ilgili `customer.*` iznini birlikte doğrular.

- `GET /organizations/:organizationId/customers`: arama, tip/durum filtresi ve sayfalama.
- `POST /organizations/:organizationId/customers`: bireysel veya kurumsal müşteri oluşturma.
- `GET /organizations/:organizationId/customers/:customerId`: iletişim kişileri, adresler ve varlıklarla Customer 360 kaydı.
- `PATCH /organizations/:organizationId/customers/:customerId`: optimistic version kontrolüyle güncelleme.
- `DELETE /organizations/:organizationId/customers/:customerId` ve `POST .../restore`: soft archive/restore.
- `POST|PATCH|DELETE .../:customerId/contacts`: iletişim kişisi yönetimi.
- `POST|PATCH|DELETE .../:customerId/addresses`: fatura ve servis adresi yönetimi.
- `POST|PATCH|DELETE .../:customerId/assets`: müşteriye ve servis adresine bağlı cihaz/varlık yönetimi.

TCKN AES-256-GCM ile şifrelenir; API yalnızca son dört haneyi döndürür. Müşteri numarası tenant içinde kilitlenen sıra ile `MUS-000001` biçiminde üretilir. Tüm mutation işlemleri audit kaydı oluşturur.
