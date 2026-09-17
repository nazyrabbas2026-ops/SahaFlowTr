"use client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PanelState, StatusBadge } from "./design-system";

type JobStatus =
  | "NEW"
  | "SCHEDULED"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "INVOICED"
  | "PAID"
  | "CANCELLED";
type Job = {
  id: string;
  jobNumber: string;
  title: string;
  category: string;
  status: JobStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  scheduledStart: string | null;
  version: number;
  customer: { id: string; displayName: string };
  assignments: Array<{ id: string; member: { user: { name: string } } }>;
  statusHistory?: Array<{
    id: string;
    fromStatus: JobStatus | null;
    toStatus: JobStatus;
    reason: string | null;
    createdAt: string;
    changedBy: { name: string };
  }>;
};
type Customer = { id: string; displayName: string; customerNumber: string };
type Member = { id: string; user: { name: string }; role: { name: string } };
const labels: Record<JobStatus, string> = {
  NEW: "Yeni",
  SCHEDULED: "Planlandı",
  ASSIGNED: "Atandı",
  EN_ROUTE: "Yolda",
  ARRIVED: "Vardı",
  IN_PROGRESS: "Çalışılıyor",
  ON_HOLD: "Beklemede",
  COMPLETED: "Tamamlandı",
  INVOICED: "Faturalandı",
  PAID: "Ödendi",
  CANCELLED: "İptal",
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
export function Jobs({
  organizationId,
  permissions,
  onChanged,
}: {
  organizationId: string;
  permissions: string[];
  onChanged: () => void;
}) {
  const [items, setItems] = useState<Job[]>([]),
    [detail, setDetail] = useState<Job | null>(null),
    [state, setState] = useState<"loading" | "idle" | "error">("loading"),
    [error, setError] = useState(""),
    [form, setForm] = useState(false),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [customers, setCustomers] = useState<Customer[]>([]),
    [members, setMembers] = useState<Member[]>([]);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const p = new URLSearchParams({
        search,
        status,
        page: String(page),
        pageSize: "10",
      });
      const d = await json<{ items: Job[]; pagination: { pages: number } }>(
        `/api/v1/organizations/${organizationId}/jobs?${p}`,
      );
      setItems(d.items);
      setPages(d.pagination.pages);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "İş emirleri alınamadı");
      setState("error");
    }
  }, [organizationId, page, search, status]);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(id: string) {
    setState("loading");
    try {
      const [job, team] = await Promise.all([
        json<Job>(`/api/v1/organizations/${organizationId}/jobs/${id}`),
        members.length
          ? Promise.resolve(members)
          : json<Member[]>(`/api/v1/organizations/${organizationId}/members`),
      ]);
      setMembers(team);
      setDetail(job);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "İş emri alınamadı");
      setState("error");
    }
  }
  async function prepare() {
    const [c, m] = await Promise.all([
      json<{ items: Customer[] }>(
        `/api/v1/organizations/${organizationId}/customers?page=1&pageSize=100&status=ACTIVE&type=ALL&search=`,
      ),
      json<Member[]>(`/api/v1/organizations/${organizationId}/members`),
    ]);
    setCustomers(c.items);
    setMembers(m);
    setForm(true);
  }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      const job = await json<Job>(
        `/api/v1/organizations/${organizationId}/jobs`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            customerId: d.get("customerId"),
            title: d.get("title"),
            category: d.get("category"),
            priority: d.get("priority"),
            scheduledStart: d.get("scheduledStart")
              ? new Date(String(d.get("scheduledStart"))).toISOString()
              : null,
            estimatedDurationMinutes: d.get("duration")
              ? Number(d.get("duration"))
              : null,
            problemDescription: d.get("description") || null,
            tags: [],
          }),
        },
      );
      setForm(false);
      await load();
      await open(job.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İş emri kaydedilemedi");
    }
  }
  async function transition(action: string, reason?: string) {
    if (!detail) return;
    try {
      await json(
        `/api/v1/organizations/${organizationId}/jobs/${detail.id}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      await open(detail.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum değiştirilemedi");
    }
  }
  async function assign(memberId: string) {
    if (!detail || !memberId) return;
    await json(
      `/api/v1/organizations/${organizationId}/jobs/${detail.id}/assign`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, primary: true }),
      },
    );
    await open(detail.id);
    await load();
  }
  if (detail)
    return (
      <section className="customer-detail-view">
        <button className="back-button" onClick={() => setDetail(null)}>
          <ArrowLeft size={16} /> İş emirlerine dön
        </button>
        <div className="content-card customer-detail-head">
          <div className="customer-identity">
            <span>
              <ClipboardList />
            </span>
            <div>
              <small>{detail.jobNumber}</small>
              <h2>{detail.title}</h2>
              <StatusBadge>{labels[detail.status]}</StatusBadge>
            </div>
          </div>
          <StatusBadge
            tone={detail.priority === "URGENT" ? "warning" : "neutral"}
          >
            {detail.priority}
          </StatusBadge>
        </div>
        <div className="job-detail-grid">
          <section className="content-card related-card">
            <div className="section-title">
              <h3>İş emri akışı</h3>
            </div>
            <p className="job-customer">
              {detail.customer.displayName} · {detail.category}
            </p>
            <div className="job-actions">
              {detail.status === "NEW" && (
                <button onClick={() => void transition("schedule")}>
                  Planla
                </button>
              )}
              {["ASSIGNED"].includes(detail.status) && (
                <button onClick={() => void transition("en-route")}>
                  Yola çıktı
                </button>
              )}
              {detail.status === "EN_ROUTE" && (
                <button onClick={() => void transition("arrive")}>Vardı</button>
              )}
              {["ARRIVED", "ON_HOLD"].includes(detail.status) && (
                <button onClick={() => void transition("start")}>
                  İşi başlat
                </button>
              )}
              {detail.status === "IN_PROGRESS" && (
                <>
                  <button
                    onClick={() => {
                      const r = prompt("Bekletme nedeni");
                      if (r) void transition("hold", r);
                    }}
                  >
                    Beklet
                  </button>
                  {permissions.includes("job.complete") && (
                    <button
                      className="primary"
                      onClick={() => void transition("complete")}
                    >
                      Tamamla
                    </button>
                  )}
                </>
              )}
              {!["COMPLETED", "CANCELLED", "PAID"].includes(detail.status) &&
                permissions.includes("job.cancel") && (
                  <button
                    className="danger-ghost"
                    onClick={() => {
                      const r = prompt("İptal nedeni");
                      if (r) void transition("cancel", r);
                    }}
                  >
                    İptal
                  </button>
                )}
            </div>
            {permissions.includes("job.assign") && (
              <label className="form-field">
                <span>Teknisyen ata</span>
                <select
                  defaultValue=""
                  onChange={(e) => void assign(e.target.value)}
                >
                  <option value="">Seçin</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} · {m.role.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p>
              Atanan:{" "}
              {detail.assignments.map((a) => a.member.user.name).join(", ") ||
                "Henüz atanmadı"}
            </p>
          </section>
          <section className="content-card related-card">
            <div className="section-title">
              <h3>Durum geçmişi</h3>
            </div>
            <div className="timeline">
              {detail.statusHistory?.map((h) => (
                <article key={h.id}>
                  <span />
                  <div>
                    <strong>{labels[h.toStatus]}</strong>
                    <small>
                      {h.changedBy.name} ·{" "}
                      {new Date(h.createdAt).toLocaleString("tr-TR")}
                    </small>
                    {h.reason && <p>{h.reason}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        {error && <PanelState kind="error">{error}</PanelState>}
      </section>
    );
  return (
    <section className="content-card customer-list-card">
      <div className="section-title customer-title">
        <div>
          <p className="eyebrow">OPERASYON</p>
          <h2>İş Emirleri</h2>
        </div>
        {permissions.includes("job.create") && (
          <button className="primary" onClick={() => void prepare()}>
            <Plus size={16} /> Yeni iş emri
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
            aria-label="İş emri ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="No, başlık, kategori veya müşteri…"
          />
          <button>Ara</button>
        </form>
        <select
          aria-label="İş durumu"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="ALL">Tüm durumlar</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">İş emirleri yükleniyor…</PanelState>
      )}
      {state === "error" && <PanelState kind="error">{error}</PanelState>}
      {state === "idle" && !items.length && (
        <PanelState kind="empty">İş emri bulunmuyor.</PanelState>
      )}
      {items.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>İş emri</th>
                <th>Müşteri</th>
                <th>Plan</th>
                <th>Teknisyen</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id}>
                  <td>
                    <strong>{j.title}</strong>
                    <small>
                      {j.jobNumber} · {j.category}
                    </small>
                  </td>
                  <td>{j.customer.displayName}</td>
                  <td>
                    {j.scheduledStart
                      ? new Date(j.scheduledStart).toLocaleString("tr-TR")
                      : "—"}
                  </td>
                  <td>{j.assignments[0]?.member.user.name ?? "Atanmadı"}</td>
                  <td>
                    <StatusBadge>{labels[j.status]}</StatusBadge>
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={() => void open(j.id)}
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
              <strong>Yeni iş emri</strong>
              <button onClick={() => setForm(false)}>
                <X />
              </button>
            </div>
            <form className="entity-form" onSubmit={create}>
              <label className="form-field">
                <span>Müşteri</span>
                <select name="customerId" required>
                  <option value="">Seçin</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} · {c.customerNumber}
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
                  <span>Kategori</span>
                  <input name="category" required minLength={2} />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Öncelik</span>
                  <select name="priority">
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Yüksek</option>
                    <option value="URGENT">Acil</option>
                    <option value="LOW">Düşük</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Tahmini süre (dk)</span>
                  <input name="duration" type="number" min="1" />
                </label>
              </div>
              <label className="form-field">
                <span>Planlanan başlangıç</span>
                <input name="scheduledStart" type="datetime-local" />
              </label>
              <label className="form-field">
                <span>Sorun açıklaması</span>
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
