# SahaFlow TR

Türkiye odaklı saha servis SaaS. Foundation, Auth + Organization + RBAC, gerçek veriye bağlı Application Shell ve CRM / Customers tamamlandı. UI üzerindeki yol haritası işletme verisi değildir.

## Gereksinimler

Node.js 24, pnpm 11.19.0, Docker Engine + Compose v2. Windows için Docker Desktop Linux containers / WSL2 gerekir.

## Yerel geliştirme (PowerShell)

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate
docker compose up -d postgres redis minio storage-init
$env:DATABASE_URL = 'postgresql://sahaflow:local-development-only@localhost:5432/sahaflow?schema=public&connect_timeout=3'
pnpm db:migrate
Get-Content .env | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object { $key, $value = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($key, $value, 'Process') }
pnpm dev
```

`.env.example` yalnızca yerel geliştirme değerleri içerir. Üretimde ayrı secret yönetimi ve farklı erişim bilgileri kullanın. Root .env pnpm süreçlerine otomatik yüklenmez; yukarıdaki adım shell ortamına aktarır.

Docker bulunmayan yerel geliştirme ortamında repository ile gelen gerçek PostgreSQL binary'si kullanılabilir:

```powershell
pnpm dev:database
pnpm dev:api:local
```

İlk komut veriyi `.local/postgres` altında saklar, migration'ları uygular ve `DATABASE_URL` için `.env.example` ile aynı 5432 portunu kullanır. İkinci komut API'yi yerel geliştirme ayarlarıyla başlatır. Komutlar ayrı terminallerde açık tutulmalıdır.

## Tam Docker ortamı

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose up -d --build
```

Migration servisi API'den önce tamamlanır. Storage-init private bucket oluşturur. Volume silmek verileri siler; normal durdurma için `docker compose down` kullanın.

Web: http://localhost:3000 · API: http://localhost:4000/api/v1/health · OpenAPI: http://localhost:4000/api/docs · MinIO: http://localhost:9001.

`/api/v1/health` process liveness; `/api/v1/health/ready` PostgreSQL, Redis ve bucket erişimini doğrular ve eksik serviste 503 döner. Web `/api/health` backend readiness proxy'sidir.

## Kalite kontrolleri

```powershell
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test`, tüm migration'ları geçici gerçek PostgreSQL 18 üzerinde uygulayıp auth, RBAC, tenant isolation, müşteri 360, audit, optimistic update ve refresh replay senaryolarını da çalıştırır. Prisma şema güncellemesinde migration oluşturun; yalnızca client generate etmek yeterli değildir.

Plan: [docs/implementation-plan.md](docs/implementation-plan.md). Ürün referansı ve boşluk analizi: [docs/product-reference-gap-analysis.md](docs/product-reference-gap-analysis.md). Faz sonuçları: [docs/phase-reports.md](docs/phase-reports.md).

## Tarayıcı doğrulaması

Yerel Edge gerekir. `pnpm test:e2e` web ve API süreçlerini test portlarında otomatik başlatır; responsive workspace, müşteri oluşturma/360, health, kayıt formu ve giriş hata akışlarını kontrol eder. Veritabanı tenant izolasyonu ayrıca entegrasyon paketinde gerçek PostgreSQL ile doğrulanır.
