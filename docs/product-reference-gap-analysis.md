# SahaFlow TR Ürün Referansı ve Boşluk Analizi

## Araştırmanın amacı ve sınırı

Bu belge, Orcatec'in kamuya açık ürün anlatımını ve bağımsız kullanıcı değerlendirmelerini SahaFlow TR Master Spec ile karşılaştırır. Orcatec yalnızca saha servis iş modeli ve operasyon kapsamı için referanstır. Marka, ürün metni, görsel, ekran düzeni, kaynak kod veya özgün etkileşim kopyalanmayacaktır.

Orcatec'in kamuya açık sitesi bir pazarlama kaynağıdır; birçok sayfada aynı içerik blokları yinelenir ve teknik uygulama ayrıntıları sınırlıdır. Bu nedenle özellik iddiaları doğrudan ürün gereksinimi sayılmamış, SahaFlow'un Türkiye pazarı, mevcut faz sırası, güvenlik ilkeleri ve veri modeli açısından değerlendirilmiştir. G2 ve Capterra inceleme sayıları küçüktür; kullanıcı görüşleri yön gösterir ancak pazar geneline ilişkin istatistik kabul edilmez.^1 ^2

## Yönetici bulguları

SahaFlow Master Spec temel FSM zincirinde güçlüdür: müşteri, çoklu adres, varlık, iş emri, dispatch, rota, saha çalışması, teklif, servis formu, fatura, tahsilat, stok, portal, mobil ve Türkiye entegrasyonları zaten tanımlıdır. Orcatec karşılaştırması ana yönü değiştirmemektedir.

En anlamlı ürün boşlukları şunlardır:

1. **Servis sözleşmesi ve tekrarlayan bakım:** Bakım periyodu var, fakat sözleşme kapsamı, hak ediş, otomatik iş üretimi, yenileme ve SLA birlikte modellenmemiştir.
2. **İş maliyeti ve kârlılık:** Raporlarda iş başına kâr hedefleniyor; gerçek maliyet kaynağı olacak işçilik, yol, malzeme, dış hizmet, indirim ve genel gider dağıtımı ayrıntılı değildir.
3. **Fiyat kataloğu:** Ürün/hizmet var; sürümlü fiyat listesi, müşteri grubu fiyatı, toplu güncelleme, içe/dışa aktarma ve teklif şablonu bağlantısı eksiktir.
4. **Saha zamanı ve kapasite:** Mesai başlat/bitir var; seyahat, işçilik, mola, fazla mesai, düzeltme onayı, puantaj dışa aktarımı ve geofence doğrulaması ayrıntılandırılmalıdır.
5. **Tedarik ve satın alma:** Stok hareketleri var; tedarikçi, satın alma talebi, sipariş, teslimat, iş için malzeme rezervasyonu ve üç yönlü eşleştirme yoktur.
6. **Teklif satış zekâsı:** Paketli teklif ve görüntülenme kaydı var; şablon/version, opsiyonel ek ürün, etkinlik zaman çizelgesi, hatırlatma, dönüşüm ve tahmin-gerçekleşen karşılaştırması genişletilmelidir.
7. **Müşteri geri bildirimi:** Otomasyon mesajı ve memnuniyet puanı var; tarafsız CSAT/NPS akışı, şikâyet/iyileştirme kaydı ve platform-politikalarına uyumlu yorum isteme tasarımı yoktur.
8. **Modüler SaaS yönetimi:** Multi-tenant çekirdek var; paket/özellik hakkı, kota, deneme süresi, tenant kullanım ölçümü ve kontrollü özellik açma modeli tanımlanmamıştır.
9. **Onboarding ve veri taşıma:** Onboarding adımları var; CSV şablonları, ön izleme, satır bazlı hata, tekrar çalıştırılabilir import ve eğitim kontrol listesi ürünleşmemiştir.
10. **Offline mobil güvenilirlik:** Mobil akış tanımlı; offline komut kuyruğu, medya yükleme devamı, çakışma çözümü ve son senkronizasyon görünürlüğü kabul kriteri haline getirilmelidir.

## Kaynaklardan çıkarılan operasyon kabiliyetleri

Orcatec, kamuya açık anlatımında planlama/dispatch, iş emri, CRM, iş takibi, tekrarlayan işler, ekipman, teklif, fatura, ödeme, zaman takibi, GPS, rota, mesajlaşma, yorum yönetimi, raporlama ve muhasebe bağlantısını tek platformda konumlandırır.^3 Planlama sayfası merkezi takvim, personel yetkinliği/uygunluğu, müşteri iletişimi ve gerçek zamanlı güncellemeyi vurgular.^4 Dispatch sayfası canlı teknisyen durumu, rota, mobil bildirim ve müşteri durum bilgisini aynı karar döngüsüne bağlar.^5

Teklif tarafında sahada oluşturma, ayrıntılı kalemler, SMS/e-posta gönderimi, mobil imza, ödeme planı ve tekliften işe dönüşüm anlatılır.^6 Satış teklifi sayfası şablon, sürüm/işbirliği, üç seviyeli paket, opsiyonel ek kalem ve müşteri etkileşim analitiğini öne çıkarır.^7 Fiyat sayfası klasörleme, toplu import/export, vergi niteliği, malzeme/hizmet ayrımı ve ek dosya gibi katalog davranışları tanımlar.^8

Operasyonun saha tarafında GPS, geofence bağlantılı mesai, seyahat/iş süresi, time-card raporu, mobil push, müşteriyle belge imzalama ve ödeme etkileşimi bulunur.^9 ^10 Mobil uygulama iddiaları offline güvenilirlik veya çakışma çözümü hakkında yeterli teknik kanıt sunmadığı için SahaFlow bunları bağımsız gereksinim olarak ele almalıdır.

Finans tarafında ödeme bakiyesi, kısmi ödeme benzeri bakiye takibi, bahşiş, masraf, çalışan ödemesi/komisyonu, iş kârlılığı ve rapor export anlatılır.^11 ^12 G2 fiyatlandırma sayfası kullanıcı kotası, depolama kotası ve özellik bazlı paketlemeyi de ürün kabiliyeti olarak gösterir.^13 Bu bilgiler güncel sözleşme veya kesin fiyat garantisi değildir; SahaFlow için yalnızca entitlement ve kullanım ölçümü ihtiyacını destekler.

Bağımsız incelemelerde ortak olumlu temalar planlama, dispatch, fatura/teklif bütünlüğü ve destek; ortak zorluk ise geniş ayar seti nedeniyle ilk kurulum ve öğrenme eşiğidir.^1 ^2 Bu nedenle SahaFlow'un farklılaşması yalnızca daha çok modül değil, yönlendirilmiş onboarding, rol bazlı sadeleştirme ve tutarlı durum makineleri olmalıdır.

## Master Spec karşılaştırma matrisi

| Kabiliyet                  | Master Spec durumu | Karar                                                     | Hedef faz       |
| -------------------------- | ------------------ | --------------------------------------------------------- | --------------- |
| Çoklu adres ve müşteri 360 | Güçlü              | Aynen koru; bina/site hiyerarşisi ekle                    | 4 CRM           |
| Cihaz/varlık geçmişi ve QR | Güçlü              | Garanti, sözleşme ve bakım planıyla bağla                 | 4–5             |
| İş emri durum makinesi     | Güçlü              | İptal/bekletme nedenleri ve geri çağrı ekle               | 5 Jobs          |
| Tekrarlayan bakım          | Kısmi              | Recurrence rule + template + generation ledger ekle       | 5 Jobs          |
| Servis sözleşmesi/SLA      | Eksik              | Ayrı domain olarak ekle                                   | 5, 9            |
| Drag/drop dispatch         | Güçlü              | Kapasite, seyahat tamponu ve override nedeni ekle         | 6 Dispatch      |
| Akıllı teknisyen önerisi   | Güçlü              | Açıklanabilir skor ve manuel karar audit'i ekle           | 6 Dispatch      |
| GPS ve rota                | Güçlü              | Mesai/iş bağlamı, retention ve erişim audit'i zorunlu     | 6, 13, 15       |
| Paketli teklif             | Güçlü              | Şablon/version, add-on ve event timeline ekle             | 7 Quotes        |
| Fiyat kataloğu             | Kısmi              | Sürümlü price book ve müşteri fiyat grubu ekle            | 7, 10           |
| Servis formu ve çift imza  | Güçlü              | Şablon/schema version ve offline draft ekle               | 8 Reports       |
| Fatura/tahsilat            | Güçlü              | Taksit planı, kısmi ödeme, refund ve allocation ekle      | 9 Finance       |
| İş maliyeti                | Kısmi              | Cost ledger ve estimate-vs-actual ekle                    | 9, 11           |
| Komisyon/puantaj           | Kısmi              | Kural motoru ve payroll export ekle; bordro ürünü olmasın | 9, 11           |
| Stok                       | Güçlü temel        | Rezervasyon, tedarikçi ve satın alma siparişi ekle        | 10 Inventory    |
| Raporlama                  | Güçlü hedef        | Saved view, schedule, export job ve veri sözlüğü ekle     | 11 Reports      |
| İletişim                   | Güçlü temel        | Transactional/marketing ayrımı ve İYS ledger ekle         | 12 Integrations |
| Müşteri geri bildirimi     | Kısmi              | Tarafsız CSAT/NPS + issue recovery ekle                   | 12, 14          |
| Mobil                      | Güçlü akış         | Offline-first senkronizasyonu kabul kriteri yap           | 13 Mobile       |
| Müşteri portalı            | Güçlü              | Online booking, sözleşme ve varlık self-service ekle      | 14 Portal       |
| Feature entitlement/kota   | Eksik              | Plan, entitlement, usage meter ve feature flag ekle       | 3, 15           |
| Veri taşıma/onboarding     | Kısmi              | İdempotent import pipeline ve onboarding progress ekle    | 3, 4            |

## Fazlara eklenen ürün gereksinimleri

### Faz 3 — Application Shell + Design System

- Organization switcher seçimi server-side membership ile tekrar doğrulansın.
- Sidebar öğeleri permission ve entitlement bilgisine göre gösterilsin; görünmemesi backend yetkisinin yerine geçmesin.
- Global komut menüsü müşteri, iş emri, teklif ve fatura araması için ortak arama sözleşmesi kullansın.
- Notification center okunma durumu, bağlantılı entity, önem, kanal ve teslim sonucu taşısın.
- Onboarding checklist şirket bilgisi, ekip daveti, hizmet kataloğu, çalışma saatleri, ilk müşteri ve ilk iş adımlarını izlesin.
- Plan/entitlement modeli bu fazda arayüz sözleşmesi olarak tanımlansın; ücretlendirme uygulanmasa bile kilitli özellik davranışı tek merkezden yönetilsin.
- Tasarım sistemi tablo, filtre çubuğu, durum rozeti, para/tarih, boş-hata-yükleniyor, drawer/modal, confirmation ve audit timeline bileşenlerini kapsasın.

### Faz 4 — CRM / Customers

- `CustomerContact`, iletişim tercihi ve transactional/marketing kanal ayrımı eklensin.
- Adres modeli site, bina, blok, kat, bağımsız bölüm ve erişim talimatını desteklesin.
- Müşteri birden fazla fiyat grubu, ödeme vadesi ve vergi profiliyle ilişkilendirilebilsin.
- Varlıklar garanti, servis sözleşmesi, bakım planı ve geçmiş arıza kodlarına bağlansın.
- CSV import: dry-run, kolon eşleme, hata dosyası, idempotency key ve tenant scope içersin.

### Faz 5 — Jobs

- `JobTemplate`, `RecurrenceRule`, `RecurringJobSeries` ve `GenerationRun` tasarlansın.
- Tekrarlayan iş üretimi timezone/DST güvenli, idempotent ve iptal istisnalarını destekleyen BullMQ işi olsun.
- `ServiceAgreement` müşteri/varlık kapsamı, başlangıç-bitiş, ziyaret kotası, dahil hizmet/malzeme, SLA ve yenileme durumunu taşısın.
- İş maliyeti için tahmini işçilik, malzeme, yol ve dış hizmet bütçesi saklansın.
- Bekletme, iptal ve tekrar servis nedenleri zorunlu kod listelerinden seçilsin.
- Checklist ve zorunlu alanlar iş türü şablonundan gelsin; tamamlanma kontrolü backend'de yapılsın.

### Faz 6 — Planning & Dispatch

- Takvim kapasitesi vardiya, izin, mola, yetkinlik, bölge, araç ve seyahat tamponunu dikkate alsın.
- Drag/drop mutasyonu optimistic concurrency version taşısın; aynı atamanın eşzamanlı değişikliği 409 dönsün.
- Öneri motoru skor bileşenlerini açıklasın. Kullanıcı öneriden ayrılırsa isteğe bağlı override nedeni audit'e yazılsın.
- Geofence yalnızca varış/mesai doğrulama sinyali olsun; otomatik disiplin kararı üretmesin.
- Harita sağlayıcısı cevapları süreli cache'lensin; ham konum geçmişi için tenant bazlı saklama süresi uygulansın.

### Faz 7 — Quotes

- Teklif şablonu ve teklif sürümü immutable snapshot yaklaşımıyla saklansın.
- Ekonomik/Önerilen/Premium paketler ortak ve pakete özel satırları desteklesin.
- Opsiyonel add-on satırları müşterinin seçimine göre toplamı yeniden hesaplasın; tüm para hesabı bigint minor unit ile backend'de doğrulansın.
- `QuoteEvent` sent, delivered, viewed, option_selected, accepted, rejected ve expired olaylarını zaman çizelgesinde tutsun.
- Kabul anında seçilen paket, fiyatlar, KDV, sözleşme metni sürümü, IP/user-agent ve imza kanıtı snapshot olarak saklansın.
- Tekliften işe dönüşüm idempotent olsun; aynı tekliften yanlışlıkla iki iş üretilmesin.

### Faz 8 — Service Reports

- Servis formu şablonu ve schema sürümü saklansın; eski raporlar yeni şablonla yeniden yorumlanmasın.
- Offline taslak, fotoğraf yükleme devamı ve içerik hash'i desteklensin.
- Planlanan/gerçek işçilik, kullanılan/rezerve malzeme ve tespit edilen ek iş farkları kaydedilsin.
- Müşteri imzasından sonra değişiklik yeni revision ve audit gerektirsin.

### Faz 9 — Invoice & Payments

- Fatura ile ödeme arasında `PaymentAllocation` kullanılarak kısmi ve çoklu fatura ödemesi desteklensin.
- Deposit, payment schedule, refund, chargeback ve write-off ayrı durum/ledger hareketleri olsun.
- İş maliyetleri malzeme hareketi, onaylı zaman kaydı, yol ve dış hizmetten beslensin.
- Komisyon, rol/teknisyen/hizmet/marj temelli sürümlü kurallarla hesaplanabilsin; onay ve reversal audit'e yazılsın.
- SahaFlow genel muhasebe defteri olmaya çalışmasın; Logo/Mikro/Netsis vb. adapter'lara güvenilir belge ve hareket export etsin.

### Faz 10 — Inventory

- `Supplier`, `PurchaseRequest`, `PurchaseOrder`, `GoodsReceipt` ve `JobMaterialReservation` eklensin.
- Teknisyen eksik malzemeyi iş emrinden talep edebilsin; depo sorumlusu onaylayıp tedarikçiye siparişe çevirebilsin.
- Rezerve, kullanılabilir ve eldeki stok ayrı gösterilsin.
- Negatif stok politikası tenant ayarı olsun; tüm stok hareketleri atomik ve ters kayıtla düzeltilebilir olsun.
- Barkod/QR, lot/seri ve garanti takibi ürün türüne göre açılabilsin.

### Faz 11 — Reports

- İş kârlılığı, tahmin-gerçekleşen, teknisyen kullanım oranı, seyahat oranı, ilk seferde çözüm, tekrar servis ve SLA ihlali eklensin.
- Teklif funnel sent→viewed→accepted ve paket/add-on dönüşümü ölçülsün.
- Rapor sorguları tenant scope, tarih dilimi ve para birimi kurallarına uysun.
- Büyük CSV/XLSX export senkron HTTP cevabı yerine BullMQ işi ve süreli signed download kullansın.
- Saved view ve periyodik rapor teslimi permission kontrollü olsun.

### Faz 12 — Integrations & Automation

- Provider kayıtları capability, health, credential version, webhook secret version ve son başarılı senkronizasyonu taşısın.
- Transactional servis mesajı ile pazarlama mesajı ayrı amaç ve izin kaydı kullansın.
- İYS entegrasyonu yalnızca yetkili entegratör ve güncel resmi dokümanla uygulanabilsin. Onay/ret olayı kanal ve marka bazında immutable ledger'a yazılsın.^14
- E-belge adapter'ı GİB'in güncel kılavuz sürümünü configuration metadata olarak kaydetsin; şema ve belge durumları provider'dan gelsin.^15
- Webhook inbox: signature, timestamp tolerance, provider event unique key, raw payload hash, processing state ve replay-safe handler içersin.
- Otomasyonlar dry-run, rate limit, idempotency key, execution log, retry/backoff ve dead-letter davranışına sahip olsun.
- Müşteri memnuniyet isteği tüm müşterilere aynı nötr kuralla gönderilsin. Puanı düşük müşteriyi yalnızca özel forma, yüksek müşteriyi yalnızca Google'a yönlendiren “review gating” uygulanmasın; Google seçici olumlu yorum istemeyi yasaklar.^16

### Faz 13 — Technician Mobile App

- Offline-first local store, outbox, server version ve conflict UI tasarlansın.
- Atama, durum, checklist, not, zaman, malzeme, fotoğraf ve imza offline kaydedilebilsin.
- Medya yüklemeleri tekrar başlayabilsin; dosya hash, MIME, boyut ve tenant prefix backend'de doğrulansın.
- Konum yalnızca tanımlı mesai/iş bağlamında ve görünür kullanıcı göstergesiyle toplansın. KVKK'nın amaçla bağlantılı, sınırlı, ölçülü ve gerekli süre kadar saklama ilkeleri retention ve erişim tasarımına uygulanmalıdır.^17
- Clock-in geofence istisnası gerekçe ve yönetici onayıyla çözülebilsin.
- Push notification deep-link'i yalnızca hâlâ yetkili olunan entity'yi açsın.

### Faz 14 — Customer Portal

- Müşteri online randevu talebinde hizmet, adres, varlık, zaman tercihi ve fotoğraf ekleyebilsin; kesin atama dispatcher onayından sonra oluşsun.
- Aktif servis sözleşmesi, kalan ziyaret hakkı, yaklaşan bakım ve garanti görünür olsun.
- Teklif paketi/add-on seçimi, e-imza kanıtı, ödeme planı ve fatura tahsilatı portalda birleşsin.
- Portal erişimi customer scope ile sınırlandırılsın; tahmin edilebilir ID tek başına erişim vermesin.
- Veri indirme, iletişim tercihi ve hesap erişimi talepleri privacy center üzerinden başlatılabilsin.

### Faz 15 — Security, Performance & QA

- `Plan`, `Feature`, `PlanEntitlement`, `OrganizationSubscription` ve `UsageCounter` ile modüler SaaS hakkı yönetilsin.
- Depolama, kullanıcı, SMS, iş ve export kotaları transaction güvenli sayaçlarla uygulanabilsin.
- KVKK aydınlatma/izin sürümü, hukuki sebep, amaç, retention ve silme/anonimleştirme işi merkezi privacy ledger'da izlenebilsin.
- Konum, çağrı kaydı ve iletişim verisi için ayrı retention politikaları ve erişim raporu oluşturulsun.
- Data import/export ve tenant silme işlemleri resumable job, onay, audit ve sonuç manifest'i kullansın.
- Public API/webhook için tenant-scoped API key hash'i, scope, rotation, rate limit ve delivery log tasarlansın.

## Potansiyel eklenti portföyü

### Yüksek değer, çekirdeğe yakın

1. **Bakım Sözleşmeleri:** Periyodik iş üretimi, SLA, dahil haklar, yenileme ve sözleşme geliri.
2. **Fiyat Kataloğu ve Teklif Şablonları:** Sürüm, fiyat grubu, toplu güncelleme, paket ve add-on.
3. **İş Kârlılığı:** Teklif bütçesi ile gerçek işçilik/malzeme/yol/dış hizmet karşılaştırması.
4. **Satın Alma:** İşten malzeme talebi, tedarikçi siparişi, teslim ve stok rezervasyonu.
5. **Puantaj ve Komisyon:** Saha zamanı, onay, bordro export ve komisyon mutabakatı.
6. **Tarafsız Müşteri Deneyimi:** CSAT/NPS, şikâyet, düzeltici faaliyet ve eşit yorum isteme.

### Orta vadeli büyüme

1. **Çok şubeli/franchise yönetimi:** Organization altında branch ve veri görünürlük sınırı.
2. **Gelişmiş çağrı merkezi:** Santral adapter'ı, çağrı notu, izinli kayıt, çağrıdan müşteri/iş eşleme.
3. **IYS uyumlu kampanya:** Segment, kanal izni, frequency cap, unsubscribe ve teslim analitiği.
4. **Müşteri finansmanı adapter'ı:** Yalnızca lisanslı sağlayıcı ve resmi API ile teklif ödeme planı.
5. **Fleet:** Araç, bakım, kilometre, yakıt, sürücü ataması ve rota maliyeti.
6. **Public API + outbound webhook:** İş ortakları ve kurumsal müşteriler için kontrollü entegrasyon.
7. **White-label portal:** Alan adı, tema ve belge markası; SahaFlow güvenlik/erişilebilirlik tabanı korunur.

### İleri analitik ve AI

1. **Açıklanabilir rota optimizasyonu:** Trafik, yetkinlik, SLA, süre, kapasite ve maliyet kısıtları.
2. **Tahmini bakım:** Varlık geçmişi ve ölçüm verisi yeterli olduğunda arıza riski; erken aşamada kural tabanı.
3. **No-show ve gecikme riski:** Geçmiş randevu ve rota sinyalleri; otomatik karar yerine uyarı.
4. **Teklif önerisi:** Geçmiş kabul ve marj verisiyle paket önerisi; kullanıcı onayı ve açıklama zorunlu.
5. **Operasyon asistanı:** Yetki kontrollü doğal dil arama/özet; mutation işlemleri açık kullanıcı onayı gerektirir.

AI özellikleri yeterli ve hukuka uygun veri oluşmadan başlatılmamalıdır. İlk sürümler deterministik kural motoru, açıklanabilir skor ve ölçüm altyapısı kurmalıdır.

## Bilinçli olarak alınmayacak yaklaşımlar

- Orcatec ekranları, metinleri, görselleri ve marka anlatımı kopyalanmayacak.
- ABD odaklı ACH/QuickBooks/consumer-financing davranışı Türkiye'ye doğrudan uyarlanmayacak.
- Ürün tam muhasebe veya bordro uygulamasına dönüştürülmeyecek; saha operasyonuna ait doğru kayıt ve yerel sistemlere adapter/export sağlanacak.
- Sürekli çalışan takibi varsayılan olmayacak. Konum mesai/iş bağlamı, açık amaç, retention ve yetkiyle sınırlanacak.
- Olumsuz geri bildirimi saklayıp yalnız olumlu müşteriyi açık yorum kanalına yönlendiren review gating yapılmayacak.
- Teknik doküman ve credential olmadan gerçek provider davranışı uydurulmayacak.

## Öncelik ve bağımlılık sırası

Master Spec faz sırası korunur. Yeni gereksinimler yeni bir paralel ürün hattı oluşturmaz:

1. Faz 3'te shell, onboarding, entitlement sözleşmesi ve ortak component sistemi.
2. Faz 4–6'da müşteri/varlık, tekrarlayan iş/sözleşme ve kapasite tabanlı dispatch veri temeli.
3. Faz 7–10'da fiyat kataloğu, teklif event'leri, maliyet ledger'ı, ödeme allocation ve satın alma.
4. Faz 11–12'de gerçek raporlar, İYS/mesajlaşma ve otomasyon güvenilirliği.
5. Faz 13–14'te offline mobil ve self-service portal.
6. Faz 15'te entitlement, kota, privacy center, public API ve üretim hardening.

Her capability UI → API → service/domain → database → authorization → validation → audit/error → test zinciriyle tamamlanacaktır. Bir feature flag veya boş menü maddesi “tamamlandı” kabul edilmeyecektir.

## Kabul kapılarına ek testler

- Recurrence aynı periyotta iki iş üretmez; timezone ve tarih istisnası test edilir.
- Başka tenant'ın sözleşme, fiyat kitabı, tedarikçi, purchase order ve export dosyasına erişim reddedilir.
- Dispatch eşzamanlı taşıma çakışmasında 409 ve güncel sürüm döndürür.
- Teklif toplamı paket/add-on/KDV/indirim kombinasyonlarında bigint ile deterministik hesaplanır.
- Teklif kabulünden aynı iş iki kez üretilemez.
- Payment webhook tekrarında ikinci tahsilat/allocation oluşmaz.
- Stok rezervasyon ve tüketim yarışı negatif stok politikasını ihlal etmez.
- Offline mobil outbox aynı komutu tekrar gönderdiğinde idempotent sonuç alır.
- GPS kaydı mesai/iş bağlamı yoksa reddedilir; retention işi süresi dolan ham veriyi temizler.
- Pazarlama mesajı geçerli kanal izni yoksa gönderilmez; transactional mesaj ayrı kuralla çalışır.
- Review request puana göre ayrım yapmadan aynı tarafsız hedefi kullanır.
- Export job yalnız tenant verisini içerir ve signed URL süresi dolduğunda erişilemez.
- Entitlement UI ve API seviyesinde aynı kararı üretir; backend daima nihai otoritedir.

## Kaynaklar

1. G2, “[Orcatec Reviews & Product Details](https://www.g2.com/products/orcatec/reviews),” erişim 14 Eylül 2026.
2. Capterra, “[Reviews of Orcatec](https://www.capterra.com/p/119837/orcatec/reviews/),” güncelleme 3 Haziran 2026.
3. Orcatec, “[Home Services Management Software](https://orcatec.com/),” erişim 14 Eylül 2026.
4. Orcatec, “[Job Scheduling Software](https://orcatec.com/features/job-scheduling),” erişim 14 Eylül 2026.
5. Orcatec, “[Field Service Dispatching Software](https://orcatec.com/features/field-service-dispatching),” erişim 14 Eylül 2026.
6. Orcatec, “[Field Service Estimate Software](https://orcatec.com/features/field-service-estimating),” erişim 14 Eylül 2026.
7. Orcatec, “[Sales Proposal Software](https://orcatec.com/features/sales-proposal-tool),” erişim 14 Eylül 2026.
8. Orcatec, “[Price Pages](https://orcatec.com/features/price-pages),” erişim 14 Eylül 2026.
9. Orcatec, “[Employee Time Tracking](https://orcatec.com/features/employee-time-tracking),” erişim 14 Eylül 2026.
10. Orcatec, “[Mobile App](https://orcatec.com/features/mobile-app),” erişim 14 Eylül 2026.
11. Orcatec, “[Payment Management](https://orcatec.com/features/payment-management),” erişim 14 Eylül 2026.
12. Orcatec, “[Field Service Accounting](https://orcatec.com/features/field-service-accounting),” erişim 14 Eylül 2026.
13. G2, “[Orcatec Pricing](https://www.g2.com/products/orcatec/pricing),” erişim 14 Eylül 2026.
14. T.C. Ticaret Bakanlığı, “[İleti Yönetim Sistemi (İYS)](https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/ileti-yonetim-sistemi-iys),” 18 Nisan 2023.
15. Gelir İdaresi Başkanlığı, “[e-Arşiv Teknik Kılavuzu V1.18](https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf),” Ağustos 2025.
16. Google, “[Fake engagement policy](https://support.google.com/contributionpolicy/answer/11414422?hl=en),” erişim 14 Eylül 2026.
17. Kişisel Verileri Koruma Kurumu, “[Kişisel Verilerin İşlenmesine İlişkin Temel İlkeler](https://www.kvkk.gov.tr/Icerik/4189/Kisisel-Verilerin-Islenmesine-Iliskin-Temel-Ilkeler),” erişim 14 Eylül 2026.
