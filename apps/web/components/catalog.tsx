"use client";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers3,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  formatMinor,
  formatVatRate,
  minorToInput,
  parseMinorInput,
  VAT_RATE_OPTIONS,
} from "./catalog.helpers";
import { PanelState, StatusBadge } from "./design-system";

type CatalogItemKind = "PRODUCT" | "SERVICE" | "LABOR";
type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  kind: CatalogItemKind;
  category: string;
  unit: string;
  // Parasal alanlar API'den kuruş dizgisi olarak gelir.
  listPriceMinor: string;
  costPriceMinor: string;
  vatRateBps: number;
  trackInventory: boolean;
  reorderPoint: number;
  serialized: boolean;
  active: boolean;
  version: number;
};
const kindLabels: Record<CatalogItemKind, string> = {
  PRODUCT: "Ürün",
  SERVICE: "Hizmet",
  LABOR: "İşçilik",
};

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

export function Catalog({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: string[];
}) {
  const [items, setItems] = useState<CatalogItem[]>([]),
    [state, setState] = useState<"loading" | "idle" | "error">("loading"),
    [error, setError] = useState(""),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState<CatalogItem | null>(null),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("ALL"),
    [status, setStatus] = useState("ACTIVE"),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  const canManage = permissions.includes("inventory.manage");
  const base = `/api/v1/organizations/${organizationId}/catalog-items`;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const query = new URLSearchParams({
        search,
        kind,
        status,
        page: String(page),
        pageSize: "10",
      });
      const data = await json<{
        items: CatalogItem[];
        pagination: { pages: number };
      }>(`${base}?${query}`);
      setItems(data.items);
      setPages(data.pagination.pages);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Katalog alınamadı");
      setState("error");
    }
  }, [base, kind, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    setError("");
    try {
      const payload = {
        sku: text("sku"),
        name: text("name"),
        kind: text("kind"),
        category: text("category"),
        unit: text("unit"),
        listPriceMinor: parseMinorInput(text("listPrice")),
        costPriceMinor: parseMinorInput(text("costPrice")),
        vatRateBps: Number(text("vatRateBps")),
        trackInventory: data.get("trackInventory") === "on",
        reorderPoint: Number(text("reorderPoint") || "0"),
        serialized: data.get("serialized") === "on",
      };
      await json(editing ? `${base}/${editing.id}` : base, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          editing ? { ...payload, version: editing.version } : payload,
        ),
      });
      setForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kalem kaydedilemedi");
    }
  }

  async function toggleActive(item: CatalogItem) {
    setError("");
    try {
      await json(
        item.active ? `${base}/${item.id}` : `${base}/${item.id}/restore`,
        { method: item.active ? "DELETE" : "POST" },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kalem güncellenemedi");
    }
  }

  return (
    <section className="content-card">
      <div className="section-title">
        <h3>
          <Layers3 size={18} /> Fiyat kataloğu
        </h3>
        {canManage && (
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setError("");
              setForm(true);
            }}
          >
            <Plus size={16} /> Yeni kalem
          </button>
        )}
      </div>
      <div className="list-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <input
            aria-label="Katalog ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU, ad veya kategori…"
          />
          <button>Ara</button>
        </form>
        <select
          aria-label="Kalem türü"
          value={kind}
          onChange={(e) => {
            setPage(1);
            setKind(e.target.value);
          }}
        >
          <option value="ALL">Tüm türler</option>
          {Object.entries(kindLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Kalem durumu"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="ARCHIVED">Pasif</option>
          <option value="ALL">Tümü</option>
        </select>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Katalog yükleniyor…</PanelState>
      )}
      {state === "error" && <PanelState kind="error">{error}</PanelState>}
      {state === "idle" && !items.length && (
        <PanelState kind="empty">Katalog kalemi bulunmuyor.</PanelState>
      )}
      {state === "idle" && error && <div className="auth-error">{error}</div>}
      {items.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Tür</th>
                <th>Liste fiyatı</th>
                <th>KDV</th>
                <th>Stok</th>
                <th>Durum</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sku} · {item.category} · {item.unit}
                    </small>
                  </td>
                  <td>{kindLabels[item.kind]}</td>
                  <td>{formatMinor(item.listPriceMinor)}</td>
                  <td>{formatVatRate(item.vatRateBps)}</td>
                  <td>
                    {item.trackInventory
                      ? `Takip ediliyor · kritik ${item.reorderPoint}`
                      : "Takip edilmiyor"}
                  </td>
                  <td>
                    <StatusBadge tone={item.active ? "neutral" : "warning"}>
                      {item.active ? "Aktif" : "Pasif"}
                    </StatusBadge>
                  </td>
                  {canManage && (
                    <td>
                      <button
                        className="row-action"
                        onClick={() => {
                          setEditing(item);
                          setError("");
                          setForm(true);
                        }}
                      >
                        <Edit3 size={14} /> Düzenle
                      </button>
                      <button
                        className={item.active ? "danger-ghost" : "row-action"}
                        onClick={() => void toggleActive(item)}
                      >
                        {item.active ? (
                          "Pasife al"
                        ) : (
                          <>
                            <RotateCcw size={14} /> Geri al
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
          <ChevronLeft size={14} /> Önceki
        </button>
        <span>
          {page}/{pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((v) => v + 1)}>
          Sonraki <ChevronRight size={14} />
        </button>
      </div>
      {form && (
        <div
          className="dialog-backdrop"
          onMouseDown={() => {
            setForm(false);
            setEditing(null);
          }}
        >
          <section
            className="entity-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="popover-title">
              <strong>
                {editing ? "Katalog kalemini düzenle" : "Yeni katalog kalemi"}
              </strong>
              <button
                onClick={() => {
                  setForm(false);
                  setEditing(null);
                }}
              >
                <X />
              </button>
            </div>
            <form
              className="entity-form"
              onSubmit={save}
              key={editing ? `edit-${editing.id}` : "create"}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>SKU</span>
                  <input
                    name="sku"
                    required
                    maxLength={60}
                    defaultValue={editing?.sku}
                  />
                </label>
                <label className="form-field">
                  <span>Ad</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    defaultValue={editing?.name}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Tür</span>
                  <select name="kind" defaultValue={editing?.kind ?? "PRODUCT"}>
                    {Object.entries(kindLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Kategori</span>
                  <input
                    name="category"
                    required
                    minLength={2}
                    defaultValue={editing?.category}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Liste fiyatı (TL)</span>
                  <input
                    name="listPrice"
                    required
                    inputMode="decimal"
                    placeholder="1.234,56"
                    defaultValue={
                      editing ? minorToInput(editing.listPriceMinor) : ""
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Maliyet (TL)</span>
                  <input
                    name="costPrice"
                    inputMode="decimal"
                    placeholder="0,00"
                    defaultValue={
                      editing ? minorToInput(editing.costPriceMinor) : ""
                    }
                  />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>KDV oranı</span>
                  <select
                    name="vatRateBps"
                    defaultValue={String(editing?.vatRateBps ?? 2000)}
                  >
                    {VAT_RATE_OPTIONS.map((option) => (
                      <option key={option.bps} value={option.bps}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Birim</span>
                  <input
                    name="unit"
                    maxLength={20}
                    defaultValue={editing?.unit ?? "adet"}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Kritik stok seviyesi</span>
                  <input
                    name="reorderPoint"
                    type="number"
                    min="0"
                    defaultValue={editing?.reorderPoint ?? 0}
                  />
                </label>
                <div className="form-field">
                  <span>Seçenekler</span>
                  <span className="checkbox-row">
                    <label>
                      <input
                        type="checkbox"
                        name="trackInventory"
                        defaultChecked={editing?.trackInventory ?? true}
                      />
                      Stok takibi
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="serialized"
                        defaultChecked={editing?.serialized ?? false}
                      />
                      Seri numaralı
                    </label>
                  </span>
                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setForm(false);
                    setEditing(null);
                  }}
                >
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
