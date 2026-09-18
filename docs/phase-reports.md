# Phase reports — 13.09.2026

## PHASE: 0

STATUS: COMPLETED

COMPLETED:

- 63 bölümlük Master Spec, master build command ve iki referans görsel analiz edildi.
- Repository'nin yalnızca spesifikasyon içerdiği doğrulandı; çalışan kod yok.
- Gap analysis, mimari, domain/DB yaklaşımı, bağımlılıklar, fazlar, riskler ve kabul kriterleri yazıldı.

FILES CREATED:

- docs/implementation-plan.md
- docs/architecture.md
- docs/api.md
- docs/database.md
- docs/deployment.md
- docs/phase-reports.md

FILES MODIFIED: Kaynak spesifikasyon değiştirilmedi.
DATABASE: Tenant scope, composite foreign key, para ve migration stratejisi tanımlandı.
API: REST /api/v1 ve provider sınırları belirlendi.
UI: Koyu sidebar, özgün marka, renk token'ları ve desktop/mobil yaklaşımı belirlendi.
TESTS: Kaynak/kapsam incelemesi tamamlandı; kod testleri PHASE 1'de.
TYPECHECK: PHASE 0 için uygulanmaz.
KNOWN ISSUES: Docker bulunamadı.
NEXT PHASE: 1 — Foundation (uygulamaya geçildi).

## PHASE: 1

STATUS: IMPLEMENTED — INFRASTRUCTURE ACCEPTANCE BLOCKED

COMPLETED:

- pnpm/Turbo workspace; strict TypeScript, ESLint, Prettier; lockfile ve CI.
- Next.js + Tailwind + Lucide başlangıç ekranı, responsive menü, tema ve sağlık kontrolü.
- NestJS API, OpenAPI, liveness/readiness; Redis/S3/PostgreSQL hazırlık kontrolü.
- BullMQ system worker; bilinmeyen iş tiplerini reddeder.
- Prisma tenant/auth çekirdek şeması, generated client ve başlangıç migration SQL.
- Compose PostgreSQL/Redis/MinIO/bucket init/migration/API/web/worker tanımı; non-root uygulama image.
- Güvenilir üyelik girdisi üzerinde deny-by-default permission policy.

FILES CREATED:

- package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json
- .gitignore, .dockerignore, .prettierignore, .env.example, eslint.config.mjs
- .github/workflows/ci.yml, docker-compose.yml, infrastructure/docker/Dockerfile
- apps/api/{package.json,tsconfig.json,src/main.ts}
- apps/web/{package.json,tsconfig.json,postcss.config.mjs,next-env.d.ts}
- apps/web/app/{layout.tsx,page.tsx,globals.css,api/health/route.ts}
- apps/worker/{package.json,tsconfig.json,src/main.ts}
- packages/config/tsconfig.base.json
- packages/database/{package.json,tsconfig.json,src/index.ts,prisma/schema.prisma}
- packages/database/prisma/migrations/{migration_lock.toml,202609130001_foundation/migration.sql}
- packages/domain/{package.json,tsconfig.json,src/index.ts,src/auth.test.ts}
- playwright.config.ts, vitest.config.ts, tests/e2e/foundation.spec.ts, README.md

FILES MODIFIED:

- Yeni oluşturulan dosyalar formatlama ve doğrulama düzeltmeleriyle güncellendi; mevcut spesifikasyon korundu.

DATABASE:

- User, Organization, OrganizationMember, Role, Permission, RolePermission.
- Üyelik ve rol izinleri aynı-tenant composite FK kullanır.
- Prisma generate ve migration diff başarılı. Migration gerçek PostgreSQL'e uygulanmadı.

API:

- GET /api/v1/health: 200 doğrulandı.
- GET /api/v1/health/ready: altyapı yokken 503 doğrulandı.
- /api/docs: generated OpenAPI.
- Auth ve business endpointleri henüz yok; policy bir authentication sistemi değildir.

UI:

- 1440px desktop ve 390px mobil screenshotları incelendi; yatay taşma yok.
- Menü aç/kapat, sekmeler, tema, 16 faz görünümü ve readiness hata mesajı doğrulandı.
- Canlı KPI veya işlevsiz operasyon butonu eklenmedi.
- Önizleme http://localhost:3100; 3000 portu başka bir süreçte olduğundan alternatif port seçildi.

TESTS:

- Vitest: 5/5 geçti (izin, başka tenant, başka kullanıcı, eksik izin, pasif üyelik).
- Playwright/Edge: 2/2 geçti (desktop/mobil etkileşim + API liveness/readiness).
- Production build: 5/5 workspace başarılı.
- Lint: başarılı.

TYPECHECK: 7/7 Turbo task başarılı; çıkış kodu 0.

KNOWN ISSUES:

- Docker CLI/Desktop bulunamadı; Compose build/up, gerçek migration ve sağlıklı dependencies readiness doğrulanamadı. PHASE 1 gate açık.
- Gerçek DB tenant integration testi PHASE 2'de auth guard ile kurulacak; policy testleri bunun yerine geçmez.
- Auth, CRM, işler, dispatch, finans, mobile, portal ve üretim hardening tamamlanmadı.
- ESLint 9 kurulumda deprecated uyarısı verdi; major upgrade ayrı uyumluluk kontrolü gerektirir.
- Tarayıcı connector transport kapalıydı; yerel Playwright/Edge ile kontrol yapıldı.

NEXT PHASE:

- Docker Desktop Linux containers ortamını hazırla; Compose ve migration gate'lerini doğrula.
- Gate geçtikten sonra PHASE 2: register/login/refresh rotation/logout, organization membership, RBAC, tenant isolation integration.

## PHASE: 2

### COMPLETED

- Register, login, me, rotating refresh and logout flows.
- Organization membership, deny-by-default RBAC and backend-enforced tenant isolation.
- Account lockout, rate limiting, trusted-origin checks and security audit records.
- Responsive registration/login screens with functional validation, loading and error states.

### FILES CHANGED

- NestJS auth, audit, database and organization modules.
- Next.js auth pages, forms, proxy configuration and authenticated foundation header.
- Prisma schema, auth/RBAC migration, integration/E2E tests and CI workflow.

### DATABASE

- Added account lock fields, `RefreshSession` and `AuditLog`.
- Applied both committed migrations to ephemeral PostgreSQL 18 during tests.
- Composite tenant keys and cross-tenant role rejection verified.

### API

- `/api/v1/auth/{register,login,refresh,logout,me}`.
- `/api/v1/organizations` plus tenant context, member and role operations.
- Zod validation, access-session guard, permission guard and OpenAPI descriptions.

### TEST RESULTS

- Lint passed.
- Typecheck 7/7 passed.
- Unit/integration 8/8 passed against PostgreSQL 18.
- Playwright/Edge E2E 4/4 passed.
- Production build 5/5 passed.

### KNOWN ISSUES

- Docker CLI/Desktop is unavailable on this machine, so the complete Compose stack with Redis and MinIO has not been started locally.
- A local Edge extension injects an input caret style and produces a development-only hydration warning; E2E behavior and CI Chromium are unaffected.

### NEXT PHASE

- Phase 3 — Application Shell + Design System.

## PHASE: 3

### COMPLETED

- Oturum zorunlu responsive uygulama kabuğu, organizasyon seçici, tema ve erişilebilir mobil navigasyon.
- Permission ve plan entitlement verisinden üretilen menü ile klavye destekli komut araması.
- Veritabanına bağlı onboarding ilerlemesi, gerçek üye/rol listesi ve okunma durumlu bildirim merkezi.
- Loading, empty ve error durumları için ortak tasarım sistemi bileşenleri.
- Docker olmadan kalıcı gerçek PostgreSQL ve yerel API çalıştırma komutları.

### FILES CHANGED

- Next.js workspace sayfası, ortak tasarım bileşenleri ve responsive stiller.
- NestJS organization workspace, notification ve entitlement guard akışları.
- Prisma şeması, iki Phase 3 migration'ı, testler ve teknik belgeler.

### DATABASE

- `Plan`, `PlanEntitlement`, `OrganizationSubscription`, `OrganizationOnboardingStep` ve `Notification` eklendi.
- Onboarding tamamlayan ve bildirim alan üye aynı tenant composite foreign key ile korunuyor.
- Mevcut organizasyonlar Başlangıç planı, onboarding adımları ve hoş geldiniz bildirimiyle backfill edildi.

### API

- `GET /organizations/:organizationId/workspace`.
- Sayfalanmış `GET /organizations/:organizationId/notifications`.
- `PATCH /organizations/:organizationId/notifications/:notificationId`.
- Permission, membership ve entitlement kararları backend guard tarafından birlikte uygulanıyor.

### TEST RESULTS

- Lint geçti; typecheck 7/7; unit/integration 8/8; Playwright E2E 6/6; production build 5/5.
- Gerçek web proxy smoke testi: register 201, workspace 200, starter plan, 6 onboarding adımı ve 1 bildirim.

### KNOWN ISSUES

- Redis ve MinIO yerel olarak çalışmıyor; genel readiness bu iki bağımlılık için 503 döndürüyor.
- Operasyon KPI'ları Phase 4 ve sonraki gerçek domain verileri oluşana kadar gösterilmiyor.

### NEXT PHASE

- Phase 4 — CRM / Customers.

## PHASE: 4

### COMPLETED

- Gerçek PostgreSQL verisine bağlı müşteri listesi, arama, filtre, sayfalama ve Customer 360 görünümü.
- Bireysel/kurumsal müşteri, iletişim kişisi, çoklu servis/fatura adresi ve cihaz/varlık CRUD akışları.
- Soft archive/restore, optimistic concurrency, TCKN şifreleme, tenant kota kontrolü ve audit kayıtları.
- Yetki ve entitlement kontrollü responsive CRM arayüzü; loading, empty, error ve form durumları.

### FILES CHANGED

- Next.js müşteri bileşeni, uygulama navigasyonu, dashboard KPI ve responsive stiller.
- NestJS Customers modülü, validation şemaları, hassas veri servisi ve origin guard.
- Prisma CRM şeması/migration, domain izinleri, integration/E2E testleri ve teknik belgeler.

### DATABASE

- `Customer`, `CustomerContact`, `CustomerAddress`, `Asset` ve `OrganizationSequence` eklendi.
- Tenant composite foreign key'leri ve aynı müşteriye ait adres/varlık bütünlüğü uygulandı.
- `202609140003_crm_customers` migration'ı yerel ve test PostgreSQL 18 üzerinde uygulandı.

### API

- Sayfalanmış/filtreli müşteri listesi; create, detail, update, archive ve restore endpointleri.
- Contact, address ve asset create/update/archive endpointleri.
- Auth, RBAC, tenant scope, entitlement, Zod validation, audit ve hata yönetimi tamamlandı.

### TEST RESULTS

- Lint geçti; typecheck 7/7; unit/integration 9/9; Playwright E2E 7/7; production build 5/5.
- Cross-tenant müşteri ve asset/adres erişimi, optimistic conflict ve hassas veri sızıntısı test edildi.

### KNOWN ISSUES

- Redis ve MinIO yerel olarak çalışmıyor; CRM'in bu fazdaki ilişkisel akışlarını etkilemiyor, genel readiness bu servisler için 503 verir.
- İş emri, teklif, fatura ve ödeme geçmişi Customer 360'a ilgili fazlarda gerçek ilişkiler olarak eklenecek.

### NEXT PHASE

- Phase 5 — Jobs / İş Emirleri.

## PHASE: 5

### STATUS

PARTIALLY IMPLEMENTED — GATE NOT PASSED. Bu bölüm 17.09.2026'da kod tabanı
taranarak (tahmin edilmeden) yazıldı: `apps/api/src/jobs`,
`apps/api/src/employees`, `packages/database/prisma/schema.prisma` ve ilgili
migration/test dosyaları okundu; `pnpm lint`/`pnpm typecheck`/`pnpm test`
gerçekten çalıştırıldı.

### COMPLETED

- İş emri durum makinesi (`NEW → SCHEDULED/ASSIGNED → EN_ROUTE → ARRIVED →
  IN_PROGRESS → ON_HOLD/COMPLETED → INVOICED → PAID`, her durumdan
  `CANCELLED`'a) `jobs.service.ts` içinde sabit bir geçiş tablosuyla
  uygulandı; `hold`/`cancel` için neden zorunlu.
- Tenant-scoped CRUD, arama/filtre/sayfalama, atama (`JobAssignment`,
  primary/secondary), not (`JobNote`), durum geçmişi (`JobStatusHistory`) ve
  her mutasyonda `AuditService` üzerinden audit kaydı.
- Optimistic concurrency (`version` alanı, `updateMany` + count kontrolü) ve
  create akışında plan entitlement/kota kontrolü (`operations.jobs`).
- Employee/Skill temel modülü: `EmployeeProfile` CRUD, beceri kataloğu
  (`Skill`/`EmployeeSkill`), teknisyen konum kaydı (`TechnicianLocation`).

### KISMEN TAMAMLANMIŞ / BAŞLAMAMIŞ

- ~~**Recurring generation** ve **servis sözleşmesi/SLA** (Faz 5 kabul ölçütü
  ve ADR-007'de tanımlı): şemada karşılık gelen bir model
  (`ServiceAgreement`, tekrar şablonu, generation ledger) yok, servis
  katmanında da hiçbir iz yok. Bu kapsam **hiç başlamadı**.~~ **[18.09.2026:
  MVP eklendi — `ServiceAgreement` + `ServiceAgreementGenerationRun`
  (`20260918105223_service_agreements` migration'ı) ve
  `apps/api/src/service-agreements/` modülü (CRUD +
  `POST :id/generate`). `generate()` `JobsService.create()`'i çağırıyor
  (mantık tekrarlanmadı); üretim `(organizationId, serviceAgreementId,
  periodKey)` üzerindeki `@@unique` kısıtı sayesinde idempotent —
  aynı dönem için asla ikinci bir `Job` oluşmaz. Tekrar hesabı
  `packages/domain/src/recurrence.ts`'te saf, unit test'li bir
  fonksiyon (`computeDueOccurrences`).
  **ADR-007'nin `JobTemplate`/`RecurrenceRule` ayrımı MVP'de bilinçli
  olarak uygulanmadı** — şablon alanları (title/category/priority/
  estimatedDurationMinutes) ve tekrar kuralı
  (`recurrenceIntervalMonths`/`anchorDate`) doğrudan `ServiceAgreement`e
  gömülü (bkz. şemadaki model üstü yorum). Bir şablonun birden fazla
  sözleşme tarafından paylaşılması ihtiyacı doğduğunda ayrı bir
  `JobTemplate` modeline çıkarılabilir.
  **Hâlâ eksik**: BullMQ üzerinden otomatik/zamanlanmış üretim (şu an
  sadece manuel `POST :id/generate`), haftalık/özel RRULE desteği (sadece
  "her N ayda bir"), ziyaret kotası/SLA/dahil malzeme takibi, yenileme
  akışı, `apps/worker`'a veritabanı erişimi.]**
  **[18.09.2026, ikinci ekleme — web arayüzü
  (`feature/service-agreements-ui`)]**: Servis sözleşmeleri artık müşteri 360
  görünümünde kendi bölümüne sahip (`apps/web/components/service-agreements.tsx`,
  `customers.tsx`'teki alt-kayıt deseniyle aynı: liste + modal). Bölümde
  sözleşme listesi (aktif/pasif, "her N ayda bir", sonraki üretim dönemi),
  tüm alanları içeren oluştur/düzenle formu, satır başına "Şimdi Üret"
  (`POST :id/generate`) ve açılıp kapanan üretim geçmişi (generation ledger,
  üretilen iş emri numarasıyla) var. Ledger'ı görünür kılmak bilinçli bir
  karar: tamamen gizli bir idempotency defteri kullanıcıya güven vermiyor.
  İki küçük backend eklemesi bu arayüz için yapıldı: (1) yanıtlara
  `nextOccurrence` alanı — "sonraki üretim dönemi" hesabı istemcide
  tekrarlanmasın diye `packages/domain`'deki yeni saf
  `nextOccurrenceAfter()` ile backend'de üretiliyor; (2) `generate()`
  yanıtındaki her döneme `created` bayrağı — idempotent tekrar çağrıda
  ledger kaydı aynı `GENERATED` durumuyla döndüğü için istemci aksi hâlde
  "yeni iş emri oluşturuldu" ile "zaten vardı"yı ayırt edemiyordu ve yanlış
  mesaj gösteriyordu.
- **Geçiş testleri**: jobs modülüne özel hiçbir unit/integration testi yok.
  Tek ilgili test, `tests/e2e/foundation.spec.ts` içindeki "creates a job and
  opens its workflow history" — gerçek API'ye karşı değil, `page.route` ile
  mock'lanmış bir Playwright senaryosu.
- ~~`WorkSchedule` ve `TimeEntry` modelleri şemada var ama hiçbir
  service/controller onları kullanmıyor; sadece şema iskeleti.~~
  **[18.09.2026: kısmen düzeltildi — `employees.service.ts getById()` artık
  ikisini de `memberId` üzerinden okuyup `GET /employees/:employeeId`
  yanıtına ekliyor (bkz. `feature/employee-detail-view`). Sadece okuma; bu
  kayıtları oluşturan/güncelleyen bir endpoint hâlâ yok.]**
- `employees` modülünde diğer modüllerdeki `*.schemas.ts` konvansiyonu yok;
  Zod şemaları doğrudan `employees.controller.ts` içinde tanımlı.

### FILES (mevcut durum)

- `apps/api/src/jobs/{jobs.controller.ts,jobs.module.ts,jobs.schemas.ts,jobs.service.ts}`
- `apps/api/src/employees/{employees.controller.ts,employees.module.ts,employees.service.ts}`
- `packages/database/prisma/migrations/20260914125354_jobs`
- `packages/domain/src/index.ts` (`JOB_*`, `EMPLOYEE_*` izinleri)
- **[18.09.2026]** `apps/api/src/service-agreements/{service-agreements.controller.ts,service-agreements.module.ts,service-agreements.schemas.ts,service-agreements.service.ts}`,
  `packages/domain/src/{recurrence.ts,recurrence.test.ts}`,
  `packages/database/prisma/migrations/20260918105223_service_agreements`.
- **[18.09.2026, web arayüzü]** `apps/web/components/service-agreements.tsx`,
  `service-agreements.helpers.ts` (+ `.test.ts`, "Şimdi Üret" sonuç mesajının
  saf mantığı), `apps/web/components/customers.tsx` (müşteri 360'a bölümün
  eklenmesi), `apps/web/app/globals.css`,
  `tests/e2e/service-agreements.spec.ts`.

### DATABASE

- `Job`, `JobAssignment`, `JobStatusHistory`, `JobNote` —
  `20260914125354_jobs` migration'ı.
- `EmployeeProfile`, `Skill`, `EmployeeSkill`, `WorkSchedule`,
  `TechnicianLocation`, `TimeEntry` — `20260915122624_field_service_operations`
  migration'ı içinde. **Not**: bu tek migration aynı zamanda Faz 7-12
  kapsamındaki `Quote`, `Invoice`, `Payment`, `StockMovement`,
  `ServiceReport`, `PortalAccessGrant`, `IntegrationSetting`,
  `AutomationRule` tablolarını da önceden oluşturuyor; bu modüllerin
  hiçbirinde henüz service/controller/schema dosyası yok — şema ileri fazlar
  için önceden hazırlanmış, kod karşılığı henüz yazılmadı.
- **[18.09.2026]** `ServiceAgreement`, `ServiceAgreementGenerationRun` —
  `20260918105223_service_agreements` migration'ı; `plan_starter` planına
  `operations.service-agreements` entitlement'ı ve "Şirket Sahibi" rolüne
  `service-agreement.*` izinleri de aynı migration'la seed edildi.

### TEST RESULTS (17.09.2026, gerçekten çalıştırıldı)

- `pnpm lint`: **BAŞARISIZ** — `packages/database/peek.mjs:13` içinde
  önceden var olan `no-undef` (`console`) hatası. Bu dosya bu faz kapsamında
  eklenmedi, ama `main` üzerinde lint şu anda kırmızı. **[18.09.2026:
  düzeltildi, bkz. GÜNCELLEME bölümü.]**
- `pnpm typecheck`: 7/7 Turbo görevi geçti.
- `pnpm test` (Vitest): 9 testten 8'i geçti, 1'i başarısız —
  `apps/api/test/auth.integration.test.ts` içindeki `applyMigrations()`
  fonksiyonunun migration listesi `20260915122624_field_service_operations`
  migration'ını içermiyor; test veritabanında `CustomerAddress.latitude`
  kolonu oluşmuyor ve müşteri adresi oluşturma senaryosu `500 (P2022)` ile
  başarısız oluyor. Bu, Faz 6 migration'ı eklenirken entegrasyon testi
  harness'inin güncellenmediğini gösteriyor. **[18.09.2026: düzeltildi, bkz.
  GÜNCELLEME bölümü.]**
- `pnpm build` ve `pnpm test:e2e` bu tur çalıştırılmadı (kapsam dokümantasyon
  güncellemesiydi, kod değişmedi); yukarıdaki `lint`/`test` başarısızlıkları
  zaten gate'i açık tutuyor.

### KNOWN ISSUES

- ~~CI şu anda `main` üzerinde kırmızı: hem `pnpm lint` hem `pnpm test`
  başarısız.~~ **[18.09.2026: düzeltildi ve main'e merge edildi — main'de
  lint/typecheck/test/build şu anda yeşil. Bkz. GÜNCELLEME bölümü.]**
- Jobs/Employees modülleri için gerçek unit veya entegrasyon testi yok
  (dispatch skorlaması hariç — bkz. Faz 6 güncellemesi).
- ~~Recurring generation ve servis sözleşmesi/SLA kapsamı hiç başlamadı.~~
  **[18.09.2026: MVP eklendi, yukarıya bkz. — otomatik zamanlama,
  RRULE, SLA/ziyaret kotası hâlâ eksik.]**

### NEXT PHASE

- Faz 6 raporu aşağıda. Faz 5'in gate'i açık: lint/test kırmızı ve
  recurring/SLA kapsamı eksik olduğu sürece Faz 7'ye (Quotes) resmi olarak
  geçilmemeli.

## PHASE: 6

### STATUS

PARTIALLY IMPLEMENTED — GATE NOT PASSED. Aynı 17.09.2026 taramasının parçası;
`apps/api/src/dispatch` ve `packages/domain/src/dispatch.ts` okunarak Faz 6
kabul ölçütünün maddeleriyle tek tek karşılaştırıldı.

### COMPLETED

- Açıklanabilir aday skorlaması: `packages/domain/src/dispatch.ts` içinde
  saf fonksiyonlar (`scoreCandidate`/`rankCandidates`) beceri (%50), mesafe
  (%30) ve müsaitlik (%20) ağırlıklı bir kompozit skor ve kısa bir `reason`
  metni üretiyor.
- `GET .../dispatch/jobs/:jobId/candidates` (en iyi 5 aday) ve
  `POST .../dispatch/jobs/:jobId/assign` uçları; `AccessTokenGuard` +
  `TenantGuard`, `dispatch.read`/`dispatch.assign` izinleri ve
  `operations.dispatch` entitlement kontrolü.
- Web tarafında `apps/web/components/dispatch.tsx` — aday listesi ve atama
  akışı.

### KISMEN TAMAMLANMIŞ / BAŞLAMAMIŞ (kabul ölçütüyle madde madde karşılaştırma)

Faz 6 kabul ölçütü: "Gün/hafta/ay, drag/drop, optimistic conflict,
kapasite/seyahat, açıklanabilir skor ve provider map."

- **Açıklanabilir skor**: VAR.
- **Gün/hafta/ay takvim görünümü**: ~~YOK~~ **[18.09.2026: haftalık görünüm
  eklendi — `apps/web/components/dispatch-calendar.tsx`, 7 gün × teknisyen
  satırı, `GET /jobs?scheduledFrom=&scheduledTo=` ile o haftanın işlerini
  çekiyor.]** **[18.09.2026, ikinci ekleme: ay görünümü de eklendi — aynı
  teknisyen swimlane yapısı korunarak, `getMonthGrid()` ile hafta başlangıcına
  hizalanmış 5-6 haftalık (35/42 gün) bir grid gösteriliyor; "Hafta/Ay" toggle
  ile geçiliyor. Dar ay hücrelerinde işler sıkıştırılmıyor, ilk 2'si gösterilip
  kalanı "+N daha" ile özetleniyor. Gün görünümü hâlâ yok — kapsam bilinçli
  olarak hafta+ay ile sınırlı tutuldu.]**
- **Drag/drop yeniden planlama**: ~~YOK~~ **[18.09.2026: eklendi —
  `@dnd-kit/core` ile aynı gün farklı teknisyene sürükleme
  `POST /jobs/:jobId/assign`'ı (dispatch'in kendi `assignJob`'ı değil,
  `jobs.service.ts`'nin doğru unassign/audit içeren `assign()`'ı) çağırıyor;
  farklı güne sürükleme `PATCH /jobs/:jobId`'yi süre korunarak yeni
  `scheduledStart`/`scheduledEnd` ve `version` ile çağırıyor.]**
- **Optimistic conflict**: Kısmi — takvimden sürükleyerek yeniden planlama
  `PATCH /jobs/:jobId`'nin mevcut `version` kontrolünü kullanıyor; 409
  dönerse takvim hatayı gösterip veriyi yeniden yüklüyor **[18.09.2026]**.
  Ancak `dispatch.service.ts assignJob()` (aday önerisi ekranındaki "Ata"
  butonu) hâlâ versiyon kontrolü yapmadan doğrudan `jobAssignment.create`
  çağırıyor — bu yol düzeltilmedi, sadece takvimin kendi sürükle-bırak yolu
  doğru (`jobs.service.ts`'nin `assign()`'ı) endpoint'i kullanıyor.
- **Kapasite/seyahat**: Kısmi — `distanceScore` düz coğrafi (Öklid benzeri)
  bir yaklaşım, gerçek seyahat süresi/trafik hesaplamıyor. ~~Ayrıca
  `dispatch.service.ts suggestCandidates()` içinde aday koordinatları hep
  `latitude: undefined, longitude: undefined` olarak gönderiliyor —
  `TechnicianLocation` tablosundan gerçek konum hiç okunmuyor, yani mesafe
  skoru pratikte her zaman varsayılan (50) dönüyor.~~ **[18.09.2026:
  koordinat okuma düzeltildi — `suggestCandidates()` artık her adayın son
  `TechnicianLocation` kaydını okuyup skora yansıtıyor (regresyon testi:
  `dispatch.service.test.ts`). Gerçek seyahat süresi/trafik hesaplaması hâlâ
  yok, bu kısım kabul ölçütünün karşılanmayan tarafı olarak kalıyor.]**
- **Provider map**: YOK — hiçbir harita sağlayıcı entegrasyonu yok (bkz.
  `docs/implementation-plan.md` riskler: "Harita/ödeme/e-belge credential
  yok").
- ~~**Ek bulgu (veri bütünlüğü)**: `employees.controller.ts recordLocation()`
  route parametresi olan `employeeId`'yi (`EmployeeProfile.id`) doğrudan
  `employees.service.ts recordLocation()`'ın beklediği `memberId`
  (`OrganizationMember.id`) parametresine geçiriyor; bu iki alan farklı
  olduğundan `TechnicianLocation.memberId` yanlış değerle kaydedilebilir. Bu
  veri şu an dispatch skorlamasında okunmadığı için sonucu etkilemiyor ama
  düzeltilmesi gerekiyor.~~ **[18.09.2026: düzeltildi —
  `recordLocation`/`getRecentLocation` artık `employeeId`'yi `EmployeeProfile`
  üzerinden gerçek `memberId`'ye çözüyor; `dispatch.service.ts` de artık
  `TechnicianLocation`'dan gerçek konumu okuyor. Bkz. GÜNCELLEME bölümü.]**
- `dispatch` modülünde de `employees` gibi ayrı bir `*.schemas.ts` dosyası
  yok; Zod şeması controller içinde.

### FILES (mevcut durum)

- `apps/api/src/dispatch/{dispatch.controller.ts,dispatch.module.ts,dispatch.service.ts}`
- `packages/domain/src/dispatch.ts`
- `apps/web/components/dispatch.tsx`
- **[18.09.2026]** `apps/web/components/dispatch-calendar.tsx` (haftalık +
  aylık takvim, toggle, sürükle-bırak), `dispatch-calendar.helpers.ts` (saf
  tarih/atama mantığı: `startOfWeek`/`startOfMonth`/`endOfMonth`/`addMonths`/
  `getMonthGrid`/`resolveDropChanges`/`computeRescheduledRange`),
  `dispatch-calendar.helpers.test.ts` (21 unit test).
- **[18.09.2026]** `apps/api/src/jobs/jobs.schemas.ts`/`jobs.service.ts`:
  `GET /jobs` artık `scheduledFrom`/`scheduledTo` ile tarih aralığı
  filtreliyor (takvimin haftalık veri çekişi için).

### DATABASE

- `TechnicianLocation` — `20260915122624_field_service_operations`
  migration'ı (bkz. Faz 5 notu: aynı migration Faz 7-12 tablolarını da
  içeriyor).

### TEST RESULTS

- Faz 5 ile aynı çalıştırma (17.09.2026): dispatch'e özel hiçbir
  unit/integration/E2E testi yok; `scoreCandidate`/`rankCandidates` de dahil
  hiçbir dispatch fonksiyonu test edilmiyor.
- **[18.09.2026]** `dispatch-calendar.helpers.test.ts`: 21/21 geçti (ilk
  eklemede 13, ay görünümüyle birlikte `startOfMonth`/`endOfMonth`/
  `addMonths`/`getMonthGrid` için 8 test daha) —
  `startOfWeek`/`addDays`/`toDateKey` tarih hesapları ve
  `resolveDropChanges`/`computeRescheduledRange` sürükle-bırak karar mantığı
  kapsandı. Bu test yazılırken gerçek bir zaman dilimi hatası bulundu:
  `toDateKey` UTC, `startOfWeek`/`addDays` yerel saat kullanıyordu; bu
  karışım pozitif UTC ofsetli saat dilimlerinde (Türkiye dahil) takvim
  gününü bir gün geri kaydırıyordu. Tüm yardımcı fonksiyonlar yerel-saat
  tutarlı hale getirilerek düzeltildi.
- **[18.09.2026, üçüncü ekleme]** `tests/e2e/dispatch-calendar.spec.ts`: 3
  yeni Playwright E2E senaryosu — aynı gün farklı teknisyene sürükleme,
  farklı güne sürükleme (her ikisi de `page.reload()` sonrası kalıcılığı
  doğruluyor) ve hafta/ay toggle. `@dnd-kit/core` kaynağı incelenerek
  `PointerSensor`'ın yalnızca gerçek `pointerdown`/`pointermove`/`pointerup`
  event'lerini dinlediği doğrulandı; sürükleme `page.mouse.move/down/up` ile
  simüle edildi (native HTML5 drag veya dblclick değil). 3 kez tekrarlanarak
  (9/9) kararlılık teyit edildi.

### KNOWN ISSUES

- Gün görünümü, gerçek kapasite/seyahat süresi hesaplaması ve provider map
  hâlâ yok; Faz 6 kabul ölçütünün "aday önerisi + atama", "açıklanabilir
  skor" ve "hafta/ay görünümü + drag/drop (kısmi optimistic conflict)"
  kısımları tamamlandı.
- ~~Takvimin sürükle-bırak etkileşimi için gerçek bir component/E2E testi
  yok — sadece karar mantığı unit test ile korunuyor.~~ **[18.09.2026:
  düzeltildi, yukarıya bkz.]**
- ~~`recordLocation` parametre karışıklığı (yukarıda) düzeltilmeli.~~
  **[18.09.2026: düzeltildi.]**
- ~~Dispatch skorlaması gerçek teknisyen konumunu kullanmıyor.~~
  **[18.09.2026: düzeltildi, regresyon testiyle korunuyor.]**
- ~~Faz 5'teki lint/test kırmızı durumu Faz 6'yı da kapsıyor (aynı `pnpm
  test`/`pnpm lint` çalıştırması).~~ **[18.09.2026: düzeltildi, bkz.
  GÜNCELLEME bölümü.]**

### NEXT PHASE

- Faz 5 ve Faz 6'nın açık gate'leri kapatılmadan Faz 7'ye (Quotes) resmi
  olarak geçilmemeli. 18.09.2026 itibarıyla lint/test kırmızı durumu ve
  dispatch konum hatası giderildi (bkz. GÜNCELLEME bölümü); **recurring
  generation, servis sözleşmesi/SLA, takvim/drag-drop/provider map ve
  jobs/employees/dispatch modüllerinin entegrasyon test kapsamı hâlâ eksik**
  — bu kalemler kapanmadan gate açık kalmaya devam ediyor. Şemanın
  `20260915122624_field_service_operations` migration'ı ile Faz 7-12
  tablolarının önceden oluşturulmuş olması bu sıra ilkesini değiştirmez —
  şema hazır olması, o fazın tamamlandığı anlamına gelmez.

## GÜNCELLEME: CI düzeltmeleri (18.09.2026)

Faz 5/6 taramasında (17.09.2026) bulunan üç sorun ayrı branch'lerde
düzeltilip `main`'e merge edildi; her merge sonrası `main` üzerinde
`pnpm test` gerçekten çalıştırılıp yeşil olduğu doğrulandı:

- `fix/ci-migration-list` — `auth.integration.test.ts`'teki
  `applyMigrations()` listesine eksik `20260915122624_field_service_operations`
  migration'ı eklendi; `CustomerAddress.latitude` kolonu eksikliğinden
  kaynaklanan `P2022`/500 hatası giderildi.
- `fix/dispatch-employee-location` — `dispatch.service.ts` artık
  `TechnicianLocation`'dan gerçek konum okuyor; `employees.service.ts`
  `recordLocation`/`getRecentLocation` artık `employeeId`'yi
  `EmployeeProfile` üzerinden gerçek `memberId`'ye çözüyor. Regresyonu
  kilitleyen `apps/api/src/dispatch/dispatch.service.test.ts` eklendi.
- Aynı branch'te `packages/database/peek.mjs` içindeki `no-undef`
  (`console`) lint hatası, `infrastructure/scripts/local-postgres.mjs`'teki
  mevcut `import process from "node:process"` konvansiyonuna uyularak
  `import console from "node:console"` ile giderildi.

**Sonuç**: `main` üzerinde şu an `pnpm lint`, `pnpm typecheck`, `pnpm test`
ve `pnpm build` yeşil. Bu, Faz 5/6'nın acceptance gate'ini geçtiği anlamına
gelmez — yukarıdaki KNOWN ISSUES'ta işaretli recurring/SLA, takvim/drag-drop/
provider map ve genel test kapsamı eksiklikleri hâlâ açık; sadece CI'ın
kırmızı olma nedeni ortadan kalktı.

**Bulgu (18.09.2026, `pnpm test:e2e` ilk kez bu tur çalıştırıldı) — DÜZELTİLDİ**:
`tests/e2e/foundation.spec.ts` içindeki "creates a customer and opens the
customer 360 record" ve "creates a job and opens its workflow history"
senaryoları `main` üzerinde de başarısızdı — form submit sonrası ilgili detay
başlığı hiç render olmuyordu (sayfa liste görünümünde kalıyor, bir `alert`
role'ü beliriyordu). CI `pnpm lint`/`pnpm test` bu oturumdan önce zaten
kırmızı olduğu için `test:e2e` adımına hiç ulaşmamış ve bu hata fark
edilmemiş olabilir.

Kök sebep bulundu ve `fix/e2e-customer-job-creation` dalında düzeltildi:
`apps/web/app/page.tsx`'teki workspace-yeniden-yükleme `useEffect`'i,
`onChanged`/`onCustomerCreated` her tetiklendiğinde (yeni kayıt oluşturma
sonrası metrikleri tazelemek için) `workspace` state'ini önce `null`'a
çekiyordu; `{workspace && (...)}` koşulu yüzünden bu, o anki tüm sekme
içeriğini (Jobs/Customers dahil, az önce oluşturulan kaydın detay
görünümüyle birlikte) anlık olarak unmount edip fetch tamamlanınca sıfırdan
yeniden mount ediyordu — kullanıcı yeni oluşturduğu kaydın detayını görmeden
listeye geri düşüyordu. Düzeltme: `workspace` yalnızca gerçek bir
organizasyon değişiminde (`organizationId` değiştiğinde) `null`'a çekiliyor;
salt metrik yenilemesinde mevcut veri korunuyor, böylece alt bileşenin
local state'i (`detail`) hayatta kalıyor.

Ayrı bir bulgu: bu araştırma sırasında `C:\Users\nazyr\OneDrive\Desktop\Sahaflow`
adında, aynı GitHub reposunun `f484e4b` commit'inde donmuş kalmış ayrı bir
checkout'ta saatlerdir çalışan bir `next dev -p 3100` sunucusu tespit edildi.
Playwright'ın `reuseExistingServer` ayarı bu sunucuyu bizim projemizin
sunucusu sanıp yeniden kullanıyordu, bu da oturum boyunca bazı `test:e2e`
sonuçlarının güvenilmez olmasına yol açmış olabilir. O checkout tamamen
temizdi (commit edilmemiş/push edilmemiş hiçbir şey yoktu), kullanıcı onayı
alınarak süreçleri sonlandırıldı ve port 3100 boşaltıldı.

Doğrulama: `fix/e2e-customer-job-creation` dalında `pnpm test:e2e` **8/8**
geçti (iki kez tekrarlanarak teyit edildi).

## GÜNCELLEME: Servis sözleşmeleri arayüzü (18.09.2026)

`feature/service-agreements-ui` dalı, `feature/service-agreements` ile gelen
backend'in üzerine müşteri 360 içinde bir "Servis Sözleşmeleri" bölümü ekledi
(ayrıntı için Faz 5 bölümündeki ilgili madde). Arayüz `customers.tsx`'teki
mevcut alt-kayıt desenini (liste + oluştur/düzenle modalı) tekrar kullanıyor.

### Bu dalda yapılan iki backend eklemesi ve gerekçeleri

- `nextOccurrence`: sözleşme yanıtlarına eklenen, salt görüntüleme amaçlı bir
  alan. "Sonraki üretim dönemi"nin istemcide ikinci bir tekrar-hesabı olarak
  yeniden yazılmaması için `packages/domain/src/recurrence.ts` içine
  `computeDueOccurrences`'ın ayna sorgusu olan saf `nextOccurrenceAfter()`
  eklendi ve backend'de kullanıldı. Üretim kararı hâlâ yalnızca
  `generate()` + generation ledger'a ait.
- `generate()` yanıtındaki dönemlere `created` bayrağı: idempotent ikinci
  çağrıda ledger kaydı da `GENERATED` durumuyla döndüğü için istemci
  "şimdi üretildi" ile "zaten vardı"yı ayırt edemiyor ve **yanlışlıkla "yeni
  iş emri oluşturuldu" mesajı gösteriyordu**. Bu hata mock'suz gerçek-stack
  doğrulamasında yakalandı; mock'lu Playwright senaryosu yakalayamamıştı.

### TEST RESULTS (18.09.2026, gerçekten çalıştırıldı)

- `pnpm db:generate` OK (şema değişmedi, bu dalda migration yok),
  `pnpm lint` temiz, `pnpm typecheck` 7/7, `pnpm test` **50/50**,
  `pnpm build` 5/5, `pnpm test:e2e` **14/14**.
- Ek olarak mock'suz gerçek stack (yerel PostgreSQL + API + web) üzerinde
  uçtan uca doğrulama: sözleşme oluşturma → "Şimdi Üret" → 3 gerçek iş emri
  (`WO-2026-000001..3`) → ledger'da görünmesi → ikinci üretimin idempotent
  olması → iş emirlerinin İş Emirleri sekmesinde listelenmesi. 1440px ve
  390px görsel kontrol yapıldı, mobilde yatay taşma yok.

### KNOWN ISSUES / bu sırada bulunan bağımsız kusurlar

- **Müşteri oluşturma gerçek API'ye karşı kırık (main'de mevcut, bu dalın
  kapsamı dışında)**: `apps/api/src/customers/customers.schemas.ts` içindeki
  `createCustomerSchema`, `primaryPhone`/`alternatePhone`/`email` için `null`
  kabul etmiyor (`phone.optional()`, `optionalEmail`), ancak
  `apps/web/components/customers.tsx` boş alanları `null` gönderiyor. Bu
  yüzden bu alanlardan biri boş bırakıldığında `POST /customers` 400 dönüyor.
  `updateCustomerSchema` aynı alanlarda `null`'a izin verdiği için düzenleme
  akışı etkilenmiyor. `tests/e2e/foundation.spec.ts`'teki "creates a
  customer" senaryosu POST yanıtını tamamen mock'ladığı için bu hatayı
  yakalayamıyor — yani o test yanlış güven veriyor.
- **Demo veritabanı drift'i**: `.local/postgres` demo veritabanında
  `ServiceAgreement` tablosu ve `service-agreement.*` izinleri vardı ama
  `operations.service-agreements` entitlement satırı yoktu; migration bu
  veritabanına, dosyanın entitlement INSERT'i eklenmeden önceki hâliyle
  uygulanmış. Arayüz bunu doğru şekilde "Bu özellik mevcut planınızda etkin
  değil" hatasıyla gösterdi. Demo veritabanı, migration'daki INSERT'in
  aynısı çalıştırılarak onarıldı; temiz kurulumlar (CI, entegrasyon testi)
  etkilenmiyor.
- `tests/e2e/dispatch-calendar.spec.ts`'teki "week/month toggle" senaryosu
  paralel yük altında bir kez flake etti (ay grid'i 0 gün döndü); aynı dosya
  tek başına 3 kez tekrarlandığında 9/9 geçti ve tam suite tekrar çalışınca
  14/14 yeşil oldu. Bu dalın değişiklikleriyle ilgisi yok, ama takvim testi
  kararlılık açısından izlenmeli.

## GÜNCELLEME: Müşteri oluşturma düzeltmesi ve gerçek-stack smoke paketi (18.09.2026)

`fix/customer-create-nullable-fields` dalı, servis sözleşmeleri arayüzü
çalışılırken bulunan Faz 4 (CRM) hatasını düzeltti ve onu yakalayamayan test
boşluğunu kapattı.

### Düzeltilen hata

`createCustomerSchema` içindeki `primaryPhone`/`alternatePhone`
(`phone.optional()`) ve `email` (`optionalEmail`) alanları `null` kabul
etmiyordu; `apps/web/components/customers.tsx` ise boş bırakılan alanları
`null` gönderiyor. Sonuç: bu alanlardan biri boş bırakıldığında **gerçek
API'ye karşı müşteri oluşturma 400 dönüyordu**. `updateCustomerSchema` aynı
alanlarda `null`'a izin verdiği için yalnızca düzenleme çalışıyordu. Üç alan
artık create ve update tarafından **ortak** `clearablePhone`/`clearableEmail`
tanımlarını kullanıyor, böylece iki şema yeniden ayrışamaz; boş string de
`null`'a normalize ediliyor.

### Neden mock'lu E2E bunu göremedi

`tests/e2e/foundation.spec.ts`'teki "creates a customer" senaryosu POST
yanıtını `page.route` ile tamamen mock'luyor: form ne gönderirse göndersin
test 201 alıyor. Yani mock'lu paket, tarayıcının gönderdiği gövde ile Zod
şemasının kabul ettiği gövde arasındaki ayrışmayı **yapısal olarak**
göremez.

### Eklenen gerçek-stack smoke paketi

`pnpm test:smoke` (`playwright.smoke.config.ts`, `tests/smoke/`): hiçbir mock
kullanmaz; kendi geçici PostgreSQL'ini kurar, migration klasörünü **sırayla
okuyup** uygular (sabit liste tutulmaz — entegrasyon testinde bu daha önce
geride kalmıştı), gerçek API'yi (4100) ve web'in kendi production build'ini
(3200, ayrı `.next-smoke` çıktısı) başlatır, senaryo bitince veritabanını
siler. Senaryo: kayıt → **telefon/e-posta boş** müşteri → iş emri → listede
görme; ayrıca 4xx dönen her `/api/v1/` çağrısını hata sayar.

Ayrı bir config olmasının nedeni: `next dev` aynı proje dizini için ikinci
bir örneğe izin vermiyor, bu yüzden smoke paketi production build'i ayrı bir
çıktı klasöründen servis ediyor; geliştiricinin çalışan `pnpm dev` sunucusu
etkilenmiyor. Paket şu an CI'da çalışmıyor.

**Testin gerçekten koruduğu doğrulandı**: düzeltme geçici olarak geri alınıp
smoke paketi çalıştırıldı ve kırmızı oldu; düzeltme geri konunca yeşile
döndü.

### TEST RESULTS (18.09.2026, gerçekten çalıştırıldı)

- `pnpm db:generate` OK, `pnpm lint` temiz, `pnpm typecheck` 7/7,
  `pnpm test` **50/50**, `pnpm build` 5/5, `pnpm test:e2e` **14/14**
  (mock'lu paket etkilenmedi), `pnpm test:smoke` **1/1**.
- `auth.integration.test.ts` içine, boş iletişim alanlarıyla müşteri
  oluşturmayı API seviyesinde kilitleyen bir senaryo eklendi.

### Taranan diğer create/update şema çiftleri (düzeltilmedi, rapor edildi)

- **Yapısal gözlem**: `jobs` ve `service-agreements` şemalarında update,
  create'in taban nesnesinden `.partial()` ile türetiliyor; `address` ve
  `asset` ise create/update için aynı nesneyi paylaşıyor. Yani bu çiftler
  **tanımı gereği** ayrışamaz. `customers` ise create ve update şemalarının
  birbirinden bağımsız yazıldığı tek yerdi — drift tam olarak orada oluştu.
- `createContactSchema` (aynı nesne `updateContactSchema` olarak da
  kullanılıyor): `phone` `null`/`""` kabul etmiyor, `email` `null` kabul
  etmiyor. Create/update çifti ayrışması yok ve web formu boş alanlar için
  `undefined` gönderdiğinden bugün kırık değil; ancak mevcut bir kişinin
  telefonunu **temizlemenin yolu yok** (alan atlanınca servis onu
  güncellemiyor). Latent kusur.
- `employees.controller.ts` içindeki `createEmployeeSchema`: `phone`,
  `homeCity`, `homeDistrict` `.optional()` ama `.nullable()` değil. Employee
  için update endpoint'i hiç olmadığından çift ayrışması yok; latent.
- `customerFields` içinde kalan asimetri: `nationalId`, `taxNumber`,
  `taxOffice`, `notes` `null` kabul ederken iletişim alanları etmiyordu — bu
  dalda giderildi.

## GÜNCELLEME: Şema nullable tutarlılığı (18.09.2026)

`fix/schema-nullable-consistency` dalı, bir önceki güncellemede taranıp
raporlanan iki latent kusuru kapattı.

- `createContactSchema` (`updateContactSchema` olarak da kullanılıyor) artık
  `phone` ve `email` için `customers.schemas.ts`'teki ortak
  `clearablePhone`/`clearableEmail` tanımlarını kullanıyor. Önceden bu alanlar
  `null`/`""` kabul etmediği için **mevcut bir iletişim kişisinin telefonunu
  temizlemenin yolu yoktu** (alan atlanınca servis onu hiç güncellemiyordu).
  "Telefon veya e-posta gereklidir" kuralı korunuyor: transform boş string'i
  `null`'a çevirdiği için `refine` ikisi de boşken hâlâ reddediyor.
- `createEmployeeSchema` (`employees.controller.ts`) içindeki `phone`,
  `homeCity` ve `homeDistrict` artık `.nullable()`; `employees.service.ts`
  `create()` girdi tipi de buna göre güncellendi. Employee için update
  endpoint'i hâlâ yok, bu yüzden çift ayrışması riski bulunmuyor.
- `optionalEmail` yardımcısı, yerini `clearableEmail` aldığı için kaldırıldı.

### Kalıcı kural

`.claude/skills/code-structure/SKILL.md` içine "Create/update şema çiftleri"
bölümü eklendi: update, create'in taban nesnesinden `.partial()` ile türetilir
ya da aynı nesne paylaşılır — ikisi bağımsız yazılmaz; temizlenebilir alanlar
ortak `clearable*` tanımlarını kullanır ve boş string `null`'a normalize
edilir. Gerekçe olarak bu oturumda yaşanan `customers` drift'i yazıldı.
**Not**: `.claude/` dizini git'te izlenmiyor, bu kural yalnızca yerelde
duruyor; ekiple paylaşılması isteniyorsa dizinin repoya eklenmesi gerekir.

### TEST RESULTS (18.09.2026, gerçekten çalıştırıldı)

- `pnpm db:generate` OK, `pnpm lint` temiz, `pnpm typecheck` 7/7,
  `pnpm test` **50/50**, `pnpm build` 5/5, `pnpm test:e2e` **14/14**,
  `pnpm test:smoke` **1/1**.
- `auth.integration.test.ts`'e üç senaryo eklendi: telefonu boş (`null`)
  iletişim kişisi oluşturma, mevcut bir kişinin telefonunu `null` ile
  temizleme ve telefon+e-postanın ikisi birden boşken hâlâ 400 alınması.
