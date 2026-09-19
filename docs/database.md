# Database

PostgreSQL is the source of truth. Prisma models and committed SQL migrations describe the schema.

## Tenant and access models

- `User`: globally unique normalized email, Argon2id password hash, login failure and lock state.
- `Organization`: tenant boundary with globally unique slug.
- `OrganizationMember`: unique organization/user membership with active state.
- `Role`: organization-scoped role; role name is unique inside its organization.
- `Permission`: global permission vocabulary.
- `RolePermission`: grants a permission to an organization-scoped role.

Membership references roles through the composite `(organizationId, roleId)` key. This database constraint prevents attaching a role from another tenant even if application validation regresses.

## Session and audit models

- `RefreshSession`: stores only peppered SHA-256 token hashes, family identity, expiry, rotation/revocation state and request metadata. Plain refresh tokens are never persisted.
- `AuditLog`: immutable actor, organization, action, entity, request and metadata record for security-sensitive mutations.
- `Plan`, `PlanEntitlement`, `OrganizationSubscription`: backend-authoritative SaaS plan and feature-right contract.
- `OrganizationOnboardingStep`: tenant-scoped setup progress, completed by a valid member of the same tenant.
- `Notification`: organization and recipient-member scoped application notification with read state.

## CRM models

- `OrganizationSequence`: tenant içinde atomik müşteri numarası üretir.
- `Customer`: bireysel/kurumsal kimlik, iletişim, vergi alanları, etiketler, soft archive ve optimistic `version` alanı.
- `CustomerContact`: birincil kişi, tercih edilen kanal ve açık rıza kaynağı/zamanı.
- `CustomerAddress`: fatura, servis veya ortak adres; saha erişim ve tesis ayrıntıları.
- `Asset`: müşterinin cihazı/varlığı, isteğe bağlı servis adresi, seri, garanti ve bakım periyodu.

Alt kayıtlar `(organizationId, customerId)` composite foreign key ile korunur. Asset adresi de aynı tenant ve aynı müşteriye bağlı olmak zorundadır. TCKN düz metin tutulmaz; ciphertext ile son dört hane ayrı alanlardadır.

Migrations:

- `202609130001_foundation`: tenant, user and RBAC core.
- `202609130002_auth_rbac`: account lock state, refresh sessions and audit logs.
- `202609140001_workspace_shell`: plan entitlements, subscriptions, onboarding, notifications and new shell permissions.
- `202609140002_onboarding_member_delete_policy`: preserves onboarding evidence by preventing deletion of its completing member.
- `202609140003_crm_customers`: müşteri, iletişim, çoklu adres, varlık, tenant sıra numarası, CRM izinleri ve plan entitlement'ı.
- `20260914125354_jobs`: iş emri, atama, durum geçmişi, not ve iş izinleri.
- `20260915122624_field_service_operations`: teknisyen profili, vardiya, zaman kaydı, teklif, katalog, stok, fatura, ödeme, maliyet, servis raporu, entegrasyon ve otomasyon tabloları.
- `20260918105223_service_agreements`: servis sözleşmesi, üretim ledger'ı ve sözleşme izinleri.
- `20260919112455_money_bigint_vat_bps`: parasal sütunlar `BIGINT`'e, KDV oranı `VatRate` enum'undan `vatRateBps` basis point sütununa taşındı.

## Para ve KDV

Parasal sütunlar `BIGINT` ve kuruş (minor unit) cinsindendir (ADR-003);
`INTEGER` tavanı 21.474.836,47 TRY olduğu için belge toplamlarını taşıyamazdı.
`bigint` JSON'a serialize edilemediğinden API sınırında tek bir interceptor
değerleri dizgiye çevirir.

KDV oranı enum değil, `vatRateBps INTEGER` sütununda basis point olarak tutulur
(%20 → `2000`): oranlar mevzuatla değişir ve geçmiş belgeler kendi oranını
taşımaya devam etmelidir. Yuvarlama satır bazında ve sıfırdan uzağa yarım
yukarıdır; belge seviyesindeki indirim satırlara oranla dağıtılır ve KDV her
satırın indirim sonrası matrahından yeniden hesaplanır. Hesabın tek kaynağı
`packages/domain/src/money.ts`'tir.

All migrations are applied to a real ephemeral PostgreSQL 18 instance during integration tests. Tenant boundary, cross-tenant asset/address access, audit, optimistic update and refresh replay scenarios are verified against database constraints and API guards.
