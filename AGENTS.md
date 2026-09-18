# AGENTS.md — Proje Çalışma Akışı

SahaFlowTr (pnpm + Turborepo monorepo: NestJS `apps/api`, Next.js `apps/web`,
BullMQ `apps/worker`, Prisma `packages/database`, saf TS `packages/domain`)
üzerinde dört aşamalı bir geliştirme akışı kullanılır. Her aşamanın kuralları
ayrı bir skill dosyasında tutulur; ilgili skill, o aşamaya girildiğinde ya da
konuşmada adı geçtiğinde devreye girer.

## Akış

1. **İzole et** → `new-feature` skill'i
   Yeni branch aç, etkilenecek apps/packages'ı planla, faz planına ve ADR'lere
   aykırılık olup olmadığını kontrol et.
2. **İnşa et** → `code-structure` skill'i
   NestJS modül deseni, tenant izolasyonu, RBAC, para/KDV ve hassas veri
   kurallarını uygula.
3. **Kanıtla** → `prove-it` skill'i
   CI'daki gerçek sırayla doğrula: `db:generate` → `lint` → `typecheck` →
   `test` → `build` → gerekiyorsa `test:e2e`.
4. **Gönder** → `ship-it` skill'i
   Conventional commit, `docs/phase-reports.md` güncellemesi, PR notları.

## Genel kurallar

- Her aşama bir öncekini tamamlamadan atlanmaz.
- **"Kanıtla" aşaması geçilmeden hiçbir iş "tamamlandı" sayılmaz.**
- Skill dosyaları `.claude/skills/<isim>/SKILL.md` altında yaşar.
