---
name: code-structure
description: SahaFlowTr'de kod yazarken/organize ederken uygulanacak inşa aşaması — NestJS modül deseni, tenant izolasyonu, RBAC, para/KDV ve hassas veri kuralları. Backend (apps/api), domain (packages/domain) veya Prisma şeması (packages/database) değişikliği yaparken kullan.
---

# code-structure (İnşa et)

SahaFlowTr dört aşamalı akışın ikinci adımı. `new-feature` ile planlama
bittikten sonra, kodu şu konvansiyonlara göre yaz.

## NestJS modül deseni

Her `apps/api/src/<modül>` klasörü şu dosyaları içerir ve bu düzeni bozma:

- `*.module.ts` — modül tanımı, provider/import kayıtları.
- `*.controller.ts` — HTTP katmanı, guard'lar burada uygulanır.
- `*.service.ts` — iş mantığı, Prisma erişimi.
- `*.schemas.ts` — Zod ile request/response validation.

Yeni bir modül eklerken mevcut modüllerden birini (örn. `customers` veya
`jobs`) referans al; guard sırası, hata yönetimi ve OpenAPI dekoratör
kullanımını aynı şekilde tekrarla.

## Create/update şema çiftleri

- Bir create/update şema çifti yazarken update'i create'in taban nesnesinden
  `.partial()` ile türet ya da aynı nesneyi paylaş; **ikisini bağımsız
  yazma.** Bağımsız yazıldıklarında zamanla ayrışırlar ve hata yalnızca
  akışlardan birinde ortaya çıkar.
- Temizlenebilir alanlar (telefon, e-posta gibi) için ortak `clearable*`
  tanımlarını kullan ve boş string'i `null`'a normalize et — aksi hâlde
  "kullanıcı alanı temizledi" ile "kullanıcı hiçbir şey yazmadı"
  veritabanında iki ayrı duruma dönüşür.
- Gerekçe (gerçekten yaşandı): `createCustomerSchema` ile
  `updateCustomerSchema` bağımsız yazılmıştı; update `null` kabul ederken
  create etmiyordu. Web formu boş alanı `null` gönderdiği için müşteri
  **oluşturma** gerçek API'ye karşı 400 dönüyordu, düzenleme çalışıyordu.
  Aynı kör nokta `createContactSchema`'da bir alanı temizlemeyi imkânsız
  kılmıştı. Mock'lu E2E testi bunu göremedi; bkz. `pnpm test:smoke`.

## Tenant izolasyonu ve RBAC

- Her tenant'a ait tablo `organizationId` taşır; ilişkili tablolar composite
  `(organizationId, ...)` foreign key ile bağlanır (örn.
  `(organizationId, customerId)`, `(organizationId, roleId)`). Yeni bir
  ilişki eklerken bu composite FK deseninden ayrılma — tek başına
  `customerId` veya `roleId` ile bağlama cross-tenant sızıntıya açık kapı
  bırakır.
- Yetkilendirme deny-by-default'tur: yeni bir endpoint, aktif membership ve
  ilgili permission guard'ı geçmeden hiçbir tenant verisine erişemez. Yeni bir
  permission gerekiyorsa `Permission`/`RolePermission` üzerinden tanımla, guard
  içinde sabit kodlanmış bypass ekleme.
- Teknisyen atama ve portal customer scope gibi ek kısıtları olan alanlarda bu
  ek kısıtı da guard/service seviyesinde uygula, sadece UI'da gizleme.

## Para ve KDV

- Tüm parasal alanlar bigint, minor currency unit (kuruş) cinsinden saklanır.
  Ondalık/float ile para tutma veya hesaplama ekleme; Prisma sütunu `BigInt`,
  TypeScript tarafı `bigint`'tir.
- `bigint` JSON'a serialize edilemez. Dönüşüm API sınırında tek noktada,
  `BigIntSerializerInterceptor` içinde yapılır ve değer dizgi olarak gider
  (`12345n` → `"12345"`). Modül içinde kendi dönüşümünü yazma.
- KDV oranı basis point cinsinden `vatRateBps Int` sütununda tutulur (%20 →
  `2000`); enum kullanma, oranlar mevzuatla değişir. Preset listesi
  `packages/domain` içindeki `VAT_RATE_PRESETS_BPS`'tedir.
- Yuvarlama satır bazında ve sıfırdan uzağa yarım yukarı yapılır; hesabı
  kendin yazma, `packages/domain/src/money.ts` içindeki `priceLine` ve
  `summarizeLines` fonksiyonlarını kullan. Belge seviyesindeki indirim
  satırlara dağıtılır ve KDV indirimli matrahtan yeniden hesaplanır.

## Hassas veri

- TCKN gibi kimlik/hassas alanlar asla düz metin yazılmaz veya loglanmaz.
  Mevcut şifreleme deseni (`Customer` modelindeki ciphertext + son dört hane
  ayrı alan yaklaşımı) tekrarlanır.
- Audit-tetikleyen mutasyonlar (`AuditLog`) için hassas veri maskelenmiş
  şekilde kaydedilir.

## Genel

- Fonksiyon ve dosyaları tek sorumluluklu tut; var olan yardımcı fonksiyon/
  pattern'i (`packages/domain` içindeki `money.ts`, `geo.ts`, `dispatch.ts`
  gibi) tekrar yazmak yerine kullan.
- Yalnızca mantığın kendinden anlaşılmadığı yerlere yorum ekle.
- Strict TypeScript ve mevcut ESLint/Prettier ayarlarına uy; yeni bir
  bağımlılık eklerken workspace sürüm sabitleme (lockfile) prensibini koru.

Kod tamamlandığında `prove-it` skill'ine geç.
