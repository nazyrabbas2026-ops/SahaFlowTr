# SahaFlow TR — Implementation Plan

## PHASE 0: İnceleme ve gap analysis

13.09.2026 tarihinde Master Spec (63 bölüm) ve master build command tamamen incelendi. Repository yalnızca `SahaFlow_TR_Codex_Master_Project_Spec.md.md` içeriyor. Uygulama, paket, migration, test ve git geçmişi yok. Node 24.21.0 ve pnpm 11.19.0 mevcut; Docker PATH üzerinde bulunamadı. Çalışan ürün kodu yok.

Referans görseller ürün gereksiniminin yerine geçmez. Görsellerde koyu 240–260px sidebar, beyaz yüzeyler, dört KPI, program/grafik/ekip düzeni, teknisyen satırlı dispatch, sade portal ve büyük mobil aksiyonlar var. Görseldeki İstanbul ve şirket adları demo kaynağı değildir: Antalya / Akdeniz Teknik Servis kullanılacak. Referans görseldeki rakamlar canlı metrik diye sunulmayacak.

Orcatec'in kamuya açık ürün anlatımı, bağımsız değerlendirmeler ve Türkiye'ye özgü resmi gereksinimler ayrıca incelendi. Sonuçlar [ürün referansı ve boşluk analizinde](product-reference-gap-analysis.md) kaynaklarıyla kayıtlıdır. Bu çalışma faz sırasını değiştirmez ve Orcatec'in marka, metin, ekran, kod veya varlıklarının kopyalanmasına izin vermez.

## Hedef mimari

Modüler monolit NestJS REST API; Next.js yönetim ve portal; Expo teknisyen; BullMQ worker. PostgreSQL tek doğruluk kaynağı. Prisma repository katmanı; Redis kuyruk ve rate-limit; S3/MinIO dosyalar. UI → application → domain → infrastructure ayrımı. Ortak domain saf TypeScript, framework bağımsız.

Web aynı-origin API proxy üzerinden HttpOnly oturum kullanacak. Argon2id, kısa ömürlü access token, hash olarak saklanan refresh token ve atomik rotation/reuse revocation PHASE 2 kapsamıdır. Tenant seçimi istekten gelebilir ancak aktif membership ve granular permission doğrulanmadan sorgu çalıştırılamaz. Teknisyen atama ve portal customer scope ek kısıttır; platform admin ayrı yetki sınırıdır.

## Veritabanı planı

PHASE 1: User, Organization, OrganizationMember, Role, Permission, RolePermission. Tenant ilişkilerinde composite foreign key tercih edilir. Sonraki fazlarda Customer → CustomerAddress → Asset → Job → JobAssignment/JobStatusHistory; Quote → QuoteOption/QuoteLine/QuoteApproval; ServiceReport → Item/Signature; Invoice → InvoiceLine → Payment/Refund; Product → InventoryLocation/InventoryTransaction; Employee → Skill/WorkSchedule/TimeEntry; Message, Notification, Automation/Execution, Integration/Credential, AuditLog, WebhookEvent eklenir.

Tenant tabloları organizationId taşır. Tenant içi numaralar unique(organizationId, number). İlişkiler aynı tenant composite FK ile doğrulanır. Listeler organizationId + status/date index ve limitli pagination kullanır. Para bigint kuruş; KDV ayarlanabilir basis point; yuvarlama satır bazında belgelenir. Finans ve stok hareketleri transaction; ödeme webhookları signature + timestamp + unique provider event ID ile korunur. Migration her şema değişiminde üretilir. Hassas veri audit içinde maskelenir.

## Dependency planı

pnpm workspace + Turbo; strict TypeScript, ESLint ve Prettier. Next/React + Tailwind, Lucide ilk foundation; shadcn/ui, Query/Table, RHF/Zod ve Recharts ilgili UI fazlarında. Nest + Swagger, Prisma; BullMQ + Redis; S3 SDK dosya fazında. Vitest domain/integration, Playwright E2E. Expo mobil fazında. Sürümler lockfile ile sabitlenir. Gerçek provider API'leri sadece resmi doküman doğrulandıktan sonra bağlanır.

## Fazlar ve acceptance gates

| Faz | Modül        | Kabul ölçütü                                                                                                                  |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 0   | Architecture | Tam kaynak analizi, gap, klasör ağacı, risk ve test planı                                                                     |
| 1   | Foundation   | Install/lint/typecheck/test/build; Compose postgres/redis/minio/api/web/worker; migration; health/readiness; web shell temeli |
| 2   | Auth/tenant  | Register/login/rotation/logout, membership/RBAC ve gerçek DB tenant isolation integration test                                |
| 3   | Shell/design | Responsive shell, command search, bildirim, onboarding, permission/entitlement görünümü ve erişilebilirlik                    |
| 4   | CRM          | Customer/contact/address/asset CRUD, 360 görünüm, fiyat/vergi profili ve idempotent import                                    |
| 5   | Jobs         | Durum makinesi, atama/geçmiş, recurring generation, servis sözleşmesi/SLA ve geçiş testleri                                   |
| 6   | Dispatch     | Gün/hafta/ay, drag/drop, optimistic conflict, kapasite/seyahat, açıklanabilir skor ve provider map                            |
| 7   | Quotes       | Sürümlü fiyat kataloğu/şablon, paket/add-on/KDV, event timeline, güvenli kabul ve PDF                                         |
| 8   | Reports      | Sürümlü form, offline taslak, fotoğraf/malzeme, çift imza ve servis PDF                                                       |
| 9   | Finance      | Invoice/allocation/refund, maliyet ledger'ı, komisyon ve idempotent provider abstraction                                      |
| 10  | Inventory    | Ürün/lokasyon, rezervasyon, tedarikçi/satın alma ve atomik stok hareketleri                                                   |
| 11  | Analytics    | Gerçek DB operasyon/finans/ekip/funnel raporu, saved view ve kuyruklu export                                                  |
| 12  | Integrations | Masked config, İYS/e-belge sözleşmeleri, mock adapter, webhook/replay ve otomasyon testleri                                   |
| 13  | Mobile       | Expo login, offline outbox/conflict, atanmış işler, saha aksiyonları, medya ve imza                                           |
| 14  | Portal       | Customer-scoped randevu, sözleşme/varlık, teklif, fatura, ödeme, servis ve privacy talepleri                                  |
| 15  | Hardening    | Entitlement/kota, privacy/retention, public API, security, performance, E2E ve deploy/runbook                                 |

Her fazın kritik gate'i geçmeden sonraki modüle geçilmez. Oluşturulan dosya bir özelliğin tamamlandığı anlamına gelmez. Faz raporları docs/phase-reports.md içinde tutulur.

Orcatec karşılaştırmasından gelen ayrıntılı veri modelleri, iş kuralları ve test kapıları ürün referansı ve boşluk analizi içinde ilgili fazlara dağıtılmıştır. Faz uygulamasına başlanırken hem bu plan hem de o fazın ek gereksinimleri birlikte kabul kriteri sayılır.

## Önerilen klasör ağacı

```text
apps/{web,api,worker,mobile}
packages/{config,domain,database,ui,validation,auth,integrations}
infrastructure/{docker,scripts}
docs/{implementation-plan,architecture,api,database,deployment,phase-reports}.md
```

Boş paketler bağımlılık ihtiyacı doğduğunda oluşturulur; sahte çalışan modül sunulmaz.

## Riskler

- Docker yok: gerçek PostgreSQL migration, readiness ve Compose uçtan uca doğrulanamaz; gate açık tutulur.
- Harita/ödeme/e-belge credential yok: mock açıkça etiketlenir, gerçek ödeme/belge iddiası yapılmaz.
- Tenant isolation uygulama scope + composite FK + negatif integration test gerektirir.
- Dispatch zaman çakışması concurrency altında transaction/locking ile korunmalıdır.
- GPS izin/mesai/retention; signed upload MIME/size ve signature erişimi ayrı güvenlik gereksinimidir.
- Görsel QA ve cihaz testi yapılmadan premium/responsive tamamlandı denmez.

## Doğrulama

Unit: fiyat/KDV, transitions, permissions, assignment scoring. Integration gerçek PostgreSQL: customer/job/assign/quote/invoice/payment ve ikinci tenant ID ile negatif erişim. E2E: login → müşteri → iş → atama → saha → teklif onayı → servis → fatura → ödeme. CI lint/typecheck/test/build; production release ayrıca migration, integration ve E2E gate gerektirir.
