"use client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatMinor, minorToInput, VAT_RATE_OPTIONS } from "./catalog.helpers";
import { PanelState, StatusBadge } from "./design-system";
import {
  defaultValidUntil,
  describeLineProblem,
  QUOTE_STATUS_LABELS,
  toLinePayload,
  type DraftLine,
  type QuoteStatus,
} from "./quotes.helpers";
import { TIER_LABELS, type PackageTier } from "./service-packages.helpers";

type QuoteOption = {
  id: string;
  tier: PackageTier;
  name: string;
  description: string | null;
  packageId: string | null;
  subtotalMinor: string;
  vatMinor: string;
  totalMinor: string;
};
type QuoteLine = {
  id: string;
  optionId: string | null;
  name: string;
  unit: string;
  quantity: string;
  unitPriceMinor: string;
  discountBps: number;
  vatRateBps: number;
  lineTotalMinor: string;
  vatMinor: string;
};
type Quote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  title: string;
  description: string | null;
  terms: string | null;
  validUntil: string;
  selectedOptionId: string | null;
  subtotalMinor: string;
  discountMinor: string;
  vatMinor: string;
  totalMinor: string;
  version: number;
  customer: { id: string; displayName: string; customerNumber: string };
  options: QuoteOption[];
  lines: QuoteLine[];
};
type Customer = { id: string; displayName: string; customerNumber: string };
type PackageOption = {
  id: string;
  name: string;
  tier: PackageTier | null;
  familyId: string | null;
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

export function Quotes({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: string[];
}) {
  const [items, setItems] = useState<Quote[]>([]),
    [detail, setDetail] = useState<Quote | null>(null),
    [customers, setCustomers] = useState<Customer[]>([]),
    [packages, setPackages] = useState<PackageOption[]>([]),
    [state, setState] = useState<"loading" | "idle" | "error">("loading"),
    [error, setError] = useState(""),
    [form, setForm] = useState(false),
    [draft, setDraft] = useState<DraftLine[] | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  const canManage = permissions.includes("quote.manage");
  const base = `/api/v1/organizations/${organizationId}/quotes`;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const query = new URLSearchParams({
        search,
        status,
        page: String(page),
        pageSize: "10",
      });
      const data = await json<{
        items: Quote[];
        pagination: { pages: number };
      }>(`${base}?${query}`);
      setItems(data.items);
      setPages(data.pagination.pages);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Teklifler alınamadı");
      setState("error");
    }
  }, [base, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openForm() {
    setError("");
    try {
      const [customerList, packageList] = await Promise.all([
        json<{ items: Customer[] }>(
          `/api/v1/organizations/${organizationId}/customers?pageSize=100`,
        ),
        json<{ items: PackageOption[] }>(
          `/api/v1/organizations/${organizationId}/service-packages?pageSize=100`,
        ),
      ]);
      setCustomers(customerList.items);
      setPackages(packageList.items);
      setForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Form açılamadı");
    }
  }

  async function open(quoteId: string) {
    setError("");
    try {
      const quote = await json<Quote>(`${base}/${quoteId}`);
      setDetail(quote);
      setDraft(null);
      if (!packages.length) {
        const packageList = await json<{ items: PackageOption[] }>(
          `/api/v1/organizations/${organizationId}/service-packages?pageSize=100`,
        );
        setPackages(packageList.items);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Teklif açılamadı");
    }
  }

  async function createQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      const created = await json<Quote>(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: String(data.get("customerId") ?? ""),
          title: String(data.get("title") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
          validUntil: String(data.get("validUntil") ?? ""),
        }),
      });
      setForm(false);
      await load();
      await open(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Teklif oluşturulamadı");
    }
  }

  function startEditing(quote: Quote) {
    setDraft(
      quote.lines.map((line) => ({
        optionId: line.optionId,
        name: line.name,
        quantity: String(Number(line.quantity)),
        unitPrice: minorToInput(line.unitPriceMinor),
        vatRateBps: line.vatRateBps,
        discountBps: line.discountBps,
      })),
    );
  }

  async function saveLines() {
    if (!detail || !draft) return;
    setError("");
    const problem = draft.map(describeLineProblem).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const quote = await json<Quote>(`${base}/${detail.id}/lines`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: detail.version,
          lines: draft.map(toLinePayload),
        }),
      });
      setDetail(quote);
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Satırlar kaydedilemedi");
    }
  }

  async function addOptionFromPackage(tier: PackageTier, packageId: string) {
    if (!detail) return;
    setError("");
    try {
      const kept = detail.options
        .filter((option) => option.tier !== tier)
        .map((option) => ({
          tier: option.tier,
          name: option.name,
          packageId: option.packageId,
        }));
      const chosen = packages.find((item) => item.id === packageId);
      const quote = await json<Quote>(`${base}/${detail.id}/options`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: detail.version,
          options: [
            ...kept,
            { tier, name: chosen?.name ?? TIER_LABELS[tier], packageId },
          ],
        }),
      });
      setDetail(quote);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seçenek eklenemedi");
    }
  }

  async function selectOption(optionId: string | null) {
    if (!detail) return;
    setError("");
    try {
      const quote = await json<Quote>(`${base}/${detail.id}/select-option`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: detail.version, optionId }),
      });
      setDetail(quote);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seçenek belirlenemedi");
    }
  }

  if (detail) {
    const editable = canManage && detail.status === "DRAFT";
    const lines = draft;
    return (
      <section className="customer-detail-view">
        <button
          className="back-button"
          onClick={() => {
            setDetail(null);
            setDraft(null);
          }}
        >
          <ArrowLeft size={16} /> Tekliflere dön
        </button>
        <div className="content-card customer-detail-head">
          <div className="customer-identity">
            <span>
              <FileText />
            </span>
            <div>
              <small>{detail.quoteNumber}</small>
              <h2>{detail.title}</h2>
              <StatusBadge>{QUOTE_STATUS_LABELS[detail.status]}</StatusBadge>
            </div>
          </div>
          <div className="detail-actions">
            <div className="quote-total">
              <small>Teklif toplamı</small>
              <strong>{formatMinor(detail.totalMinor)}</strong>
              <small>KDV {formatMinor(detail.vatMinor)}</small>
            </div>
          </div>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <div className="content-card">
          <div className="section-title">
            <h3>Seçenekler</h3>
          </div>
          {!detail.options.length && (
            <PanelState kind="empty">
              Seçenek eklenmedi. Bir pakete bağlı seçenek eklendiğinde satırları
              o anki katalog fiyatıyla dondurulur.
            </PanelState>
          )}
          <div className="package-tier-grid">
            {(["ECONOMY", "RECOMMENDED", "PREMIUM"] as PackageTier[]).map(
              (tier) => {
                const option = detail.options.find(
                  (item) => item.tier === tier,
                );
                return (
                  <section className="content-card related-card" key={tier}>
                    <div className="section-title">
                      <h3>{TIER_LABELS[tier]}</h3>
                      {option && detail.selectedOptionId === option.id && (
                        <StatusBadge>Seçili</StatusBadge>
                      )}
                    </div>
                    {option ? (
                      <>
                        <p className="package-price">
                          <strong>{formatMinor(option.totalMinor)}</strong>
                          <small>KDV {formatMinor(option.vatMinor)}</small>
                        </p>
                        <p>{option.name}</p>
                        {editable && (
                          <div className="job-actions">
                            <button
                              onClick={() =>
                                void selectOption(
                                  detail.selectedOptionId === option.id
                                    ? null
                                    : option.id,
                                )
                              }
                            >
                              {detail.selectedOptionId === option.id
                                ? "Seçimi kaldır"
                                : "Bu seçeneği seç"}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <PanelState kind="empty">Tanımlı değil.</PanelState>
                    )}
                    {editable && (
                      <label className="form-field">
                        <span>Paketten üret</span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value)
                              void addOptionFromPackage(tier, e.target.value);
                          }}
                        >
                          <option value="">Paket seçin</option>
                          {packages.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </section>
                );
              },
            )}
          </div>
        </div>
        <div className="content-card">
          <div className="section-title">
            <h3>Satırlar</h3>
            {editable && !lines && (
              <button onClick={() => startEditing(detail)}>Düzenle</button>
            )}
            {editable && lines && (
              <button className="primary" onClick={() => void saveLines()}>
                <Save size={16} /> Kaydet
              </button>
            )}
          </div>
          {!lines && !detail.lines.length && (
            <PanelState kind="empty">Satır eklenmedi.</PanelState>
          )}
          {!lines && detail.lines.length > 0 && (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Satır</th>
                    <th>Kapsam</th>
                    <th>Miktar</th>
                    <th>Birim fiyat</th>
                    <th>KDV</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.name}</strong>
                      </td>
                      <td>
                        {line.optionId
                          ? (detail.options.find(
                              (option) => option.id === line.optionId,
                            )?.name ?? "Seçenek")
                          : "Tüm seçeneklerde"}
                      </td>
                      <td>
                        {Number(line.quantity)} {line.unit}
                      </td>
                      <td>{formatMinor(line.unitPriceMinor)}</td>
                      <td>%{line.vatRateBps / 100}</td>
                      <td>{formatMinor(line.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {lines && (
            <div className="entity-form">
              {lines.map((line, index) => (
                <div className="form-grid" key={index}>
                  <label className="form-field">
                    <span>Satır adı</span>
                    <input
                      value={line.name}
                      onChange={(e) =>
                        setDraft(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, name: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Kapsam</span>
                    <select
                      value={line.optionId ?? ""}
                      onChange={(e) =>
                        setDraft(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, optionId: e.target.value || null }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Tüm seçeneklerde</option>
                      {detail.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Miktar</span>
                    <input
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        setDraft(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, quantity: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Birim fiyat (TL)</span>
                    <input
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(e) =>
                        setDraft(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, unitPrice: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>KDV</span>
                    <select
                      value={String(line.vatRateBps)}
                      onChange={(e) =>
                        setDraft(
                          lines.map((item, i) =>
                            i === index
                              ? { ...item, vatRateBps: Number(e.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      {VAT_RATE_OPTIONS.map((option) => (
                        <option key={option.bps} value={option.bps}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-field">
                    <span>İşlem</span>
                    <button
                      type="button"
                      className="danger-ghost"
                      onClick={() =>
                        setDraft(lines.filter((_, i) => i !== index))
                      }
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDraft([
                    ...lines,
                    {
                      optionId: null,
                      name: "",
                      quantity: "1",
                      unitPrice: "0,00",
                      vatRateBps: 2000,
                      discountBps: 0,
                    },
                  ])
                }
              >
                <Plus size={14} /> Satır ekle
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="content-card">
      <div className="section-title">
        <h3>
          <FileText size={18} /> Teklifler
        </h3>
        {canManage && (
          <button className="primary" onClick={() => void openForm()}>
            <Plus size={16} /> Yeni teklif
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
            aria-label="Teklif ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Teklif no, başlık veya müşteri…"
          />
          <button>Ara</button>
        </form>
        <select
          aria-label="Teklif durumu"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="ALL">Tüm durumlar</option>
          {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Teklifler yükleniyor…</PanelState>
      )}
      {state === "error" && <PanelState kind="error">{error}</PanelState>}
      {state === "idle" && !items.length && (
        <PanelState kind="empty">Teklif bulunmuyor.</PanelState>
      )}
      {state === "idle" && error && <div className="auth-error">{error}</div>}
      {items.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Teklif</th>
                <th>Müşteri</th>
                <th>Geçerlilik</th>
                <th>Toplam</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <strong>{quote.title}</strong>
                    <small>{quote.quoteNumber}</small>
                  </td>
                  <td>{quote.customer.displayName}</td>
                  <td>
                    {new Date(quote.validUntil).toLocaleDateString("tr-TR")}
                  </td>
                  <td>{formatMinor(quote.totalMinor)}</td>
                  <td>
                    <StatusBadge>
                      {QUOTE_STATUS_LABELS[quote.status]}
                    </StatusBadge>
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={() => void open(quote.id)}
                    >
                      Detay <ChevronRight size={14} />
                    </button>
                  </td>
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
        <div className="dialog-backdrop" onMouseDown={() => setForm(false)}>
          <section
            className="entity-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="popover-title">
              <strong>Yeni teklif</strong>
              <button onClick={() => setForm(false)}>
                <X />
              </button>
            </div>
            <form className="entity-form" onSubmit={createQuote}>
              <label className="form-field">
                <span>Müşteri</span>
                <select name="customerId" required defaultValue="">
                  <option value="">Seçin</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.displayName} · {customer.customerNumber}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label className="form-field">
                  <span>Başlık</span>
                  <input name="title" required minLength={2} />
                </label>
                <label className="form-field">
                  <span>Geçerlilik tarihi</span>
                  <input
                    name="validUntil"
                    type="date"
                    required
                    defaultValue={defaultValidUntil()}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>Açıklama</span>
                <textarea name="description" rows={3} />
              </label>
              {error && <div className="auth-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setForm(false)}>
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
