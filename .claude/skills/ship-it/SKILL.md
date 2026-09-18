---
name: ship-it
description: SahaFlowTr'de doğrulanmış bir işi teslim etme aşaması — conventional commit, docs/phase-reports.md güncellemesi, migration/env notlarıyla PR açıklaması. Sadece prove-it aşaması tamamen geçtikten sonra kullan.
---

# ship-it (Gönder)

SahaFlowTr dört aşamalı akışın son adımı. Bu skill yalnızca `prove-it`
aşamasındaki tüm doğrulama adımları geçtikten sonra uygulanır.

## Conventional commit

- Commit mesajını conventional commit formatında yaz: `feat:`, `fix:`,
  `refactor:`, `docs:`, `test:`, `chore:` gibi bir tip ile başla, kısa ve
  net bir özet ver.
- Mesaj gövdesinde "neden" değiştiğini açıkla, "ne" değiştiğini değil (kod
  zaten neyin değiştiğini gösterir).
- Birden fazla mantıksal değişiklik varsa tek dev bir commit yerine
  anlamlı şekilde ayır.

## docs/phase-reports.md güncel tutma

- Yapılan iş `docs/implementation-plan.md` içindeki bir fazı ilerletiyor veya
  tamamlıyorsa, `docs/phase-reports.md` dosyasına aynı formatta
  (`## PHASE: N`, `STATUS`, `COMPLETED`, `FILES CHANGED`, `DATABASE`, `API`,
  `TEST RESULTS`, `KNOWN ISSUES`, `NEXT PHASE`) bir bölüm ekle veya mevcut
  fazın bölümünü güncelle.
- Yeni bir modül/tablo/endpoint eklendiyse bunu ilgili bölümlerde (DATABASE/
  API) açıkça belirt; sessizce atlama. Rapor dosyasının en son hangi faza
  kadar güncellendiğini kontrol et — eğer kod daha ileri bir fazı zaten
  kapsıyor ama rapor geride kaldıysa, bu tutarsızlığı da not et.

## PR açıklaması

PR açıklamasında en az şunları belirt:

- Ne değişti ve neden (kısa özet, faz/modül referansı).
- **Migration varsa**: migration adı, hangi modele/ilişkiye dokunduğu, geriye
  dönük uyumluluk durumu (breaking mi, backfill gerekiyor mu).
- **Env değişikliği varsa**: hangi değişkenin eklendiği/değiştiği,
  `.env.example` güncellendi mi, prod'da secret yönetimi için ek adım
  gerekip gerekmediği (bkz. ADR-006).
- `prove-it` aşamasında hangi komutların çalıştırıldığı ve sonucu (test
  planı / checklist olarak).

## Son kontrol

- `docs/phase-reports.md` ve varsa `docs/database.md`/`docs/api.md` gibi diğer
  doküman dosyaları kod ile tutarlı mı, son bir kez göz gezdir.
- Commit ve PR, `new-feature` adımında planlanan kapsamla uyumlu mu; kapsam
  dışına sessizce genişleme olmadığını doğrula.
