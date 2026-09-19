"use client";
import { ArrowLeft, Boxes, Layers, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  formatMinor,
  minorToInput,
  parseMinorInput,
  VAT_RATE_OPTIONS,
} from "./catalog.helpers";
import { PanelState, StatusBadge } from "./design-system";
import {
  priceComparison,
  sortLines,
  TIER_LABELS,
  TIER_ORDER,
  type PackageLine,
  type PackageTier,
} from "./service-packages.helpers";

type ServicePackage = {
  id: string;
  familyId: string | null;
  tier: PackageTier | null;
  key: string;
  name: string;
  description: string | null;
  priceMinor: string;
  vatRateBps: number;
  active: boolean;
  version: number;
  items: PackageLine[];
};
type Family = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  version: number;
  packages: ServicePackage[];
};
type CatalogOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  listPriceMinor: string;
};
type DraftLine = { catalogItemId: string; quantity: string; addon: boolean };

async function json<T>(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const data = (await r.json().catch(() => null)) as
    { message?: string; fields?: Array<{ message: string }> } | T;
  if (!r.ok) {
    const e = data as { message?: string; fields?: Array<{ message: string }> };
    throw new Error(
      e.fields?.[0]?.message ?? e.message ?? "İşlem tamamlanamadı",
    );
  }
  return data as T;
}

export function ServicePackages({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: string[];
}) {
  const [families, setFamilies] = useState<Family[]>([]),
    [detail, setDetail] = useState<Family | null>(null),
    [catalog, setCatalog] = useState<CatalogOption[]>([]),
    [state, setState] = useState<"loading" | "idle" | "error">("loading"),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [familyForm, setFamilyForm] = useState(false),
    [packageForm, setPackageForm] = useState<{
      tier: PackageTier;
      existing: ServicePackage | null;
    } | null>(null),
    [lineEditor, setLineEditor] = useState<{
      title: string;
      scope: "family" | "package";
      packageId?: string;
      version: number;
      lines: DraftLine[];
    } | null>(null);
  const canManage = permissions.includes("quote.manage");
  const familiesUrl = `/api/v1/organizations/${organizationId}/service-package-families`;
  const packagesUrl = `/api/v1/organizations/${organizationId}/service-packages`;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [list, items] = await Promise.all([
        json<{ items: Family[] }>(
          `${familiesUrl}?${new URLSearchParams({ search, status: "ALL", pageSize: "50" })}`,
        ),
        json<{ items: CatalogOption[] }>(
          `/api/v1/organizations/${organizationId}/catalog-items?${new URLSearchParams(
            { status: "ACTIVE", pageSize: "100" },
          )}`,
        ),
      ]);
      setFamilies(list.items);
      setCatalog(items.items);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paketler alınamadı");
      setState("error");
    }
  }, [familiesUrl, organizationId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openFamily(familyId: string) {
    setError("");
    try {
      setDetail(await json<Family>(`${familiesUrl}/${familyId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paket ailesi açılamadı");
    }
  }

  async function saveFamily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      await json(familiesUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: String(data.get("key") ?? "").trim(),
          name: String(data.get("name") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
        }),
      });
      setFamilyForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aile kaydedilemedi");
    }
  }

  async function savePackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!packageForm || !detail) return;
    const data = new FormData(event.currentTarget);
    const existing = packageForm.existing;
    setError("");
    try {
      const payload = {
        key: String(data.get("key") ?? "").trim(),
        name: String(data.get("name") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        familyId: detail.id,
        tier: packageForm.tier,
        priceMinor: parseMinorInput(String(data.get("price") ?? "")),
        vatRateBps: Number(data.get("vatRateBps")),
      };
      await json(existing ? `${packagesUrl}/${existing.id}` : packagesUrl, {
        method: existing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          existing ? { ...payload, version: existing.version } : payload,
        ),
      });
      setPackageForm(null);
      await openFamily(detail.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paket kaydedilemedi");
    }
  }

  async function togglePackage(item: ServicePackage) {
    if (!detail) return;
    setError("");
    try {
      await json(
        item.active
          ? `${packagesUrl}/${item.id}`
          : `${packagesUrl}/${item.id}/restore`,
        { method: item.active ? "DELETE" : "POST" },
      );
      await openFamily(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paket güncellenemedi");
    }
  }

  async function saveLines() {
    if (!lineEditor || !detail) return;
    setError("");
    try {
      const body = JSON.stringify({
        version: lineEditor.version,
        items: lineEditor.lines.filter((line) => line.catalogItemId),
      });
      await json(
        lineEditor.scope === "family"
          ? `${familiesUrl}/${detail.id}/shared-items`
          : `${packagesUrl}/${lineEditor.packageId}/items`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body,
        },
      );
      setLineEditor(null);
      await openFamily(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Satırlar kaydedilemedi");
    }
  }

  function editFamilyLines() {
    if (!detail) return;
    const source = detail.packages.find((item) =>
      item.items.some((line) => line.shared),
    );
    setLineEditor({
      title: "Ailenin ortak satırları",
      scope: "family",
      version: detail.version,
      lines: (source?.items ?? [])
        .filter((line) => line.shared)
        .map((line) => ({
          catalogItemId: line.catalogItemId,
          quantity: line.quantity,
          addon: line.addon,
        })),
    });
  }

  function editPackageLines(item: ServicePackage) {
    setLineEditor({
      title: `${item.name} · pakete özel satırlar`,
      scope: "package",
      packageId: item.id,
      version: item.version,
      lines: item.items
        .filter((line) => !line.shared)
        .map((line) => ({
          catalogItemId: line.catalogItemId,
          quantity: line.quantity,
          addon: line.addon,
        })),
    });
  }

  if (detail) {
    const byTier = new Map(
      detail.packages
        .filter((item) => item.tier)
        .map((item) => [item.tier, item]),
    );
    return (
      <section className="customer-detail-view">
        <button className="back-button" onClick={() => setDetail(null)}>
          <ArrowLeft size={16} /> Paket ailelerine dön
        </button>
        <div className="content-card customer-detail-head">
          <div className="customer-identity">
            <span>
              <Layers />
            </span>
            <div>
              <small>{detail.key}</small>
              <h2>{detail.name}</h2>
              {detail.description && <p>{detail.description}</p>}
            </div>
          </div>
          {canManage && (
            <div className="detail-actions">
              <button onClick={editFamilyLines}>
                <Boxes size={16} /> Ortak satırlar
              </button>
            </div>
          )}
        </div>
        {error && <div className="auth-error">{error}</div>}
        <div className="package-tier-grid">
          {TIER_ORDER.map((tier) => {
            const item = byTier.get(tier);
            return (
              <section className="content-card related-card" key={tier}>
                <div className="section-title">
                  <h3>{TIER_LABELS[tier]}</h3>
                  {item ? (
                    <StatusBadge tone={item.active ? "neutral" : "warning"}>
                      {item.active ? "Aktif" : "Pasif"}
                    </StatusBadge>
                  ) : (
                    canManage && (
                      <button
                        className="row-action"
                        onClick={() => {
                          setError("");
                          setPackageForm({ tier, existing: null });
                        }}
                      >
                        <Plus size={14} /> Ekle
                      </button>
                    )
                  )}
                </div>
                {!item && (
                  <PanelState kind="empty">
                    Bu seviye için paket tanımlı değil.
                  </PanelState>
                )}
                {item && (
                  <>
                    <p className="package-price">
                      <strong>{formatMinor(item.priceMinor)}</strong>
                      <small>KDV %{item.vatRateBps / 100}</small>
                    </p>
                    <small className="package-compare">
                      {priceComparison(item.priceMinor, item.items)}
                    </small>
                    <ul className="package-line-list">
                      {sortLines(item.items).map((line) => (
                        <li key={line.catalogItemId}>
                          <span>
                            {line.catalogItem.name}
                            <small>
                              {Number(line.quantity)} {line.catalogItem.unit}
                            </small>
                          </span>
                          <StatusBadge
                            tone={line.addon ? "warning" : "neutral"}
                          >
                            {line.shared ? "Ortak" : "Pakete özel"}
                            {line.addon ? " · add-on" : ""}
                          </StatusBadge>
                        </li>
                      ))}
                      {!item.items.length && <li>Satır yok.</li>}
                    </ul>
                    {canManage && (
                      <div className="job-actions">
                        <button
                          onClick={() => {
                            setError("");
                            setPackageForm({ tier, existing: item });
                          }}
                        >
                          Düzenle
                        </button>
                        <button onClick={() => editPackageLines(item)}>
                          Satırlar
                        </button>
                        <button
                          className={
                            item.active ? "danger-ghost" : "row-action"
                          }
                          onClick={() => void togglePackage(item)}
                        >
                          {item.active ? (
                            "Pasife al"
                          ) : (
                            <>
                              <RotateCcw size={14} /> Geri al
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
        {packageForm && (
          <PackageDialog
            tier={packageForm.tier}
            existing={packageForm.existing}
            error={error}
            onClose={() => setPackageForm(null)}
            onSubmit={savePackage}
          />
        )}
        {lineEditor && (
          <LineDialog
            title={lineEditor.title}
            lines={lineEditor.lines}
            catalog={catalog}
            error={error}
            onChange={(lines) => setLineEditor({ ...lineEditor, lines })}
            onClose={() => setLineEditor(null)}
            onSave={() => void saveLines()}
          />
        )}
      </section>
    );
  }

  return (
    <section className="content-card">
      <div className="section-title">
        <h3>
          <Layers size={18} /> Servis paketleri
        </h3>
        {canManage && (
          <button
            className="primary"
            onClick={() => {
              setError("");
              setFamilyForm(true);
            }}
          >
            <Plus size={16} /> Yeni aile
          </button>
        )}
      </div>
      <div className="list-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <input
            aria-label="Paket ailesi ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Anahtar veya ad…"
          />
          <button>Ara</button>
        </form>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Paketler yükleniyor…</PanelState>
      )}
      {state === "error" && <PanelState kind="error">{error}</PanelState>}
      {state === "idle" && !families.length && (
        <PanelState kind="empty">
          Paket ailesi bulunmuyor. Bir aile, aynı hizmetin Ekonomik, Önerilen ve
          Premium seviyelerini bir arada tutar.
        </PanelState>
      )}
      {families.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Aile</th>
                <th>Seviyeler</th>
                <th>Ortak satır</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {families.map((family) => {
                const shared = family.packages
                  .flatMap((item) => item.items)
                  .filter((line) => line.shared);
                const sharedCount = new Set(
                  shared.map((line) => line.catalogItemId),
                ).size;
                return (
                  <tr key={family.id}>
                    <td>
                      <strong>{family.name}</strong>
                      <small>{family.key}</small>
                    </td>
                    <td>
                      {family.packages
                        .filter((item) => item.tier)
                        .map((item) => TIER_LABELS[item.tier!])
                        .join(", ") || "—"}
                    </td>
                    <td>{sharedCount}</td>
                    <td>
                      <StatusBadge tone={family.active ? "neutral" : "warning"}>
                        {family.active ? "Aktif" : "Pasif"}
                      </StatusBadge>
                    </td>
                    <td>
                      <button
                        className="row-action"
                        onClick={() => void openFamily(family.id)}
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {familyForm && (
        <div
          className="dialog-backdrop"
          onMouseDown={() => setFamilyForm(false)}
        >
          <section
            className="entity-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="popover-title">
              <strong>Yeni paket ailesi</strong>
              <button onClick={() => setFamilyForm(false)}>
                <X />
              </button>
            </div>
            <form className="entity-form" onSubmit={saveFamily}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Anahtar</span>
                  <input name="key" required maxLength={60} />
                </label>
                <label className="form-field">
                  <span>Ad</span>
                  <input name="name" required minLength={2} />
                </label>
              </div>
              <label className="form-field">
                <span>Açıklama</span>
                <textarea name="description" rows={3} />
              </label>
              {error && <div className="auth-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setFamilyForm(false)}>
                  İptal
                </button>
                <button className="primary">Kaydet</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function PackageDialog({
  tier,
  existing,
  error,
  onClose,
  onSubmit,
}: {
  tier: PackageTier;
  existing: ServicePackage | null;
  error: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="entity-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="popover-title">
          <strong>
            {TIER_LABELS[tier]} paketi {existing ? "düzenle" : "ekle"}
          </strong>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <form className="entity-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Anahtar</span>
              <input
                name="key"
                required
                maxLength={60}
                defaultValue={existing?.key}
              />
            </label>
            <label className="form-field">
              <span>Ad</span>
              <input
                name="name"
                required
                minLength={2}
                defaultValue={existing?.name}
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Paket fiyatı (TL)</span>
              <input
                name="price"
                required
                inputMode="decimal"
                placeholder="1.234,56"
                defaultValue={existing ? minorToInput(existing.priceMinor) : ""}
              />
            </label>
            <label className="form-field">
              <span>KDV oranı</span>
              <select
                name="vatRateBps"
                defaultValue={String(existing?.vatRateBps ?? 2000)}
              >
                {VAT_RATE_OPTIONS.map((option) => (
                  <option key={option.bps} value={option.bps}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field">
            <span>Açıklama</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={existing?.description ?? ""}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              İptal
            </button>
            <button className="primary">Kaydet</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function LineDialog({
  title,
  lines,
  catalog,
  error,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  lines: DraftLine[];
  catalog: CatalogOption[];
  error: string;
  onChange: (lines: DraftLine[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="entity-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="popover-title">
          <strong>{title}</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="entity-form">
          {lines.map((line, index) => (
            <div className="form-grid" key={index}>
              <label className="form-field">
                <span>Katalog kalemi</span>
                <select
                  value={line.catalogItemId}
                  onChange={(e) =>
                    onChange(
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, catalogItemId: e.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Seçin</option>
                  {catalog.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {option.sku}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-field">
                <span>Miktar ve tür</span>
                <span className="checkbox-row">
                  <input
                    aria-label="Miktar"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) =>
                      onChange(
                        lines.map((item, i) =>
                          i === index
                            ? { ...item, quantity: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={line.addon}
                      onChange={(e) =>
                        onChange(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, addon: e.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    Add-on
                  </label>
                  <button
                    type="button"
                    className="danger-ghost"
                    onClick={() =>
                      onChange(lines.filter((_, i) => i !== index))
                    }
                  >
                    Sil
                  </button>
                </span>
              </div>
            </div>
          ))}
          {!lines.length && (
            <PanelState kind="empty">Henüz satır eklenmedi.</PanelState>
          )}
          <button
            type="button"
            onClick={() =>
              onChange([
                ...lines,
                { catalogItemId: "", quantity: "1", addon: false },
              ])
            }
          >
            <Plus size={14} /> Satır ekle
          </button>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              İptal
            </button>
            <button className="primary" onClick={onSave}>
              Kaydet
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
