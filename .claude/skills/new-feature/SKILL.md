---
name: new-feature
description: SahaFlowTr'de yeni bir iş parçasına başlarken izolasyon adımı — branch aç, etkilenen apps/packages'ı planla, faz planı ve ADR'lere aykırılık kontrolü yap. Bir özellik, bugfix veya modül eklemeye başlamadan önce kullan.
---

# new-feature (İzole et)

SahaFlowTr dört aşamalı akışın birinci adımı. Koda dokunmadan önce bunları yap:

## 1. Branch aç

Ana branch (`main`) üzerinde doğrudan çalışma. Konuyu yansıtan kısa bir isimle
yeni bir branch aç (örn. `feature/quote-pdf`, `fix/dispatch-conflict`).

## 2. Etkilenen apps/packages'ı kısaca planla

3-5 satırlık bir plan yaz:

- Hangi `apps/{api,web,worker}` ve `packages/{domain,database,config}`
  etkilenecek.
- Yeni bir NestJS modülü mü, mevcut bir modüle ekleme mi, yoksa sadece
  `packages/domain` içinde saf mantık mı gerekiyor.
- Prisma şema/migration gerekiyor mu (yeni model, alan veya ilişki).
- Kapsam dışı bırakılan ne var.

## 3. Faz planına ve ADR'lere aykırılık kontrolü

- `docs/implementation-plan.md` içindeki faz tablosunu kontrol et: yapılacak iş
  hangi fazın kapsamında, o fazın "kabul ölçütü" ile uyumlu mu. Henüz açılmamış
  bir fazın işini erken taşımadan önce sırayı gözden geçir (fazlar sırayla
  kapanır; bir fazın gate'i geçilmeden sonrakine geçilmez).
- `docs/architecture.md` içindeki ADR-001..010'u tara, özellikle:
  - ADR-002 (tenant scope + composite FK, deny-by-default authorization),
  - ADR-003 (bigint kuruş, provider-agnostic entegrasyon, uydurma endpoint yok),
  - ADR-004 (sahte KPI/işlevsiz UI yok),
  - ADR-006 (sadece loopback dev container, prod'da TLS/secret/backup),
  - ADR-009 (plan/entitlement/kota backend-authoritative, UI sadece görünüm).
- Planlanan değişiklik bir ADR ile çelişiyorsa, ya yaklaşımı ADR'ye uyacak
  şekilde değiştir ya da kullanıcıya açıkça bildirip onay al — sessizce ADR'yi
  ihlal etme.
- Aynı işlevin kod tabanında zaten var olup olmadığını kontrol et (özellikle
  `packages/domain` ve ilgili NestJS modülü içinde), tekrar üretme.

## 4. Belirsizlikte sor

Kapsam, hangi faza ait olduğu veya bir ADR ile çelişip çelişmediği net değilse
kod yazmadan önce kullanıcıya sor.

Bu adım tamamlandıktan sonra `code-structure` skill'ine geç.
