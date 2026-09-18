---
name: prove-it
description: SahaFlowTr'de bir işi tamamlandı saymadan önce zorunlu doğrulama aşaması — CI'daki gerçek sırayla db:generate/lint/typecheck/test/build/test:e2e çalıştırma ve migration adlandırma kontrolü. Kod değişikliği bittiğinde, commit/PR atmadan önce kullan.
---

# prove-it (Kanıtla)

SahaFlowTr dört aşamalı akışın üçüncü adımı. **Bu adım geçilmeden hiçbir iş
"tamamlandı" olarak raporlanmaz.** `.github/workflows/ci.yml` içindeki
`foundation` job'ının adımlarını aynı sırayla, yerelde çalıştır:

```powershell
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium   # sadece ilk kurulumda / eksikse
pnpm test:e2e
```

## Sıra ve gerekçe

1. **`pnpm db:generate`** — Prisma client'ı şemadan yeniden üretir. Şema
   değiştiyse önce bu, aksi halde sonraki adımlar eski client ile yanlış
   sonuç verir.
2. **`pnpm lint`** — ESLint (flat config, `typescript-eslint` recommended).
3. **`pnpm typecheck`** — Turbo üzerinden tüm workspace'lerde `tsc --noEmit`.
4. **`pnpm test`** (Vitest) — unit testlerin yanı sıra, gerçek migration'ları
   ephemeral PostgreSQL 18 üzerine uygulayıp tenant isolation, RBAC, audit,
   optimistic update ve refresh replay gibi entegrasyon senaryolarını da
   çalıştırır. Bu adımı atlamak veya sadece unit testleri çalıştırmak yeterli
   değildir.
5. **`pnpm build`** — tüm workspace paketlerinin production build'i.
6. **`pnpm test:e2e`** (Playwright) — web ve API süreçlerini test portlarında
   otomatik başlatıp responsive UI, health/readiness ve auth/CRM akışlarını
   doğrular. Web veya UI etkileyen bir değişiklik yaptıysan bu adımı atlama;
   sadece backend-only, UI'a dokunmayan bir değişiklikse ve zaman kısıtlıysa
   gerekçesini belirterek atlayabilirsin, ama varsayılan davranış çalıştırmaktır.

## Migration kontrolü

Prisma şemasında değişiklik yaptıysan:

- `pnpm --filter @sahaflow/database migrate:create` ile migration üret,
  sadece `generate` çalıştırmak yeterli değildir (bkz. README: "Prisma şema
  güncellemesinde migration oluşturun; yalnızca client generate etmek yeterli
  değildir").
- Migration klasör adı `YYYYMMDDHHmmss_isim` formatında olmalı (örn.
  `20260915122624_field_service_operations`). Elle oluşturuyorsan bu formatı
  koru; farklı bir tarih/isim şeması kullanma.
- Migration'ın `pnpm test` sırasında gerçek PostgreSQL'e sorunsuz uygulandığını
  doğrula (test suite zaten bunu yapar; başarısız olursa migration'ı düzelt).

## Manuel doğrulama

- Mutlu yolu ve en az bir uç durumu (örn. cross-tenant erişim denemesi, eksik
  permission, geçersiz input) elle veya testle doğrula.
- İlgili diğer modüllerde regresyon olup olmadığını kontrol et (özellikle
  paylaşılan `packages/domain` fonksiyonlarını değiştirdiysen).

## Raporlama

Yukarıdaki komutlardan hangilerinin çalıştırıldığını ve sonucunu (geçti/
kaçtı, kaç test) açıkça belirt. Çalıştırmadığın bir adım varsa bunu gizleme,
nedenini söyle. Tüm adımlar geçmeden `ship-it` skill'ine geçme.
