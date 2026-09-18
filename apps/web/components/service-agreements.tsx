"use client";

import { CalendarClock, ChevronDown, ChevronUp, Edit3, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PanelState, StatusBadge } from "./design-system";
import {
  describeGeneration,
  type GenerationPeriodResult,
  type GenerationStatus,
} from "./service-agreements.helpers";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface ServiceAgreementSummary {
  id: string;
  assetId: string | null;
  title: string;
  category: string;
  priority: Priority;
  problemDescription: string | null;
  estimatedDurationMinutes: number | null;
  recurrenceIntervalMonths: number;
  anchorDate: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
  version: number;
  nextOccurrence: string | null;
  asset: { id: string; name: string } | null;
}
interface GenerationRunItem {
  id: string;
  periodKey: string;
  status: GenerationStatus;
  failureReason: string | null;
  createdAt: string;
  job: { id: string; jobNumber: string; title: string } | null;
}
interface ServiceAgreementDetail extends ServiceAgreementSummary {
  generationRuns: GenerationRunItem[];
}
interface AssetOption {
  id: string;
  name: string;
}

const priorityLabels: Record<Priority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};
const runStatusLabels: Record<GenerationStatus, string> = {
  GENERATED: "Üretildi",
  SKIPPED: "Atlandı",
  FAILED: "Başarısız",
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => null)) as
    | { message?: string; fields?: Array<{ message: string }> }
    | T;
  if (!response.ok) {
    const failure = data as {
      message?: string;
      fields?: Array<{ message: string }>;
    };
    throw new Error(
      failure.fields?.[0]?.message ??
        failure.message ??
        "İşlem tamamlanamadı",
    );
  }
  return data as T;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("tr-TR") : "—";
}

export function ServiceAgreementsSection({
  organizationId,
  customerId,
  assets,
  permissions,
}: {
  organizationId: string;
  customerId: string;
  assets: AssetOption[];
  permissions: string[];
}) {
  const [items, setItems] = useState<ServiceAgreementSummary[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ServiceAgreementSummary | "new" | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Record<string, GenerationRunItem[] | "loading" | "error">
  >({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<
    Record<string, string>
  >({});

  const canManage = permissions.includes("service-agreement.manage");
  const canGenerate = permissions.includes("service-agreement.generate");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const data = await json<{ items: ServiceAgreementSummary[] }>(
        `/api/v1/organizations/${organizationId}/service-agreements?customerId=${customerId}&active=ALL&pageSize=50`,
      );
      setItems(data.items);
      setState("idle");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Servis sözleşmeleri alınamadı",
      );
      setState("error");
    }
  }, [customerId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadHistory = useCallback(
    async (id: string) => {
      setHistory((current) => ({ ...current, [id]: "loading" }));
      try {
        const detail = await json<ServiceAgreementDetail>(
          `/api/v1/organizations/${organizationId}/service-agreements/${id}`,
        );
        setHistory((current) => ({
          ...current,
          [id]: detail.generationRuns,
        }));
      } catch {
        setHistory((current) => ({ ...current, [id]: "error" }));
      }
    },
    [organizationId],
  );

  function toggleHistory(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!history[id] || history[id] === "error") void loadHistory(id);
  }

  async function generateNow(id: string) {
    setGeneratingId(id);
    setGenerateMessage((current) => ({ ...current, [id]: "" }));
    try {
      const result = await json<{ periods: GenerationPeriodResult[] }>(
        `/api/v1/organizations/${organizationId}/service-agreements/${id}/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      setGenerateMessage((current) => ({
        ...current,
        [id]: describeGeneration(result.periods),
      }));
      if (expandedId === id) await loadHistory(id);
      await load();
    } catch (caught) {
      setGenerateMessage((current) => ({
        ...current,
        [id]: caught instanceof Error ? caught.message : "İş emri üretilemedi",
      }));
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <section
      className="content-card related-card"
      style={{ gridColumn: "1 / -1" }}
    >
      <div className="section-title">
        <h3>
          <CalendarClock />
          Servis Sözleşmeleri
        </h3>
        {canManage && (
          <button onClick={() => setForm("new")}>
            <Plus size={15} /> Yeni sözleşme
          </button>
        )}
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Sözleşmeler yükleniyor…</PanelState>
      )}
      {state === "error" && (
        <PanelState kind="error">
          {error} <button onClick={() => void load()}>Tekrar dene</button>
        </PanelState>
      )}
      {state === "idle" && items.length === 0 && (
        <PanelState kind="empty">Kayıtlı servis sözleşmesi yok.</PanelState>
      )}
      {state === "idle" && items.length > 0 && (
        <div className="service-agreement-list">
          {items.map((agreement) => (
            <article key={agreement.id} className="service-agreement-row">
              <div className="service-agreement-head">
                <div>
                  <strong>{agreement.title}</strong>
                  <small>
                    {agreement.category} ·{" "}
                    {priorityLabels[agreement.priority]}
                    {agreement.asset ? ` · ${agreement.asset.name}` : ""}
                  </small>
                </div>
                <StatusBadge tone={agreement.active ? "success" : "neutral"}>
                  {agreement.active ? "Aktif" : "Pasif"}
                </StatusBadge>
              </div>
              <div className="service-agreement-meta">
                <span>Her {agreement.recurrenceIntervalMonths} ayda bir</span>
                <span>
                  Sonraki dönem:{" "}
                  {agreement.active
                    ? formatDate(agreement.nextOccurrence)
                    : "Pasif"}
                </span>
              </div>
              <div className="service-agreement-actions">
                {canManage && (
                  <button onClick={() => setForm(agreement)}>
                    <Edit3 size={14} /> Düzenle
                  </button>
                )}
                {canGenerate && (
                  <button
                    className="primary"
                    disabled={
                      !agreement.active || generatingId === agreement.id
                    }
                    onClick={() => void generateNow(agreement.id)}
                  >
                    {generatingId === agreement.id
                      ? "Üretiliyor…"
                      : "Şimdi Üret"}
                  </button>
                )}
                <button onClick={() => toggleHistory(agreement.id)}>
                  Geçmiş{" "}
                  {expandedId === agreement.id ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              </div>
              {generateMessage[agreement.id] && (
                <p className="service-agreement-message">
                  {generateMessage[agreement.id]}
                </p>
              )}
              {expandedId === agreement.id && (
                <GenerationHistory entry={history[agreement.id]} />
              )}
            </article>
          ))}
        </div>
      )}
      {form && (
        <ServiceAgreementForm
          organizationId={organizationId}
          customerId={customerId}
          assets={assets}
          initial={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await load();
          }}
        />
      )}
    </section>
  );
}

function GenerationHistory({
  entry,
}: {
  entry: GenerationRunItem[] | "loading" | "error" | undefined;
}) {
  if (entry === "loading" || entry === undefined)
    return <PanelState kind="loading">Geçmiş yükleniyor…</PanelState>;
  if (entry === "error")
    return <PanelState kind="error">Geçmiş alınamadı.</PanelState>;
  if (entry.length === 0)
    return <PanelState kind="empty">Henüz üretim yapılmadı.</PanelState>;
  return (
    <div className="timeline generation-history">
      {entry.map((run) => (
        <article key={run.id}>
          <span />
          <div>
            <strong>
              {run.periodKey} · {runStatusLabels[run.status]}
            </strong>
            <small>
              {new Date(run.createdAt).toLocaleString("tr-TR")}
              {run.job ? ` · ${run.job.jobNumber} — ${run.job.title}` : ""}
            </small>
            {run.failureReason && <p>{run.failureReason}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

function ServiceAgreementForm({
  organizationId,
  customerId,
  assets,
  initial,
  onClose,
  onSaved,
}: {
  organizationId: string;
  customerId: string;
  assets: AssetOption[];
  initial?: ServiceAgreementSummary;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      customerId,
      assetId: data.get("assetId") || null,
      title: data.get("title"),
      category: data.get("category"),
      priority: data.get("priority"),
      problemDescription: data.get("problemDescription") || undefined,
      estimatedDurationMinutes: data.get("estimatedDurationMinutes")
        ? Number(data.get("estimatedDurationMinutes"))
        : null,
      recurrenceIntervalMonths: Number(data.get("recurrenceIntervalMonths")),
      anchorDate: new Date(String(data.get("anchorDate"))).toISOString(),
      startDate: new Date(String(data.get("startDate"))).toISOString(),
      endDate: data.get("endDate")
        ? new Date(String(data.get("endDate"))).toISOString()
        : null,
    };
    if (initial) {
      payload.active = data.get("active") === "on";
      payload.version = initial.version;
    }
    try {
      await json(
        `/api/v1/organizations/${organizationId}/service-agreements${initial ? `/${initial.id}` : ""}`,
        {
          method: initial ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Sözleşme kaydedilemedi",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="entity-modal"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Sözleşmeyi düzenle" : "Yeni servis sözleşmesi"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="popover-title">
          <strong>
            {initial ? "Sözleşmeyi düzenle" : "Yeni servis sözleşmesi"}
          </strong>
          <button onClick={onClose} aria-label="Pencereyi kapat">
            <X size={18} />
          </button>
        </div>
        <form className="entity-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Başlık</span>
              <input
                name="title"
                required
                minLength={2}
                defaultValue={initial?.title}
              />
            </label>
            <label className="form-field">
              <span>Kategori</span>
              <input
                name="category"
                required
                minLength={2}
                defaultValue={initial?.category}
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Öncelik</span>
              <select name="priority" defaultValue={initial?.priority ?? "NORMAL"}>
                <option value="LOW">Düşük</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Yüksek</option>
                <option value="URGENT">Acil</option>
              </select>
            </label>
            <label className="form-field">
              <span>Cihaz (opsiyonel)</span>
              <select name="assetId" defaultValue={initial?.assetId ?? ""}>
                <option value="">Cihaz seçilmedi</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field">
            <span>Sorun / kapsam açıklaması</span>
            <textarea
              name="problemDescription"
              rows={2}
              defaultValue={initial?.problemDescription ?? ""}
            />
          </label>
          <div className="form-grid">
            <label className="form-field">
              <span>Tahmini süre (dk)</span>
              <input
                name="estimatedDurationMinutes"
                type="number"
                min={1}
                max={10080}
                defaultValue={initial?.estimatedDurationMinutes ?? ""}
              />
            </label>
            <label className="form-field">
              <span>Tekrar aralığı (ay)</span>
              <input
                name="recurrenceIntervalMonths"
                type="number"
                min={1}
                max={24}
                required
                defaultValue={initial?.recurrenceIntervalMonths ?? 1}
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>İlk tekrar tarihi</span>
              <input
                name="anchorDate"
                type="datetime-local"
                required
                defaultValue={toLocalInput(initial?.anchorDate ?? null)}
              />
            </label>
            <label className="form-field">
              <span>Başlangıç tarihi</span>
              <input
                name="startDate"
                type="datetime-local"
                required
                defaultValue={toLocalInput(initial?.startDate ?? null)}
              />
            </label>
          </div>
          <label className="form-field">
            <span>Bitiş tarihi (opsiyonel)</span>
            <input
              name="endDate"
              type="datetime-local"
              defaultValue={toLocalInput(initial?.endDate ?? null)}
            />
          </label>
          {initial && (
            <div className="check-row">
              <label>
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={initial.active}
                />{" "}
                Aktif
              </label>
            </div>
          )}
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              İptal
            </button>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
