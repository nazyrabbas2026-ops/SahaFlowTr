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

## Geliştirme akışı

Bu projede geliştirme akışı repoda tanımlıdır: [AGENTS.md](AGENTS.md) dört aşamayı (izole et → inşa et → kanıtla → gönder) anlatır, her aşamanın kuralları `.claude/skills/<isim>/SKILL.md` altında durur. Dosyalar sürüm kontrolünde olduğu için repoyu klonlayan herkes — ve Claude Code gibi bu dosyaları okuyan araçlar — aynı akışı alır; kurallar kişisel yapılandırmada saklı kalmaz.

Tek istisna `.gitignore`'daki `.claude/settings.local.json`'dır: bu dosya Claude Code'un makineye özel izin ayarlarını tutar, paylaşılmaz.

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

## Gerçek stack smoke testi

```powershell
pnpm test:smoke
```

`pnpm test:e2e` paketindeki senaryolar API yanıtlarını `page.route` ile mock'lar; bu, tarayıcının gönderdiği gövde ile API'nin kabul ettiği gövdenin ayrışmasını **yapısal olarak göremez** (gerçek bir örnek: `createCustomerSchema` boş bırakılan telefon/e-posta için `null` kabul etmiyordu, form ise `null` gönderiyordu; mock'lu test yeşil kalmıştı).

`pnpm test:smoke` bu boşluğu kapatır: hiçbir mock kullanmaz, kendi geçici PostgreSQL'ini kurup migration'ları uygular, gerçek API'yi (port 4100) ve gerçek web sunucusunu (port 3200) başlatır, senaryo bitince veritabanını siler. Geliştirme sunucularından (3000/4000) ve mock'lu e2e paketinden (3100) bağımsızdır; `pnpm dev:database`'in çalışıyor olmasına gerek yoktur ve yerel `.local/postgres` verisine dokunmaz. Yeni bir migration eklendiğinde ayrıca bir listeye eklemek gerekmez, migration klasörü sırayla okunur.

Paket henüz CI'da çalışmıyor (CI adımları için `.github/workflows/ci.yml`); yeni bir uçtan uca akış eklerken yerelde çalıştırın.

Not: Next.js `apps/web/next-env.d.ts` dosyasını kendisi üretir ve son çalışan build'in çıktı klasörünü yazar; `pnpm test:smoke` sonrası bu dosya değişmiş görünebilir. Bu değişiklik commit edilmez, `git checkout -- apps/web/next-env.d.ts` ile geri alınır.

Plan: [docs/implementation-plan.md](docs/implementation-plan.md). Ürün referansı ve boşluk analizi: [docs/product-reference-gap-analysis.md](docs/product-reference-gap-analysis.md). Faz sonuçları: [docs/phase-reports.md](docs/phase-reports.md).

## Tarayıcı doğrulaması

Yerel Edge gerekir. `pnpm test:e2e` web ve API süreçlerini test portlarında otomatik başlatır; responsive workspace, müşteri oluşturma/360, health, kayıt formu ve giriş hata akışlarını kontrol eder. Veritabanı tenant izolasyonu ayrıca entegrasyon paketinde gerçek PostgreSQL ile doğrulanır.
