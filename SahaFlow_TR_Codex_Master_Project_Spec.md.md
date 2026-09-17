# SAHAFLOW TR
## Türkiye Odaklı Saha Servis Yönetim Platformu
### Codex için Master Proje Senaryosu + Ürün Gereksinimleri + Teknik Mimari + Geliştirme Talimatı

> **Belgenin amacı:** Bu dosya doğrudan Codex'e verilmek üzere hazırlanmıştır. Hedef; saha servis, bakım, teknik servis, tesisat, elektrik, klima/HVAC, beyaz eşya, temizlik, peyzaj, havuz, güvenlik, bina bakım, küçük inşaat ve benzeri hizmet şirketlerinin tüm operasyonunu tek merkezden yöneten, Türkiye'ye yerelleştirilmiş, modern ve ölçeklenebilir bir SaaS ürün geliştirmektir.
>
> **Önemli sınır:** Orcatec yalnızca ürün kategorisi ve iş akışı açısından referanstır. Arayüz, kaynak kod, marka, metinler, ikon sistemi, ekran düzeni ve görsel varlıklar birebir kopyalanmayacaktır. SahaFlow TR kendi tasarım sistemi, kendi kullanıcı deneyimi ve kendi mimarisiyle geliştirilecektir.

---

# 1. PROJE VİZYONU

Türkiye'de saha hizmeti veren küçük, orta ve büyüyen işletmeler genellikle operasyonlarını WhatsApp, Excel, telefon, kağıt servis formu, banka hareketleri ve birbirinden kopuk muhasebe sistemleri arasında yürütmektedir.

SahaFlow TR'nin görevi bu dağınık süreci tek bir dijital operasyon merkezine dönüştürmektir.

Sistem şu uçtan uca döngüyü yönetmelidir:

**Müşteri Talebi → Müşteri Kaydı → Randevu → İş Emri → Teknisyen Atama → Rota → Saha Operasyonu → Teklif → Müşteri Onayı → İş Tamamlama → Servis Formu → Fatura → Tahsilat → e-Belge → Müşteri Memnuniyeti → Raporlama → Tekrar Servis**

Ürün yalnızca CRM değildir. Yalnızca iş emri yazılımı da değildir.

Bu ürün:

- CRM
- saha servis yönetimi,
- iş emri yönetimi,
- dispatch / ekip planlama,
- takvim,
- teklif,
- servis formu,
- stok ve ürün,
- finans,
- tahsilat,
- e-belge bağlantısı,
- çalışan yönetimi,
- GPS / rota,
- müşteri portalı,
- raporlama,
- bildirim,
- otomasyon

fonksiyonlarının tek SaaS çekirdeğinde birleşimidir.

---

# 2. ÜRÜNÜN GEÇİCİ ADI

Çalışma adı:

# **SahaFlow TR**

Alternatif marka isimleri:

- ServisPilot
- Saha360
- UstaFlow
- OperasyonX
- Servis360
- Fieldio TR
- SahaDesk

Kod tabanında marka adı değiştirilebilir olmalıdır.

Önerilen yapı:

```ts
export const APP_CONFIG = {
  productName: "SahaFlow",
  legalName: "DEĞİŞTİRİLEBİLİR",
  country: "TR",
  currency: "TRY",
  locale: "tr-TR",
  timezone: "Europe/Istanbul",
};
```

---

# 3. HEDEF KULLANICI GRUPLARI

İlk sürüm aşağıdaki işletmeler için optimize edilmelidir:

1. Klima / HVAC servisleri
2. Elektrik servisleri
3. Su tesisatı firmaları
4. Beyaz eşya teknik servisleri
5. Kombi / kazan servisleri
6. Asansör bakım firmaları
7. Bina ve site bakım ekipleri
8. Temizlik şirketleri
9. Güvenlik sistemi servisleri
10. Havuz bakım şirketleri
11. Peyzaj ekipleri
12. İnşaat sonrası bakım ve küçük tadilat şirketleri
13. Endüstriyel bakım servisleri
14. Otomotiv mobil servis ekipleri
15. Güneş enerjisi / solar bakım ekipleri

Mimari sektör bağımsız kurulmalıdır. Şirket hesabı açılırken sektör seçimi, varsayılan iş emri alanlarını ve şablonları değiştirebilmelidir.

---

# 4. TEMEL ÜRÜN PRENSİPLERİ

## 4.1 Hız

Bir çağrı merkezi personeli yeni müşteri + randevu oluşturma işlemini ideal olarak 60 saniyenin altında tamamlayabilmelidir.

## 4.2 Tek Ekrandan Operasyon

Kullanıcı bir iş emrini açtığında müşteri, adres, telefon, geçmiş servisler, atanmış ekip, teklif, kullanılan malzeme, servis fotoğrafları, ödeme, fatura ve notlar aynı bağlam içinde görülebilmelidir.

## 4.3 Türkiye Yerelleştirmesi

Varsayılan:

- Dil: Türkçe
- Para: Türk Lirası
- Saat dilimi: Europe/Istanbul
- Tarih: DD.MM.YYYY
- Telefon: +90
- Vergi alanları: TCKN / VKN
- İl / İlçe / Mahalle desteği
- KDV hesapları
- e-Fatura / e-Arşiv entegrasyon katmanı
- Türkiye ödeme kuruluşlarına bağlanabilen provider mimarisi
- KVKK uyumlu veri akışları

## 4.4 Mobil Öncelikli Saha Deneyimi

Teknisyen masaüstü panel kullanmak zorunda kalmamalıdır.

Mobil cihazdan:

- bugünkü işleri,
- navigasyonu,
- müşteri bilgisini,
- yapılacakları,
- servis notlarını,
- fotoğraf yüklemeyi,
- ürün/malzeme kullanımını,
- müşteri imzasını,
- teklif oluşturmayı,
- tahsilat durumunu,
- işi tamamlama işlemini

yapabilmelidir.

---

# 5. ÖZGÜN TASARIM KİMLİĞİ

Orcatec tasarımını kopyalama.

Yeni tasarım dili modern, profesyonel, güçlü ve Türkiye'deki B2B SaaS ürünlerinden daha premium görünmelidir.

## Ana renk sistemi

```css
--background: #F6F8FB;
--surface: #FFFFFF;
--surface-soft: #F0F4F8;

--primary: #16324F;
--primary-hover: #10263C;

--accent: #16B8A6;
--accent-soft: #DDF8F4;

--warning: #F2A93B;
--danger: #E45858;
--success: #27AE60;
--info: #3D7EFF;

--text-primary: #172230;
--text-secondary: #667382;
--border: #E3E9EF;
```

## Koyu tema

```css
--background: #0D1520;
--surface: #121D2A;
--surface-soft: #182636;
--primary: #6AC7FF;
--accent: #20C8B5;
--text-primary: #F5F7FA;
--text-secondary: #9EADBD;
--border: #26384A;
```

## UI karakteri

- 12–16px radius
- yumuşak ama aşırı olmayan gölgeler
- premium SaaS hissi
- net hiyerarşi
- bol boşluk
- yoğun veride okunabilir grid sistemi
- gereksiz gradient yok
- aşırı glassmorphism yok
- ikonlarda Lucide
- grafiklerde Recharts
- tablo ekranlarında gelişmiş filtre
- açık/koyu tema

Font:

- Inter
- alternatif: Manrope

---

# 6. ANA UYGULAMA NAVİGASYONU

Sol menü:

1. Genel Bakış
2. Takvim & Planlama
3. İş Emirleri
4. Müşteriler
5. Teklifler
6. Servis Formları
7. Faturalar
8. Tahsilatlar
9. Ürün & Stok
10. Ekip
11. Harita
12. Finans
13. Raporlar
14. Otomasyonlar
15. Entegrasyonlar
16. Ayarlar

Alt bölüm:

- Destek
- Bildirimler
- Kullanıcı Profili
- Şirket Değiştirici

Mobil teknisyen uygulaması ayrı sade navigasyona sahip olmalıdır:

- Bugün
- İşlerim
- Harita
- Mesajlar
- Profil

---

# 7. ROL VE YETKİ SİSTEMİ

RBAC kurulmalıdır.

Roller:

### Super Admin
Platformun tamamını yönetir.

### Şirket Sahibi
Şirket, faturalandırma ve tüm modüllere erişir.

### Operasyon Müdürü
İş emirleri, dispatch, çalışanlar, raporlar.

### Dispatcher / Çağrı Merkezi
Müşteri, randevu, iş emri, ekip atama.

### Finans
Fatura, tahsilat, gider, e-belge.

### Depo Sorumlusu
Stok, malzeme, satın alma.

### Teknisyen
Sadece kendisine atanmış işler ve gerekli müşteri detayları.

### Ekip Lideri
Kendi ekibinin işleri.

### Müşteri
Müşteri portalı üzerinden yalnızca kendi verileri.

Her yetki granular olmalıdır.

Örnek:

```ts
customer.read
customer.create
customer.update
customer.delete

job.read
job.create
job.assign
job.update
job.complete
job.cancel

invoice.read
invoice.create
invoice.send
invoice.refund

report.financial.read
settings.billing.manage
```

---

# 8. MODÜL 1 — GENEL BAKIŞ DASHBOARD

Bu ekran platformun operasyon kontrol kulesidir.

## Üst KPI kartları

- Bugünkü İşler
- Bekleyen İşler
- Tamamlanan İşler
- Bugünkü Ciro
- Tahsil Edilecek
- Geciken Ödemeler
- Sahadaki Teknisyen
- Ortalama Tamamlama Süresi

Her kart:

- ana değer
- önceki döneme göre değişim
- mini trend
- tıklanabilir detay

## Dashboard bölümleri

### Günlük Operasyon
Saat sırasına göre bugünkü işler.

### Canlı Ekip Durumu

Teknisyen durumları:

- Müsait
- Yolda
- İş Başında
- Molada
- Mesai Dışı

### Gelir Grafiği

- Bugün
- Son 7 gün
- 30 gün
- 12 ay

### İş Durumu Dağılımı

- Yeni
- Planlandı
- Atandı
- Yolda
- Başladı
- Beklemede
- Tamamlandı
- Faturalandı
- İptal

### Hızlı İşlemler

- Yeni Müşteri
- Yeni Randevu
- Yeni İş Emri
- Yeni Teklif
- Tahsilat Gir
- Fatura Oluştur

---

# 9. MODÜL 2 — CRM / MÜŞTERİLER

Müşteri iki tip olmalıdır:

```ts
INDIVIDUAL
COMPANY
```

## Gerçek kişi

- Ad
- Soyad
- Telefon
- Alternatif telefon
- E-posta
- TCKN (opsiyonel / izinli iş akışında)
- Adres
- Not
- Etiketler

## Kurumsal müşteri

- Firma adı
- Yetkili
- Telefon
- E-posta
- Vergi numarası
- Vergi dairesi
- Fatura adresi
- Servis adresleri

## Müşteri 360 sayfası

Tek ekranda:

- iletişim
- adresler
- açık işler
- servis geçmişi
- teklifler
- faturalar
- ödemeler
- cihaz/varlıklar
- notlar
- dosyalar
- müşteri mesajları
- zaman çizelgesi

## Çoklu servis adresi

Bir müşteri birden fazla lokasyona sahip olabilir.

Örnek:

ABC Market A.Ş.

- Antalya / Muratpaşa Şube
- Antalya / Konyaaltı Şube
- Antalya / Kepez Depo

Her adres ayrı servis geçmişine sahip olmalıdır.

---

# 10. MODÜL 3 — VARLIK / CİHAZ YÖNETİMİ

Müşteri lokasyonlarına cihaz/varlık eklenebilir.

Örnek:

```text
Daikin Klima
Model: X123
Seri No: TR283992
Kurulum: 12.06.2025
Garanti: 12.06.2027
Lokasyon: Toplantı Odası
```

Alanlar:

- kategori
- marka
- model
- seri no
- satın alma tarihi
- kurulum tarihi
- garanti başlangıç/bitiş
- bakım periyodu
- fotoğraf
- QR kod
- özel alanlar

QR okutulduğunda cihaz geçmişi açılabilmelidir.

---

# 11. MODÜL 4 — İŞ EMRİ

Bu sistemin ana nesnesidir.

Her iş emrinin benzersiz numarası olmalıdır:

```text
WO-2026-000001
```

## Alanlar

- iş emri no
- müşteri
- servis adresi
- cihaz
- kategori
- başlık
- sorun açıklaması
- öncelik
- durum
- planlanan tarih
- zaman aralığı
- tahmini süre
- atanmış teknisyen
- ekip
- kaynak
- etiket
- iç not
- müşteri notu

## Öncelik

```ts
LOW
NORMAL
HIGH
URGENT
```

## Durum makinesi

```text
NEW
↓
SCHEDULED
↓
ASSIGNED
↓
EN_ROUTE
↓
ARRIVED
↓
IN_PROGRESS
↓
ON_HOLD
↓
COMPLETED
↓
INVOICED
↓
PAID
```

Alternatif çıkış:

```text
CANCELLED
```

Geçişler backend tarafından kontrol edilmelidir.

---

# 12. MODÜL 5 — DISPATCH / TAKVİM

Bu ekran uygulamanın en güçlü operasyon ekranlarından biri olmalıdır.

## Görünüm seçenekleri

- Gün
- Hafta
- Ay
- Teknisyen
- Ekip
- Harita

## Sol panel

Atanmamış işler.

## Ana alan

Teknisyen satırları + zaman kolonları.

Drag & Drop desteklenmelidir.

İş kartında:

- saat
- müşteri
- semt
- iş türü
- süre
- öncelik
- durum
- teknisyen

Çakışma varsa kullanıcı uyarılmalıdır.

Örnek:

> Ahmet Yılmaz 14:00–15:30 arasında başka bir işe atanmış.

---

# 13. AKILLI ATAMA MOTORU

İlk aşamada gerçek yapay zekâ şart değildir.

Kural tabanlı bir `Assignment Scoring Engine` geliştir.

Skor:

```text
Score =
Mesafe Puanı
+ Uygunluk
+ Yetkinlik Eşleşmesi
+ İş Yükü
+ Bölge Tercihi
+ Müşteri Tercihi
```

Örnek sonuç:

```text
Mehmet Kaya — %94 uygun
12 dk mesafe
Bugün 15:30 boş
Klima bakım yetkinliği: Var
```

Gelecekte AI destekli optimizasyon eklenebilir.

Servis sınıfı:

```ts
TechnicianRecommendationService
```

---

# 14. MODÜL 6 — HARİTA VE GPS

Harita sağlayıcısı adapter ile ayrılmalıdır.

İlk tercih:

- Google Maps Platform
- alternatif Mapbox

Backend interface:

```ts
interface MapProvider {
  geocode(address: string): Promise<Coordinates>;
  calculateRoute(input: RouteInput): Promise<RouteResult>;
  calculateMatrix(input: MatrixInput): Promise<MatrixResult>;
}
```

Teknisyen konumu yalnızca yetkili iş bağlamında işlenmelidir.

Konum kayıtları için:

- izin
- çalışma zamanı
- saklama politikası
- erişim logları

tasarlanmalıdır.

Harita ekranı:

- teknisyenler
- açık işler
- bugünkü rotalar
- renkli durum pinleri
- seçilen teknisyen izi

---

# 15. MODÜL 7 — TEKLİF

Teklif numarası:

```text
QT-2026-000001
```

Özellikler:

- müşteri
- iş emri bağlantısı
- ürün/hizmet satırları
- adet
- birim
- birim fiyat
- KDV
- indirim
- ara toplam
- genel toplam
- notlar
- geçerlilik tarihi
- PDF
- dijital onay

## Paketli teklif

3 seviyeli seçenek desteklenebilir:

- Ekonomik
- Önerilen
- Premium

İsimler şirket tarafından özelleştirilebilir.

Müşteri linki:

```text
/quote/{publicToken}
```

Müşteri:

- teklifi görüntüler
- paketi seçer
- onaylar
- reddeder
- not ekler

Sistem görüntülenme zamanını kaydedebilir.

---

# 16. MODÜL 8 — SERVİS FORMU

Teknisyen işi tamamlamadan önce servis formu doldurabilmelidir.

Alanlar:

- varış zamanı
- başlangıç
- bitiş
- tespit
- yapılan işlem
- kullanılan malzemeler
- işçilik
- cihaz değerleri
- öncesi fotoğraf
- sonrası fotoğraf
- ek dosya
- teknisyen imzası
- müşteri imzası
- müşteri notu

Tamamlandığında PDF servis formu oluştur.

---

# 17. MODÜL 9 — ÜRÜN, HİZMET VE STOK

## Ürün

- SKU
- barkod
- kategori
- marka
- alış
- satış
- KDV
- birim
- stok miktarı
- minimum stok

## Hizmet

Örnek:

```text
Klima Bakım Hizmeti
Süre: 45 dk
Fiyat: ₺1.250
KDV: %20
```

## Stok lokasyonları

- Merkez depo
- Şube
- Araç deposu
- Teknisyen stoğu

Stok hareketleri:

```text
IN
OUT
TRANSFER
ADJUSTMENT
RETURN
```

---

# 18. MODÜL 10 — FATURA VE E-BELGE

Fatura domain'i ödeme sisteminden ayrı olmalıdır.

Alanlar:

- fatura no
- müşteri
- VKN/TCKN
- vergi dairesi
- adres
- satırlar
- KDV
- iskonto
- toplam
- ödeme durumu
- belge tipi

Belge türleri:

```ts
STANDARD
E_INVOICE
E_ARCHIVE
```

## Entegrasyon mimarisi

Doğrudan tek sağlayıcıya bağımlı kod yazma.

```ts
interface EDocumentProvider {
  createInvoice(payload: InvoicePayload): Promise<EDocumentResult>;
  cancelInvoice(id: string): Promise<void>;
  getStatus(id: string): Promise<EDocumentStatus>;
}
```

Adapter örnekleri:

```text
/providers/edocument/parasut
/providers/edocument/logo
/providers/edocument/mikro
/providers/edocument/custom
```

Gerçek API kullanımı ilgili sağlayıcı hesabı, sözleşmesi ve güncel dokümantasyonu sağlandıktan sonra etkinleştirilsin.

GİB ve özel entegratör kuralları hard-code edilmemeli; provider katmanından yönetilmelidir.

---

# 19. MODÜL 11 — TAHSİLAT

Ödeme yöntemleri:

- Nakit
- Havale/EFT
- Kredi Kartı
- Sanal POS
- Ödeme Linki
- Çek
- Diğer

Tahsilat numarası:

```text
PAY-2026-000001
```

## Online ödeme provider mimarisi

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(id: string): Promise<PaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(payload: unknown, headers: unknown): Promise<PaymentWebhook>;
}
```

Adapter hedefleri:

```text
iyzico
PayTR
mock
```

Webhook idempotent olmalıdır.

Aynı ödeme bildirimi iki kez geldiğinde iki tahsilat yaratılmamalıdır.

---

# 20. MODÜL 12 — BANKA HAREKETİ / HAVALE EŞLEŞTİRME

İleri faz özelliği.

Amaç:

Banka hareketleri içe aktarıldığında faturalarla otomatik eşleşme önerileri oluşturmak.

İlk sürüm:

CSV/XLSX import.

Alanlar:

- tarih
- açıklama
- tutar
- IBAN / karşı hesap
- referans

Matching score:

```text
Tutar eşleşmesi
+ müşteri ismi benzerliği
+ fatura no
+ açıklama benzerliği
```

Kullanıcı eşleşmeyi onaylamadan otomatik kapatma yapılmasın.

---

# 21. MODÜL 13 — EKİP YÖNETİMİ

Çalışan profili:

- ad soyad
- telefon
- e-posta
- rol
- yetkinlik
- çalışma bölgeleri
- çalışma saatleri
- izin
- aktif/pasif
- araç
- renk

Yetkinlik örnekleri:

```text
Klima Montaj
Klima Bakım
Elektrik
Kombi
Endüstriyel Soğutma
```

---

# 22. MODÜL 14 — ÇALIŞMA SAATİ

Teknisyen:

```text
Mesai Başlat
Mola Başlat
Molayı Bitir
Mesai Bitir
```

Kayıtlar değiştirilebilir ancak değişiklik audit log'a yazılmalıdır.

---

# 23. MODÜL 15 — İLETİŞİM MERKEZİ

Müşteri timeline'ında iletişim kayıtları bulunmalıdır.

Kanallar:

- sistem içi
- e-posta
- SMS
- WhatsApp provider
- telefon notu

Provider abstraction:

```ts
interface MessageProvider {
  send(input: SendMessageInput): Promise<MessageResult>;
}
```

İlk sürümde provider olmayan kanallar mock/disabled olabilir.

Hazır şablonlar:

- Randevu oluşturuldu
- Teknisyen yola çıktı
- İş tamamlandı
- Teklif hazır
- Fatura oluşturuldu
- Ödeme alındı
- Bakım zamanı yaklaşıyor

---

# 24. MODÜL 16 — MÜŞTERİ PORTALI

Müşteri kendi bağlantısı/hesabıyla:

- yaklaşan randevuları
- geçmiş servisleri
- teklifleri
- faturaları
- ödeme durumlarını
- servis formlarını
- cihazlarını

görebilir.

Yeni servis talebi oluşturabilir.

Portal ana uygulamadan görsel olarak daha sade olmalıdır.

---

# 25. MODÜL 17 — RAPORLAMA

Ana raporlar:

### Operasyon

- tamamlanan iş
- iptal edilen iş
- teknisyen başına iş
- ilk müdahale süresi
- ortalama iş süresi
- tekrar servis oranı

### Finans

- ciro
- tahsilat
- açık alacak
- geciken alacak
- ortalama sepet
- iş başına kâr
- teknisyen başına gelir

### Satış

- teklif sayısı
- kabul oranı
- reddedilen teklifler
- ortalama teklif tutarı

### Müşteri

- yeni müşteri
- tekrar müşteri
- müşteri başına gelir
- memnuniyet puanı

CSV/XLSX export mimarisi eklenmelidir.

---

# 26. MODÜL 18 — OTOMASYON MOTORU

Trigger + Condition + Action modeli.

## Trigger

```text
JOB_CREATED
JOB_ASSIGNED
JOB_COMPLETED
QUOTE_SENT
QUOTE_VIEWED
QUOTE_ACCEPTED
INVOICE_CREATED
PAYMENT_RECEIVED
INVOICE_OVERDUE
```

## Condition

Örnek:

```text
invoice.total > 5000
customer.type == COMPANY
job.category == HVAC
```

## Action

```text
SEND_EMAIL
SEND_SMS
CREATE_TASK
NOTIFY_USER
UPDATE_TAG
WEBHOOK
```

Örnek otomasyon:

> İş tamamlandıktan 15 dakika sonra müşteriye servis değerlendirme mesajı gönder.

---

# 27. TÜRKİYE'YE ÖZEL YERELLEŞTİRME

## Adres sistemi

```text
Ülke
İl
İlçe
Mahalle
Cadde/Sokak
Bina No
Daire
Posta Kodu
Adres Tarifi
```

Harita için:

```ts
latitude
longitude
formattedAddress
```

## Vergi

- VKN
- TCKN
- Vergi Dairesi
- KDV oranı

KDV oranları sabit kod yerine ayarlanabilir olmalıdır.

## Para

Tutar DB'de floating point tutulmamalıdır.

Tercih:

```ts
amountMinor: bigint
currency: "TRY"
```

veya PostgreSQL `numeric(18,2)`.

---

# 28. KVKK TASARIM PRENSİPLERİ

Bu bölüm hukuki görüş değildir; yazılım mimarisi gereksinimidir.

Sistemde:

- KVKK aydınlatma metni sürümlenmeli
- kabul/okuma kayıtları timestamp ile saklanabilmeli
- pazarlama izni ayrı tutulmalı
- zorunlu hizmet verisi ile pazarlama izni aynı checkbox'a bağlanmamalı
- kullanıcı veri dışa aktarma süreci oluşturulmalı
- silme/anonimleştirme iş akışı bulunmalı
- audit log olmalı
- role-based erişim uygulanmalı
- hassas alanlar loglarda maskelenmeli
- üretim verisi geliştirme ortamına kopyalanmamalı
- dosya erişimi signed URL ile yapılmalı

---

# 29. MULTI-TENANT SAAS MİMARİSİ

Her işletme bir `organization` olmalıdır.

Tüm tenant verileri:

```ts
organizationId
```

ile ilişkilendirilmelidir.

Kullanıcı birden fazla organizasyona üye olabilir.

Tablolar:

```text
users
organizations
organization_members
roles
permissions
role_permissions
```

Kritik kural:

> API hiçbir tenant verisini yalnızca client'tan gelen organizationId değerine güvenerek döndürmemelidir. Kullanıcının membership'i backend tarafından doğrulanmalıdır.

---

# 30. ÖNERİLEN TEKNOLOJİ YIĞINI

## Monorepo

```text
pnpm
Turborepo
```

## Web

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
Lucide
Recharts
```

## API

Tercih:

```text
NestJS
TypeScript
REST API
OpenAPI / Swagger
```

## Database

```text
PostgreSQL
Prisma ORM
```

## Cache / Job Queue

```text
Redis
BullMQ
```

## Dosya

S3-compatible storage.

Local development:

```text
MinIO
```

Production:

- AWS S3
- Cloudflare R2
- veya uyumlu provider

## Mobile

```text
Expo
React Native
TypeScript
```

## Auth

Uygulama içinde güvenli auth:

- access token
- refresh token rotation
- httpOnly cookie (web)
- secure storage (mobile)
- optional MFA

---

# 31. MONOREPO DOSYA YAPISI

Codex aşağıdaki benzer yapıyı kursun:

```text
sahaflow/
│
├─ apps/
│  ├─ web/
│  ├─ api/
│  ├─ mobile/
│  └─ worker/
│
├─ packages/
│  ├─ ui/
│  ├─ database/
│  ├─ config/
│  ├─ types/
│  ├─ validation/
│  ├─ auth/
│  └─ integrations/
│
├─ infrastructure/
│  ├─ docker/
│  └─ scripts/
│
├─ docs/
│  ├─ architecture.md
│  ├─ api.md
│  ├─ database.md
│  └─ deployment.md
│
├─ docker-compose.yml
├─ .env.example
├─ turbo.json
├─ pnpm-workspace.yaml
└─ README.md
```

---

# 32. TEMEL DATABASE ŞEMASI

Codex aşağıdaki domain'leri oluşturmalıdır.

```text
User
Organization
OrganizationMember
Role
Permission

Customer
CustomerAddress
CustomerContact
Asset

Job
JobAssignment
JobStatusHistory
JobNote
JobAttachment

Employee
Skill
EmployeeSkill
WorkSchedule
TimeEntry

Quote
QuoteOption
QuoteLine
QuoteApproval

ServiceReport
ServiceReportItem
Signature

Product
ServiceCatalogItem
InventoryLocation
InventoryTransaction

Invoice
InvoiceLine
Payment
Refund

Expense

Message
Notification

Automation
AutomationExecution

Integration
IntegrationCredential

AuditLog
WebhookEvent
```

---

# 33. ÖRNEK PRISMA MODEL MANTIĞI

Tam şemayı Codex kendi domain ilişkilerine göre üretmelidir; aşağıdaki yapı referanstır:

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  customers Customer[]
  jobs      Job[]
}

model Customer {
  id             String   @id @default(cuid())
  organizationId String
  type           CustomerType
  name           String
  phone          String?
  email          String?
  taxNumber      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  addresses    CustomerAddress[]
  jobs         Job[]

  @@index([organizationId])
}

model Job {
  id             String   @id @default(cuid())
  organizationId String
  customerId     String
  jobNumber      String
  title          String
  description    String?
  status         JobStatus
  priority       JobPriority
  scheduledStart DateTime?
  scheduledEnd   DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  customer     Customer     @relation(fields: [customerId], references: [id])

  @@unique([organizationId, jobNumber])
  @@index([organizationId, status])
  @@index([organizationId, scheduledStart])
}
```

---

# 34. API TASARIMI

Base:

```text
/api/v1
```

Örnek endpointler:

```http
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id

GET    /jobs
POST   /jobs
GET    /jobs/:id
PATCH  /jobs/:id

POST   /jobs/:id/assign
POST   /jobs/:id/start
POST   /jobs/:id/complete

GET    /dispatch
GET    /technicians/recommendations

GET    /quotes
POST   /quotes
POST   /quotes/:id/send

GET    /invoices
POST   /invoices

POST   /payments
POST   /payments/webhooks/:provider

GET    /reports/operations
GET    /reports/financial
```

Filtering standardı:

```text
?page=1
&limit=25
&sort=createdAt:desc
&status=IN_PROGRESS
&search=ahmet
```

---

# 35. EVENT-DRIVEN DOMAIN

İşlem sonrası event üret.

Örnek:

```text
job.created
job.assigned
job.started
job.completed

quote.created
quote.sent
quote.viewed
quote.accepted

invoice.created
payment.received
```

Bu event'ler:

- notification
- automation
- analytics
- integration

modülleri tarafından dinlenebilir.

---

# 36. AUDIT LOG

Aşağıdaki işlemler kaydedilsin:

- müşteri silme
- ödeme düzenleme
- fatura iptal
- fiyat değişikliği
- yetki değişikliği
- kullanıcı engelleme
- iş emri durum değişimi
- entegrasyon ayarı değişimi

Audit:

```text
actor
action
entity
entityId
before
after
ip
userAgent
createdAt
```

Secret alanları audit'e yazma.

---

# 37. GÜVENLİK

Codex minimum aşağıdakileri uygulasın:

- Zod validation
- rate limiting
- CORS allowlist
- CSRF değerlendirmesi
- secure headers
- password hashing: Argon2id
- refresh token rotation
- session revoke
- RBAC
- tenant isolation
- parameterized queries
- upload MIME validation
- upload size limit
- signed file URLs
- secrets only environment variables
- webhook signature verification
- idempotency keys for payment
- brute-force login protection
- structured security logs

---

# 38. NOTIFICATION CENTER

Bildirim tipleri:

```text
JOB_ASSIGNED
JOB_CHANGED
QUOTE_ACCEPTED
PAYMENT_RECEIVED
INVOICE_OVERDUE
LOW_STOCK
```

Web:

- toast
- notification center
- unread counter

Mobile:

- push notification architecture

---

# 39. ARAMA

Global command/search:

```text
Ctrl + K
```

Aranabilir:

- müşteri
- telefon
- iş emri
- fatura
- teklif
- cihaz seri no

---

# 40. TASARLANACAK TEMEL EKRANLAR

Codex önce bu ekranları üretmeli:

1. Login
2. Register
3. Organization onboarding
4. Dashboard
5. Customers list
6. Customer detail
7. Jobs list
8. Job detail
9. Dispatch calendar
10. Create appointment modal
11. Map
12. Quotes list
13. Quote builder
14. Invoice list
15. Payment page
16. Employees
17. Inventory
18. Reports
19. Settings
20. Integrations
21. Mobile technician Today screen
22. Mobile Job detail
23. Customer public quote page
24. Customer portal

---

# 41. DASHBOARD UI DETAYI

Desktop:

```text
┌──────────────────────────────────────────────┐
│ Header                                       │
├───────┬──────────────────────────────────────┤
│       │ KPI KPI KPI KPI                     │
│ Side  ├──────────────────────────────────────┤
│ bar   │ Revenue Chart | Job Status           │
│       ├──────────────────────────────────────┤
│       │ Today's Schedule                     │
│       ├──────────────────────────────────────┤
│       │ Team Status | Outstanding Payments   │
└───────┴──────────────────────────────────────┘
```

Header:

- breadcrumb
- global search
- quick create
- notifications
- profile

---

# 42. JOB DETAIL UI

Sekmeler:

```text
Genel
Zaman Çizelgesi
Servis
Teklif
Fatura
Dosyalar
Mesajlar
```

Sağ panel:

- durum
- öncelik
- teknisyen
- planlanan zaman
- müşteri
- adres
- hızlı işlemler

---

# 43. MOBİL TEKNİSYEN AKIŞI

Teknisyen login.

Ana ekran:

```text
Günaydın Mehmet
13 Eylül Pazar

Bugün
5 İş
```

İş kartı:

```text
10:30
Ahmet Yılmaz
Klima Bakımı

Konyaaltı / Antalya
[12 dk]

[Yol Tarifi]
```

İşe basınca:

```text
Müşteriyi Ara
Navigasyon
Yola Çıktım
Vardım
İşe Başla
```

İş sırasında:

- checklist
- not
- fotoğraf
- malzeme
- fiyat
- müşteri imzası

Bitir:

```text
İşi Tamamla
```

---

# 44. ONBOARDING

Yeni şirket onboarding:

### Adım 1
Şirket Bilgileri

### Adım 2
Sektör

### Adım 3
Çalışan Ekle

### Adım 4
Hizmetler

### Adım 5
Çalışma Saatleri

### Adım 6
İlk Müşteriyi Oluştur

### Adım 7
İlk İşi Planla

Amaç kullanıcının boş dashboard görmemesidir.

---

# 45. DEMO / SEED VERİ

Development ortamında gerçekçi Türkçe veri üret.

Örnek şirket:

```text
Akdeniz Teknik Servis
Antalya
```

Çalışanlar:

```text
Mehmet Kaya
Emre Demir
Can Yıldız
Selin Aksoy
```

Müşteriler:

```text
Ahmet Yılmaz
Mavişehir Residence
Atlas Otelcilik A.Ş.
Liman Cafe
```

İşler:

```text
Klima bakım
Elektrik arızası
Kombi kontrol
Soğuk oda bakım
```

Lorem ipsum kullanma.

---

# 46. TEST STRATEJİSİ

## Unit

- pricing
- KDV
- job status transitions
- permission checks
- assignment scoring

## Integration

- customer create
- job create
- job assign
- quote
- invoice
- payment webhook

## E2E

Playwright:

```text
Login
Create customer
Create job
Assign technician
Complete job
Create invoice
Record payment
```

---

# 47. OBSERVABILITY

Hazırla:

- structured logging
- request ID
- error tracking adapter
- health endpoint
- readiness
- database monitoring
- job queue monitoring

Endpoints:

```text
/health
/health/ready
```

---

# 48. DEPLOYMENT

Local:

```text
Docker Compose
```

Services:

```text
postgres
redis
minio
api
web
worker
```

Production container-ready olmalıdır.

CI:

```text
lint
typecheck
test
build
```

---

# 49. ENVIRONMENT

`.env.example` üret.

Örnek:

```env
DATABASE_URL=
REDIS_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

GOOGLE_MAPS_API_KEY=

IYZICO_API_KEY=
IYZICO_SECRET_KEY=

PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
```

Gerçek secret commit edilmemeli.

---

# 50. INTEGRATION SETTINGS UI

Ayarlar → Entegrasyonlar

Kartlar:

```text
iyzico
PayTR
e-Fatura Sağlayıcısı
Google Maps
SMS Sağlayıcısı
E-posta
WhatsApp
Muhasebe
Webhook
```

Durum:

```text
Bağlı
Bağlı Değil
Hata
Test Modu
```

Secret değer gösterilmemelidir.

---

# 51. MVP KAPSAMI

İlk çalışan sürüm:

## Zorunlu

- auth
- organization
- RBAC
- dashboard
- customer
- address
- job
- dispatch
- employee
- quote
- service report
- invoice
- manual payment
- basic inventory
- files
- notifications
- audit log
- reports
- responsive design
- seed

## Faz 2

- GPS
- map routing
- mobile app
- iyzico
- PayTR
- e-document adapters
- messaging providers
- automation
- customer portal

## Faz 3

- intelligent route optimization
- bank reconciliation
- advanced analytics
- AI assistant
- predictive maintenance
- fleet

---

# 52. CODEX GELİŞTİRME EMRİ

Aşağıdaki bölüm Codex tarafından bir üst seviye talimat olarak kabul edilmelidir.

## CODEX MASTER PROMPT

Sen deneyimli bir:

- principal software architect,
- senior full-stack TypeScript developer,
- SaaS product engineer,
- UX engineer,
- database architect,
- security-minded backend developer

olarak hareket edeceksin.

Görevin bu belgede tarif edilen **SahaFlow TR** isimli Türkiye odaklı saha servis yönetim platformunu sıfırdan, üretime taşınabilir kalitede geliştirmektir.

### Çalışma prensiplerin

1. Sadece görsel demo yapma.
2. Butonları dekorasyon olarak bırakma.
3. Kritik akışların backend ve database karşılığını oluştur.
4. Mock data yalnızca seed/demo amacıyla kullanılabilir.
5. TypeScript strict mode kullan.
6. `any` kullanımından kaçın.
7. Domain'leri modüler kur.
8. Tenant isolation'ı en baştan uygula.
9. RBAC sistemini sonradan eklenen bir özellik gibi değil çekirdek olarak tasarla.
10. Para ve vergi hesaplarında floating point hatasına izin verme.
11. Payment ve webhook işlemlerinde idempotency uygula.
12. Entegrasyonları adapter pattern ile geliştir.
13. UI bileşenlerini tekrar kullanılabilir hale getir.
14. Loading, empty, error ve success state'lerini tasarla.
15. Responsive davranışı her ekranda kontrol et.
16. Accessibility kurallarını dikkate al.
17. API validation ve authorization'ı route seviyesinde bırakma; service/domain seviyesinde de koru.
18. Unit, integration ve E2E testleri oluştur.
19. README'yi gerçek kurulum adımlarıyla yaz.
20. Kod tabanını başka bir geliştiricinin sürdürebileceği biçimde dokümante et.

### Kesinlikle yapma

- Orcatec logosu kullanma.
- Orcatec kaynak kodunu kopyalama.
- Orcatec UI'sini pixel-perfect kopyalama.
- Lisanslı görsel varlık kopyalama.
- Entegrasyon API davranışını dokümantasyon olmadan uydurma.
- Gerçek ödeme sağlayıcı secret'larını kod içine yazma.
- frontend'de gizli anahtar tutma.
- tenant kontrolünü client'a bırakma.

---

# 53. CODEX ÇALIŞMA SIRASI

Codex projeyi aşağıdaki sırayla geliştirsin.

## Aşama 0 — Analiz

Önce:

- architecture kararlarını yaz
- dependency listesini yaz
- domain modelini çıkar
- database ER diagram mantığını çıkar
- MVP planını yaz

Sonra uygulamaya geç.

## Aşama 1 — Foundation

Kur:

- monorepo
- Next.js
- NestJS
- PostgreSQL
- Prisma
- Redis
- shared packages
- lint
- prettier
- TypeScript
- Docker

Beklenen:

```bash
pnpm install
docker compose up -d
pnpm dev
```

ile proje ayağa kalksın.

## Aşama 2 — Auth + Tenant

- register
- login
- refresh
- logout
- organization
- membership
- RBAC

## Aşama 3 — UI Shell

- sidebar
- header
- breadcrumbs
- command menu
- notifications
- profile menu
- theme
- responsive shell

## Aşama 4 — CRM

- customer list
- customer create
- customer detail
- address
- asset

## Aşama 5 — Jobs

- jobs list
- create
- edit
- status machine
- assignment
- history

## Aşama 6 — Dispatch

- calendar
- drag-drop
- technician rows
- conflict detection
- unassigned jobs

## Aşama 7 — Quote

- quote builder
- totals
- PDF
- public link
- acceptance

## Aşama 8 — Service Report

- report
- photos
- material
- signature
- PDF

## Aşama 9 — Finance

- invoice
- payment
- outstanding balance
- dashboard metrics

## Aşama 10 — Inventory

- products
- stock
- transactions

## Aşama 11 — Reports

- financial
- operations
- employee

## Aşama 12 — Integrations

Önce mock provider, sonra gerçek provider.

## Aşama 13 — Mobile

Expo technician app.

## Aşama 14 — Hardening

- security
- performance
- tests
- audit
- logging
- docs

---

# 54. HER AŞAMADA CODEX'İN ÇIKTISI

Her milestone sonunda şunları raporla:

```text
1. Tamamlanan özellikler
2. Oluşturulan/değiştirilen dosyalar
3. Database migration
4. Yeni endpointler
5. Test sonucu
6. Bilinen açıklar
7. Bir sonraki adım
```

Bir aşamadaki kritik hata çözülmeden sonraki aşamaya geçme.

---

# 55. ACCEPTANCE CRITERIA — MVP

MVP hazır sayılmak için:

### Login
Kullanıcı login olabilmeli.

### Tenant
Bir kullanıcının erişemediği organizasyon verisi hiçbir endpointten dönmemeli.

### Customer
Müşteri oluşturulabilmeli.

### Job
Müşteriye bağlı iş oluşturulabilmeli.

### Dispatch
İş teknisyene atanabilmeli.

### Technician
Teknisyen kendi işlerini görebilmeli.

### Workflow
İş:

```text
Scheduled
→ Assigned
→ En Route
→ In Progress
→ Completed
```

ilerleyebilmeli.

### Quote
Teklif oluşturulup müşteri linkinden onaylanabilmeli.

### Service Report
İş sonunda servis formu üretilebilmeli.

### Invoice
Tamamlanan işten fatura oluşturulabilmeli.

### Payment
Manuel tahsilat girildiğinde bakiye güncellenmeli.

### Dashboard
Gerçek DB verisinden KPI göstermeli.

### Audit
Kritik aksiyonlar loglanmalı.

---

# 56. ÖRNEK UÇTAN UCA SENARYO

## Senaryo: Klima Arızası

Saat 09:05.

Müşteri Ahmet Yılmaz çağrı merkezini arar.

> "Klima çalışıyor ama soğutmuyor."

Çağrı merkezi telefon numarasını arar.

Müşteri bulunur.

Adres:

```text
Konyaaltı / Antalya
```

Yeni iş:

```text
Klima Soğutmuyor
Priority: Normal
Estimated duration: 60 min
```

Sistem uygun teknisyenleri önerir:

```text
Mehmet Kaya — %94
Emre Demir — %81
Can Yıldız — %62
```

Mehmet seçilir.

Müşteriye:

> Randevunuz oluşturuldu.

mesajı gönderilir.

Saat 10:20:

Mehmet mobil uygulamada:

```text
Yola Çıktım
```

butonuna basar.

İş durumu:

```text
EN_ROUTE
```

Müşteri bildirim alır.

Teknisyen sahaya varır.

```text
Vardım
İşe Başla
```

Sorun:

```text
Kondansatör arızalı.
```

Teklif:

```text
Kondansatör: ₺850
İşçilik: ₺650
Toplam: ₺1.500 + KDV
```

Müşteri teklifi telefondan onaylar.

Teknisyen ürünü kullanır.

Stok otomatik düşer.

Öncesi ve sonrası fotoğraf eklenir.

Müşteri imza atar.

İş tamamlanır.

Sistem servis formu oluşturur.

Fatura oluşturulur.

Müşteri ödeme linkinden kartla ödeme yapar.

Payment provider webhook gönderir.

Fatura:

```text
PAID
```

durumuna geçer.

Dashboard:

```text
Bugünkü Ciro + ₺X
Tamamlanan İş +1
```

olarak güncellenir.

Bu senaryo E2E test olarak yazılmalıdır.

---

# 57. GELECEK AI ÖZELLİKLERİ

MVP'de zorunlu değildir.

İleride:

## Akıllı Çağrı Özeti

Müşteri notundan otomatik iş özeti.

## Arıza Sınıflandırma

Metne göre servis kategorisi önerisi.

## Teknisyen Önerisi

Geçmiş başarı + skill + rota + yoğunluk.

## Tahmini İş Süresi

Geçmiş verilere göre duration.

## Teklif Önerisi

Benzer iş geçmişinden fiyat aralığı.

## Tahsilat Risk Skoru

Kurumsal müşteride gecikme analizi.

AI çıktıları kullanıcı onayı olmadan kritik finansal işlem yapmamalıdır.

---

# 58. PERFORMANS HEDEFLERİ

Normal liste API:

```text
p95 < 500ms
```

Dashboard:

```text
ilk anlamlı içerik hızlı
```

Pagination zorunlu.

N+1 query engellenmeli.

Index planı hazırlanmalı.

Büyük dosyalar uygulama sunucusundan geçirilmeden signed upload kullanılmalı.

---

# 59. ÜRÜNÜN REKABET FARKI

SahaFlow TR'nin konumu:

> "Türkiye'deki saha servis şirketleri için operasyon, ekip, müşteri, teklif, servis formu, tahsilat ve e-belge süreçlerini tek merkezde birleştiren modern saha yönetim sistemi."

Farklılaşma:

1. Türkçe-first
2. Türkiye vergi ve ödeme ekosistemine hazır
3. hızlı dispatch
4. sade mobil teknisyen deneyimi
5. müşteri portalı
6. güçlü workflow
7. provider bağımsız entegrasyon
8. modern UX
9. multi-tenant SaaS
10. gelişmiş otomasyon altyapısı

---

# 60. SON CODEX TALİMATI

Bu belgeyi sadece ürün fikri olarak okuma.

Bunu **uygulanabilir software specification** olarak kabul et.

Önce mevcut repository'yi analiz et.

Repository boşsa foundation kur.

Repository'de mevcut kod varsa çalışan bölümleri gereksiz yere yeniden yazma.

Her aşamada:

```text
Analyze
Design
Implement
Test
Verify
Document
```

döngüsünü uygula.

Kullanıcı tarafından yeni bir görsel referans verilirse mevcut design token'larını koruyarak ilgili ekranı iyileştir.

Eksik üçüncü taraf API credential'ı nedeniyle projeyi durdurma.

Provider interface + mock implementation + configuration ekranını oluştur; gerçek bağlantıyı credential geldiğinde etkinleştir.

Projenin sonunda yalnızca screenshot veren bir prototip değil, lokal ortamda çalışan, database'e yazan, API kullanan ve ana iş akışları test edilmiş bir SaaS ortaya çıkmalıdır.

---

# 61. TEKNİK REFERANS NOTLARI

Bu spesifikasyon hazırlanırken ürün kategorisindeki güncel saha servis fonksiyonları ve Türkiye entegrasyon ihtiyaçları dikkate alınmıştır.

Referans alınabilecek resmi kaynaklar:

- Orcatec ürün/özellik sayfaları: https://orcatec.com/
- Orcatec AI Route Optimization: https://orcatec.com/tutorial/ai-route-optimization
- KVKK resmi sitesi: https://www.kvkk.gov.tr/
- iyzico geliştirici/entegrasyon kaynakları: https://www.iyzico.com/
- PayTR entegrasyon kaynakları: https://www.paytr.com/
- Gelir İdaresi e-Belge kaynakları: https://ebelge.gib.gov.tr/

**Not:** Üçüncü taraf API'ler zaman içinde değişebilir. Codex gerçek entegrasyona başlamadan önce sağlayıcının güncel resmi dokümantasyonunu doğrulamalıdır.

---

# 62. DEFINITION OF DONE

Bir modül ancak aşağıdaki şartların tamamı sağlandığında tamamlanmış kabul edilir:

- UI hazır
- API hazır
- DB migration hazır
- authorization hazır
- validation hazır
- loading state hazır
- empty state hazır
- error state hazır
- responsive kontrol edildi
- test yazıldı
- lint başarılı
- typecheck başarılı
- docs güncellendi

---

# 63. İLK BAŞLATMA KOMUTU — CODEX'E VER

Bu dosyayı Codex'e yükledikten sonra şu komutla başlat:

> Bu `SahaFlow_TR_Codex_Master_Project_Spec.md` dosyasını projenin ana ürün ve teknik spesifikasyonu olarak kabul et. Önce tamamını analiz et. Ardından repository'nin mevcut durumunu incele. Eksikleri spesifikasyona göre haritala ve `docs/implementation-plan.md` oluştur. Sonra Aşama 0 ve Aşama 1'i gerçekleştir. Çalışan foundation, Docker geliştirme ortamı, temel database, auth/tenant iskeleti ve modern web app shell ortaya çıkmadan sonraki modüllere atlama. Her aşamadan sonra test/typecheck çalıştır ve sonuçları raporla. Orcatec'i sadece iş modeli referansı olarak kullan; tasarım ve kodu özgün üret.
