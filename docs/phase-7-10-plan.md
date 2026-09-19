# Faz 7–10 uygulama planı — Teklif, Fatura/Ödeme, Stok

Bu belge Faz 7 (Quotes), Faz 9 (Finance) ve Faz 10 (Inventory) için onaylanmış
kapsamı, alınan kararları, PR sırasını ve kapsam dışı bırakılanları gerekçeleriyle
kaydeder. Faz 8 (Service Reports) bilinçli olarak ertelendiği için bu belge
7–9 değil 7–10 aralığını adlandırır; erteleme kaydı ve ona bağlı kısıt aşağıdadır
ve `phase-reports.md` içinde de tekrarlanır.

Bu plan `implementation-plan.md` içindeki faz tablosunun ve
`product-reference-gap-analysis.md` içindeki faz ek gereksinimlerinin yerine
geçmez; ikisini birlikte uygulanabilir bir iş sırasına çevirir.

## 1. Faz eşlemesi

Konuşma dilinde "teklif, fatura, stok" üçlüsü sık sık "Faz 7-8-9" diye anılıyor.
Plandaki gerçek eşleme farklı ve bu belge boyunca plandaki numaralar kullanılır:

| Faz | Modül                                            | Bu plandaki durumu       |
| --- | ------------------------------------------------ | ------------------------ |
| 7   | Quotes                                           | Kapsamda                 |
| 8   | Service Reports                                  | **Ertelendi** (bkz. 2.1) |
| 9   | Finance — Invoice / Payment / maliyet / komisyon | Kapsamda                 |
| 10  | Inventory                                        | Kapsamda                 |

## 2. Onaylanan kararlar

### 2.1 Faz 8 ertelendi, malzeme tüketiminin kanonik yolu İş Emri'dir

Faz 8 (Servis Raporları) bu turda yapılmayacak. Bunun doğrudan bir sonucu var:
`StockMovement.reason = JOB_CONSUME` hareketinin doğal kaynağı
`ServiceReportMaterial` idi.

Karar: **malzeme tüketimi PR 17'de İş Emri'ne bağlı kanonik yol olarak kurulur.**
Faz 8 geldiğinde `ServiceReport`, bu hareketleri **referans alır**; kendi paralel
stok düşüm yolunu açmaz. Servis raporu malzeme listesi, iş emri üzerinde oluşmuş
`StockMovement` kayıtlarının bir görünümü/eşlemesi olarak uygulanır.

Gerekçe: iki ayrı giriş noktası, aynı malzemenin iki kez düşülmesine ve maliyet
subledger'ında (ADR-008, append-only) çift kayda yol açar. Tek yazma yolu,
idempotency'yi tek yerde korumayı mümkün kılar.

Faz 8 gate'i, Faz 11 (Analytics) veya Faz 13 (Mobile) başlamadan önce yeniden
açılmalıdır; plandaki uçtan uca zincir ("… → saha → teklif onayı → **servis** →
fatura → ödeme") Faz 8 olmadan kapanmaz.

### 2.2 Para BigInt'e çevriliyor (PR 1)

Şemadaki tüm `*Minor` alanları `Int` (int4) idi; bu ADR-003'ün ("bigint minor
currency units") ihlaliydi ve int4 tavanı 21.474.836,47 TRY'ye denk geliyordu.

Karar: tüm parasal sütunlar **`BigInt`**'e çevrilir ve `packages/domain/money.ts`
`bigint` üzerinden çalışacak şekilde yeniden yazılır. API sınırında **tek bir
serializer** kurulur; `bigint` JSON'a doğrudan serialize edilemediği için bu
dönüşüm modül modül tekrarlanmaz, ortak bir yerde yapılır.

Zamanlama gerekçesi: bu tablolar migrate edilmiş ama **boş** ve hiçbir servis
kodu tarafından okunmuyor. Dönüşüm şimdi veri taşıma ve API kırılması olmadan
yapılabilir; servis katmanı yazıldıktan sonra aynı değişiklik breaking API
değişikliğine dönüşür.

### 2.3 KDV `vatRateBps Int`'e geçiyor (PR 1)

`enum VatRate { EXEMPT, VAT_ONE, VAT_TEN, VAT_TWENTY }` ne basis point ne de
ayarlanabilirdi; `implementation-plan.md` ise "KDV ayarlanabilir basis point"
diyor.

Karar: satır ve katalog seviyesinde **`vatRateBps Int`** tutulur (%20 → `2000`,
%10 → `1000`, %1 → `100`, istisna → `0`). `VatRate` enum'u yalnızca UI preset
listesi olarak kalabilir veya tamamen kaldırılabilir; veri modeli enum'a
bağlanmaz.

Gerekçe: KDV oranları mevzuatla değişiyor (2023'te %8 → %10 ve %18 → %20).
Enum'la her oran değişikliği migration ve veri yeniden yazımı gerektirir; basis
point'le yalnızca yeni kayıtların değeri değişir, geçmiş belgeler kendi oranını
taşımaya devam eder.

### 2.4 Kuyruk önceliklendirmesi — "ticari doğrulama sonrası"

Hedef zincir: **katalog → teklif → fatura → ödeme kaydı** uçtan uca çalışsın.

Bu zincire girmeyen üç iş ilk turda yapılmaz ve planda "ticari doğrulama sonrası"
olarak işaretlenir:

- PR 11 — Refund / write-off / iptal
- PR 14 — Sürümlü komisyon kuralları
- PR 18 — Tedarikçi ve satın alma

Bunlar iptal edilmedi; gerçek kullanımdan gelen ihtiyaç doğrulandıktan sonra
sıraya alınacak. İşaretlenmelerinin gerekçesi, üçünün de hedef zincirin
çalışması için gerekli olmaması ve üçünün de kendi veri modeli kararlarını
(sürümleme, onay akışı, ters kayıt kuralları) gerçek kullanım verisi olmadan
erken dondurma riski taşımasıdır.

### 2.5 Sürümlü fiyat kataloğu (PriceBook) MVP'de yok

Faz 7 kabul ölçütünde "sürümlü fiyat kataloğu/şablon" geçiyor. Bu, ayrı bir
fiyat kitabı modeli (`PriceBook` / `CatalogItemPrice` + `effectiveFrom`) olarak
**uygulanmayacak.**

Karar: fiyat sürümlemesi **satır bazlı snapshot** ile karşılanır. `QuoteLine` ve
`InvoiceLine` kendi `unitPriceMinor`, `vatRateBps` ve `name` değerlerini
taşıdığı için bir teklif veya fatura, katalog fiyatı sonradan değişse bile
düzenlendiği andaki fiyatı korur. Belgenin fiyat geçmişi ihtiyacını karşılayan
şey budur.

Karşılanmayan tek şey, kataloğun **kendi** fiyat geçmişini sorgulayabilmektir
("bu ürünün fiyatı 6 ay önce neydi"). Bu bilinçli olarak dışarıda bırakıldı:
tek başına bir model, geçerlilik tarihi çözümlemesi ve fiyat seçimi mantığı
gerektiriyor, hedef zincire (katalog → teklif → fatura → ödeme) katkısı yok ve
`CatalogItem` üzerindeki `version` alanı ile audit kaydı kimin ne zaman fiyat
değiştirdiğini zaten izlenebilir kılıyor.

Yani bu bir unutma değil, kapsam kararıdır. Müşteriye özel fiyat listesi de
aynı gerekçeyle kapsam dışıdır; teklifler katalog liste fiyatından başlar.

## 3. Şema durumu ve gerekli migration'lar

Faz 7–10 modellerinin tamamı `20260915122624_field_service_operations`
migration'ı ile zaten oluşturulmuş durumda (29 tablo), ancak hiçbirinin servis
katmanı yok. Tablolar boş; şema düzeltmeleri şu an veri kaybı riski taşımıyor.

Şema **olduğu gibi kullanılamaz**. Katalog ve teklif tarafı büyük ölçüde hazır;
ödeme ve stok tarafı kabul ölçütlerini karşılamıyor.

### Sistem geneli düzeltmeler (PR 1)

- Tüm `*Minor` sütunları `Int` → `BigInt` (ADR-003).
- `vatRate` enum → `vatRateBps Int`.
- `money.ts` `bigint` tabanlı yeniden yazım + eksik olan `money.test.ts`.
- `summarizeLines` düzeltmesi: belge seviyesindeki indirimde KDV oransal olarak
  **ölçekleniyor**; karışık oranlı (%20 + %10) belgelerde bu birkaç kuruş sapma
  üretir. KDV satır bazında yeniden hesaplanmalı. Yuvarlama satır bazında ve
  half-up'tır; bu davranış `money.ts` içinde yorumla belgelenir.

### Faz 7 için eksikler

- **`QuoteOption` yok.** Ekonomik/Önerilen/Premium ayrımı yapılamıyor.
  `QuoteLine.optionId` ve `Quote.selectedOptionId` gerekiyor.
- **`QuoteEvent` yok.** sent/delivered/viewed/option_selected/accepted/rejected/
  expired zaman çizelgesi kabul ölçütünün açık maddesi.
- **Kabul snapshot'ı eksik.** Yalnızca `approvedAt` ve `approvedByName` var;
  IP, user-agent, sözleşme metni sürümü ve imza kanıtı yok.
- **`Quote.jobId` çift anlamlı.** Kaynak iş mi, dönüşümle doğan iş mi belirsiz.
  İdempotent dönüşüm için ayrı `convertedJobId` ve unique kısıt gerekir.
- `ServicePackageItem.packageName` ölü/denormalize alan görünüyor; temizlik adayı.
- "Sürümlü fiyat kataloğu" için ayrı bir fiyat geçmişi modeli yok. Karar: satır
  bazlı fiyat snapshot'ı (`QuoteLine` kendi `unitPriceMinor`'ını taşıyor) bu tur
  için yeterli sayılır; ayrı PriceBook modeli kapsam dışıdır.

### Faz 9 için eksikler

- **`PaymentAllocation` yok.** `Payment.invoiceId` zorunlu ve doğrudan; kısmi ve
  çoklu fatura ödemesi modellenemiyor. Kabul ölçütünün açık maddesi.
- **`Refund` modeli yok.** `PaymentStatus.REFUNDED` var ama ters kayıt, deposit
  ve payment schedule yok. (Ticari doğrulama sonrası — PR 11.)
- **Webhook idempotency'si yok.** `providerIntentId` index'i unique değil ve
  `WebhookEvent` modeli hiç yok; webhook tekrarı ikinci tahsilat üretebilir.
- **`CommissionRule` zayıf.** `basis` serbest `String`, sürümleme
  (`effectiveFrom`/`version`), hedef (rol/teknisyen/kategori) ve onay/reversal
  durumu yok. (Ticari doğrulama sonrası — PR 14.)
- **`CostLine` kaynak bağı yok.** `timeEntryId`/`stockMovementId` olmadığı için
  aynı zaman kaydı veya malzeme iki kez maliyete yazılabilir; `reversalOfId` de
  yok (ADR-008 append-only + ters kayıt).

### Faz 10 için eksikler

- **`StockMovement.jobId`'nin Job ilişkisi ve composite FK'sı yok** — ADR-002
  ihlali. Başka tenant'ın veya var olmayan bir işin id'si yazılabilir.
- `StockMovement.fromLocationId` ve `toLocationId`'nin ikisi birden NULL
  olabiliyor; CHECK constraint gerekiyor. `reversalOfId` yok.
- **Rezervasyon kaydı yok.** `StockLevel.reserved` sütunu var ama kimin hangi iş
  için rezerve ettiği bilinmiyor; serbest bırakma ve süre dolumu yapılamaz.
  `JobMaterialReservation` gerekiyor.
- **Negatif stok politikası tenant ayarı yok.**
- `StockLocation.member` ilişkisi `onDelete: Cascade`, hareketler `NoAction`:
  üye silme FK hatasıyla patlar. (`202609140002` migration'ındaki sorunla aynı
  sınıf.)
- `Supplier`, `PurchaseRequest`, `PurchaseOrder`, `GoodsReceipt` yok.
  (Ticari doğrulama sonrası — PR 18.)

## 4. Bağımlılık sırası

```text
CatalogItem  ──┬──> ServicePackage ──> Quote ──> Quote onayı ──> Job (idempotent)
   (kök)       │                         │
               │                         └──> Invoice ──> Payment / Allocation
               │                                              │
               └──> StockLocation/Level ──> StockMovement ────┤
                          │                                   v
                          └──> Rezervasyon ──> CostLine ──> Komisyon
```

- `CatalogItem` kökte: `QuoteLine`, `InvoiceLine`, `StockLevel`,
  `StockMovement`, `CostLine` ve `ServiceReportMaterial` ona bağlı. Önce o gelir.
- Teklif onaylanınca iş doğar (`Quote.convertedAt` + yeni Job); teklif var olan
  bir işten de çıkabilir (`Quote.jobId`). Her iki yön de destekleniyor, bu yüzden
  dönüşüm alanının ayrıştırılması şart.
- Fatura hem Job'dan hem Quote'tan beslenebilir; `Invoice.jobId` ve
  `Invoice.quoteId` ikisi de nullable. Pratik kural: hizmet işi → iş bitince
  Job'dan fatura; ürün satışı → Quote'tan doğrudan fatura.
- Stok hareketi **iş emrine** bağlanır, servis raporuna değil (karar 2.1).
- Maliyet ve komisyon en sonda: `CostLine` hem `TimeEntry`'den (Faz 5) hem
  `StockMovement`'tan besleniyor.

**Paralellik:** PR 2 (katalog) bloklayıcıdır. PR 4'ten sonra teklif hattı
(PR 5–8) ve stok hattı (PR 15–17) paralel ilerleyebilir; ikisi de yalnızca
kataloğa bağlıdır. Fatura hattı teklif hattından sonra gelir.

## 5. PR sırası

Her PR kendi branch'inde ilerler ve dört aşamalı akıştan geçer
(`new-feature` → `code-structure` → `prove-it` → `ship-it`). Her PR kendi UI'ını
da içerir: gap analysis "bir feature flag veya boş menü maddesi tamamlandı kabul
edilmeyecektir" diyor.

### Temel

| PR  | İş                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Para/KDV temeli.** `*Minor` → `BigInt`, `vatRate` → `vatRateBps`, API sınırında tek serializer, `money.ts` bigint'e taşınır, belge indirimi KDV hatası düzeltilir, `money.test.ts` eklenir. Migration + `packages/domain`; API modülü yok. |
| 2   | **CatalogItem CRUD.** `apps/api/src/catalog`, `inventory.read` / `inventory.manage` guard'ları, SKU unique, arşivleme, web katalog ekranı.                                                                                                   |
| 3   | **ServicePackage + paket kalemleri.** Paket/add-on yapısı, kataloğa bağlı satırlar, `packageName` temizliği.                                                                                                                                 |

### Teklif hattı — Faz 7

| PR  | İş                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | **Quote CRUD + satır hesaplama.** `QuoteOption` migration'ı, satır ve opsiyon toplamları, `OrganizationSequence` ile teklif numarası, DRAFT yaşam alanı, web teklif editörü.            |
| 5   | **Teklif yaşam döngüsü + `QuoteEvent` timeline.** Model migration'ı, SENT/REJECTED/EXPIRED geçişleri, revizyon (`parentQuoteId`), süre dolumu için worker işi.                          |
| 6   | **Güvenli teklif kabulü.** Public link (tek mekanizma seçilir: `shareTokenHash` veya `PortalAccessGrant`), membership'siz controller + rate limit, kabul snapshot'ı migration'ı, audit. |
| 7   | **Teklif PDF.** pdfkit (bağımlılıkta mevcut) + `AuditDocument` kaydı + MinIO signed URL. Faz 8'in servis PDF'i bu altyapıyı yeniden kullanır.                                           |
| 8   | **Teklif → İş dönüşümü (idempotent).** `convertedJobId` + unique kısıt, tek transaction, "aynı tekliften iki iş üretilemez" negatif testi. → **Faz 7 gate.**                            |

### Fatura hattı — Faz 9

| PR  | İş                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | **Invoice CRUD + satır/toplam + numaralandırma.** Seri+yıl sequence, Job'dan ve Quote'tan besleme, DRAFT → SENT, web fatura ekranı.                                                             |
| 10  | **Payment + `PaymentAllocation`.** `Payment.invoiceId`'yi kaldıran migration, kısmi ve çoklu fatura ödemesi, fatura durumunun aynı transaction içinde yeniden hesabı, `payment.record` guard'ı. |
| 11  | _(ticari doğrulama sonrası)_ **Refund / write-off / iptal.** `Refund` modeli, ters kayıt kuralları, audit.                                                                                      |
| 12  | **Ödeme sağlayıcı soyutlaması + idempotent webhook.** Provider-agnostic port, açıkça "mock" etiketli adapter, `WebhookEvent` + unique provider event id, signature + timestamp doğrulaması.     |
| 13  | **Maliyet ledger'ı (işçilik + yol).** `CostLine`'a `timeEntryId` / `reversalOfId` migration'ı, `TimeEntry`'den idempotent besleme.                                                              |
| 14  | _(ticari doğrulama sonrası)_ **Sürümlü komisyon kuralları.** `CommissionRule` migration'ı (enum `basis`, `effectiveFrom`, hedef, onay/reversal), hesaplama + audit.                             |

### Stok hattı — Faz 10

| PR  | İş                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | **Stok lokasyonu + seviye görünümü.** `StockLocation` CRUD, üye silme politikası düzeltmesi, eldeki / rezerve / kullanılabilir ayrımı.                                                                    |
| 16  | **Atomik stok hareketleri.** `StockMovement` composite FK düzeltmesi (ADR-002), from/to CHECK constraint, `reversalOfId`, negatif stok politikası tenant ayarı, satır kilidiyle transaction, yarış testi. |
| 17  | **İş bazlı rezervasyon + tüketim.** `JobMaterialReservation` modeli, rezerve / serbest bırak / tüket, `CostLine` MATERIAL beslemesi. **Malzeme tüketiminin kanonik yolu burasıdır** (karar 2.1).          |
| 18  | _(ticari doğrulama sonrası)_ **Tedarikçi + satın alma.** `Supplier`, `PurchaseOrder`, `GoodsReceipt` → mal girişi. Büyürse 18a (tedarikçi + PO) ve 18b (mal kabul) olarak bölünür.                        |

Faz 10 gate'i, PR 18 ticari doğrulama sonrasına bırakıldığı için PR 17
tamamlandığında **kısmen** karşılanır; faz kapanışı satın alma akışı gelene
kadar açık kalır ve bu `phase-reports.md` içinde böyle kaydedilir.

## 6. Türkiye'ye özgü kurallar

### Kapsamda

- **KDV oranları**: %0 (istisna), %1, %10, %20. Basis point olarak saklanır
  (karar 2.3). Matrah iskonto sonrası hesaplanır; mevcut `QuoteLine` hesabı bu
  yönüyle doğru kurgulanmıştır.
- **Belge numaralandırma**: `OrganizationSequence` (`organizationId` + `key` +
  atomik `nextValue`) zaten var ve müşteri numarasında kullanılıyor; yeni model
  gerekmiyor. Key seri ve yıl kırılarak kullanılır (örn. `invoice:SF:2026`), böylece
  yıl başında sıfırlanan, tenant içi boşluksuz bir seri elde edilir.
  `@@unique([organizationId, invoiceNumber])` zaten mevcut.
- **Vergi kimliği doğrulaması**: `Customer.taxNumber` / `taxOffice` alanları var
  ama VKN/TCKN format ve checksum doğrulaması yok; PR 9'da eklenir.

### Kapsam dışı ve gerekçeleri

- **e-Fatura / e-Arşiv entegrasyonu — kapsam dışı.** GİB entegratör credential'ı
  yok. ADR-003 uydurma endpoint'i, ADR-004 işlevsiz kontrolü yasaklıyor; plan
  tablosunda e-belge sözleşmeleri zaten **Faz 12**'ye ait. `IntegrationKind`
  enum'unda `E_INVOICE` yok, `ACCOUNTING` var — bu doğru ve korunacak.
  - **Bağlayıcı sonuç:** e-Fatura/e-Arşiv belge numarası (3 harf seri + 4 hane
    yıl + 9 hane sıra) belge zincirinde atanır, bizde değil. Bizim
    `invoiceNumber` alanımız **dahili belge numarasıdır**; UI'da bu şekilde
    etiketlenir ve resmî belge izlenimi verecek biçimde sunulmaz. `einvoiceUuid`
    gibi alanlar şimdi eklenmez; Faz 12'de gerçek entegrasyonla birlikte gelir.
- **Gerçek ödeme sağlayıcı (iyzico, PayTR vb.) — kapsam dışı.** Credential yok.
  PR 12'de yapılacak olan provider-agnostic port ve açıkça mock etiketli
  adapter'dır; gerçek tahsilat iddiası yapılmaz.
- **İYS** — Faz 12.
- **Muhasebe export (Logo / Mikro / Netsis)** — ADR-008 gereği hedef, ama Faz 12.
  Faz 9'da yalnızca export edilebilir, temiz belge ve hareket yapısı bırakılır.
- **Lot / seri / barkod takibi** — kapsam dışı. `CatalogItem.serialized` bayrağı
  var ama model yok; tek başına birkaç PR'lık iş ve saha servisi akışında sıcak
  yol değil.
- **Fiyat kitabı (PriceBook) ve müşteriye özel fiyat listesi** — kapsam dışı.
  Satır bazlı fiyat snapshot'ı yeterli sayıldı. `Customer` üzerinde fiyat
  profili alanı da yok; teklifler katalog liste fiyatından başlar.
- **Teklif funnel analitiği** — Faz 11.
- **Müşteri portalında teklif/fatura görünümü** — Faz 14. PR 6'daki public kabul
  linki bunun yerine geçmez; tek bir belgeye süreli, kapsamlı erişimdir.

## 7. Ek kabul/test kapıları

`product-reference-gap-analysis.md` içindeki kapılardan bu planı doğrudan
bağlayanlar:

- Teklif toplamı paket / add-on / KDV / indirim kombinasyonlarında bigint ile
  deterministik hesaplanır (PR 1, PR 4).
- Teklif kabulünden aynı iş iki kez üretilemez (PR 8).
- Payment webhook tekrarında ikinci tahsilat veya allocation oluşmaz (PR 12).
- Stok rezervasyon ve tüketim yarışı negatif stok politikasını ihlal etmez
  (PR 16, PR 17).
- Başka tenant'ın fiyat kitabı, tedarikçi ve purchase order kaydına erişim
  reddedilir (her PR'ın negatif integration testi).
