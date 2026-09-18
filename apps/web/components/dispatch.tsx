"use client";
import {
  ChevronRight,
  MapPin,
  Plus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PanelState, StatusBadge } from "./design-system";

type Skill = { id: string; key: string; name: string; category: string };
type Employee = {
  id: string;
  employeeNumber: string;
  title: string;
  phone: string | null;
  homeCity: string | null;
  homeDistrict: string | null;
  memberId: string;
  member: { id: string; user: { name: string; email: string } };
  skills: Array<{ skillId: string; level: number; skill: Skill }>;
};
type WorkScheduleEntry = {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
};
type TimeEntryItem = {
  id: string;
  kind: "WORK" | "TRAVEL" | "BREAK" | "ON_CALL";
  startsAt: string;
  endsAt: string | null;
  minutes: number;
  billable: boolean;
  note: string | null;
  job: { jobNumber: string; title: string } | null;
};
type EmployeeDetail = Employee & {
  serviceMode: "FIELD" | "WORKSHOP" | "REMOTE";
  workLatencyMinutes: number;
  overtimeMultiplierBps: number;
  active: boolean;
  createdAt: string;
  workSchedule: WorkScheduleEntry[];
  timeEntries: TimeEntryItem[];
};
const serviceModeLabels: Record<EmployeeDetail["serviceMode"], string> = {
  FIELD: "Saha",
  WORKSHOP: "Atölye",
  REMOTE: "Uzaktan",
};
const timeEntryKindLabels: Record<TimeEntryItem["kind"], string> = {
  WORK: "Çalışma",
  TRAVEL: "Seyahat",
  BREAK: "Mola",
  ON_CALL: "Nöbet",
};
const weekdayLabels = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];
type Member = { id: string; user: { name: string }; role: { name: string } };
type Job = {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  customer: { displayName: string };
};
type Candidate = {
  memberId: string;
  name: string;
  compositeScore: number;
  skillScore: number;
  distanceScore: number;
  availabilityScore: number;
  reason: string;
};

async function json<T>(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const data = (await r.json().catch(() => null)) as
    | { message?: string; fields?: Array<{ message: string }> }
    | T;
  if (!r.ok) {
    const e = data as { message?: string; fields?: Array<{ message: string }> };
    throw new Error(
      e.fields?.[0]?.message ?? e.message ?? "İşlem tamamlanamadı",
    );
  }
  return data as T;
}

export function Dispatch({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: string[];
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [error, setError] = useState("");
  const [form, setForm] = useState(false);
  const [skillForm, setSkillForm] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateState, setCandidateState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [assignBusy, setAssignBusy] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [detailState, setDetailState] = useState<
    "loading" | "idle" | "error"
  >("idle");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [emp, sk, mem, jb] = await Promise.all([
        json<Employee[]>(
          `/api/v1/organizations/${organizationId}/employees`,
        ),
        json<Skill[]>(
          `/api/v1/organizations/${organizationId}/employees/skills`,
        ),
        json<Member[]>(`/api/v1/organizations/${organizationId}/members`),
        json<{ items: Job[] }>(
          `/api/v1/organizations/${organizationId}/jobs?page=1&pageSize=50&status=ALL&search=`,
        ),
      ]);
      setEmployees(emp);
      setSkills(sk);
      setMembers(mem);
      setJobs(jb.items);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ekip verileri alınamadı");
      setState("error");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await json(`/api/v1/organizations/${organizationId}/employees`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId: d.get("memberId"),
          employeeNumber: d.get("employeeNumber"),
          title: d.get("title"),
          phone: d.get("phone") || undefined,
          homeCity: d.get("homeCity") || undefined,
          homeDistrict: d.get("homeDistrict") || undefined,
        }),
      });
      setForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Çalışan kaydedilemedi");
    }
  }

  async function createSkill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await json(
        `/api/v1/organizations/${organizationId}/employees/skills`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key: d.get("key"),
            name: d.get("name"),
            category: d.get("category"),
          }),
        },
      );
      setSkillForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beceri eklenemedi");
    }
  }

  async function addSkillToEmployee(employeeId: string, skillId: string, level: number) {
    if (!skillId) return;
    try {
      await json(
        `/api/v1/organizations/${organizationId}/employees/${employeeId}/skills`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ skillId, level }),
        },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beceri atanamadı");
    }
  }

  async function openDetail(employeeId: string) {
    setDetailId(employeeId);
    setDetailState("loading");
    try {
      const data = await json<EmployeeDetail>(
        `/api/v1/organizations/${organizationId}/employees/${employeeId}`,
      );
      setDetail(data);
      setDetailState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Çalışan detayı alınamadı");
      setDetailState("error");
    }
  }

  async function loadCandidates(jobId: string) {
    setSelectedJobId(jobId);
    if (!jobId) {
      setCandidates([]);
      return;
    }
    setCandidateState("loading");
    try {
      const data = await json<Candidate[]>(
        `/api/v1/organizations/${organizationId}/dispatch/jobs/${jobId}/candidates`,
      );
      setCandidates(data);
      setCandidateState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aday önerisi alınamadı");
      setCandidateState("error");
    }
  }

  async function assign(memberId: string) {
    if (!selectedJobId) return;
    setAssignBusy(memberId);
    try {
      await json(
        `/api/v1/organizations/${organizationId}/dispatch/jobs/${selectedJobId}/assign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ memberId }),
        },
      );
      await loadCandidates(selectedJobId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Atama yapılamadı");
    } finally {
      setAssignBusy("");
    }
  }

  return (
    <section className="content-card table-card">
      <div className="section-title customer-title">
        <div>
          <p className="eyebrow">DİSPATCH</p>
          <h2>Ekip ve Akıllı Atama</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {permissions.includes("employee.manage") && (
            <button onClick={() => setSkillForm(true)}>
              <Plus size={16} /> Beceri ekle
            </button>
          )}
          {permissions.includes("employee.manage") && (
            <button className="primary" onClick={() => setForm(true)}>
              <Plus size={16} /> Yeni çalışan
            </button>
          )}
        </div>
      </div>

      {error && <PanelState kind="error">{error}</PanelState>}
      {state === "loading" && (
        <PanelState kind="loading">Ekip verileri yükleniyor...</PanelState>
      )}

      {state === "idle" && (
        <>
          <div className="section-title">
            <h3>Saha ekibi</h3>
            <StatusBadge>{employees.length} çalışan</StatusBadge>
          </div>
          {employees.length === 0 && (
            <PanelState kind="empty">Henüz çalışan profili oluşturulmadı.</PanelState>
          )}
          {employees.length > 0 && (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Çalışan</th>
                    <th>Sicil no</th>
                    <th>Bölge</th>
                    <th>Beceriler</th>
                    <th>Beceri ata</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <strong>
                          <UserRound size={14} /> {emp.member.user.name}
                        </strong>
                        <small>{emp.title}</small>
                      </td>
                      <td>{emp.employeeNumber}</td>
                      <td>
                        <MapPin size={13} />{" "}
                        {[emp.homeDistrict, emp.homeCity].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td>
                        {emp.skills.length
                          ? emp.skills
                              .map((s) => `${s.skill.name} (${s.level})`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const skillId = e.target.value;
                            if (!skillId) return;
                            void addSkillToEmployee(emp.id, skillId, 3);
                            e.target.value = "";
                          }}
                        >
                          <option value="">Beceri seçin</option>
                          {skills.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="row-action"
                          onClick={() => void openDetail(emp.id)}
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

          <div className="section-title" style={{ marginTop: 24 }}>
            <div>
              <h3>
                <Sparkles size={16} /> Akıllı atama önerisi
              </h3>
            </div>
          </div>
          <label className="form-field">
            <span>İş emri seçin</span>
            <select
              value={selectedJobId}
              onChange={(e) => void loadCandidates(e.target.value)}
            >
              <option value="">Seçin</option>
              {jobs
                .filter((j) => !["COMPLETED", "CANCELLED", "PAID"].includes(j.status))
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobNumber} · {j.title} · {j.customer.displayName}
                  </option>
                ))}
            </select>
          </label>
          {candidateState === "loading" && (
            <PanelState kind="loading">Adaylar hesaplanıyor...</PanelState>
          )}
          {candidateState === "idle" && selectedJobId && candidates.length === 0 && (
            <PanelState kind="empty">Uygun aday bulunamadı.</PanelState>
          )}
          {candidates.length > 0 && (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Teknisyen</th>
                    <th>Toplam puan</th>
                    <th>Beceri</th>
                    <th>Mesafe</th>
                    <th>Müsaitlik</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.memberId}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>
                        <StatusBadge
                          tone={c.compositeScore >= 60 ? "success" : "warning"}
                        >
                          %{c.compositeScore}
                        </StatusBadge>
                      </td>
                      <td>%{c.skillScore}</td>
                      <td>%{c.distanceScore}</td>
                      <td>%{c.availabilityScore}</td>
                      <td>
                        {permissions.includes("dispatch.assign") && (
                          <button
                            className="row-action"
                            disabled={assignBusy === c.memberId}
                            onClick={() => void assign(c.memberId)}
                          >
                            Ata <ChevronRight size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {form && (
        <div className="dialog-backdrop" onMouseDown={() => setForm(false)}>
          <section className="entity-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="popover-title">
              <strong>Yeni çalışan</strong>
              <button onClick={() => setForm(false)}>
                <X />
              </button>
            </div>
            <form className="entity-form" onSubmit={createEmployee}>
              <label className="form-field">
                <span>Ekip üyesi</span>
                <select name="memberId" required>
                  <option value="">Seçin</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} · {m.role.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label className="form-field">
                  <span>Sicil no</span>
                  <input name="employeeNumber" required minLength={1} />
                </label>
                <label className="form-field">
                  <span>Unvan</span>
                  <input name="title" required minLength={2} />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Telefon</span>
                  <input name="phone" />
                </label>
                <label className="form-field">
                  <span>Şehir</span>
                  <input name="homeCity" />
                </label>
              </div>
              <label className="form-field">
                <span>İlçe</span>
                <input name="homeDistrict" />
              </label>
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

      {skillForm && (
        <div className="dialog-backdrop" onMouseDown={() => setSkillForm(false)}>
          <section className="entity-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="popover-title">
              <strong>Beceri kataloğuna ekle</strong>
              <button onClick={() => setSkillForm(false)}>
                <X />
              </button>
            </div>
            <form className="entity-form" onSubmit={createSkill}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Anahtar</span>
                  <input name="key" required minLength={1} placeholder="klima-montaj" />
                </label>
                <label className="form-field">
                  <span>Ad</span>
                  <input name="name" required minLength={2} placeholder="Klima Montajı" />
                </label>
              </div>
              <label className="form-field">
                <span>Kategori</span>
                <input name="category" required minLength={2} placeholder="HVAC" />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setSkillForm(false)}>
                  İptal
                </button>
                <button className="primary">Kaydet</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailId && (
        <div
          className="dialog-backdrop"
          onMouseDown={() => {
            setDetailId(null);
            setDetail(null);
          }}
        >
          <section
            className="entity-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="popover-title">
              <strong>Çalışan detayı</strong>
              <button
                onClick={() => {
                  setDetailId(null);
                  setDetail(null);
                }}
              >
                <X />
              </button>
            </div>
            {detailState === "loading" && (
              <PanelState kind="loading">Çalışan detayı yükleniyor…</PanelState>
            )}
            {detailState === "error" && (
              <PanelState kind="error">Çalışan detayı alınamadı.</PanelState>
            )}
            {detailState === "idle" && detail && (
              <div className="entity-form">
                <div className="section-title">
                  <div>
                    <strong>{detail.member.user.name}</strong>
                    <small>
                      {detail.title} · {detail.employeeNumber}
                    </small>
                  </div>
                  <StatusBadge tone={detail.active ? "success" : "neutral"}>
                    {detail.active ? "Aktif" : "Pasif"}
                  </StatusBadge>
                </div>
                <p>
                  {detail.member.user.email}
                  {detail.phone ? ` · ${detail.phone}` : ""}
                </p>
                <p>
                  {serviceModeLabels[detail.serviceMode]} ·{" "}
                  {[detail.homeDistrict, detail.homeCity]
                    .filter(Boolean)
                    .join(", ") || "Bölge belirtilmemiş"}{" "}
                  · Ulaşım süresi {detail.workLatencyMinutes} dk
                </p>

                <div className="section-title" style={{ marginTop: 16 }}>
                  <h3>Beceriler</h3>
                </div>
                {detail.skills.length ? (
                  <p>
                    {detail.skills
                      .map((s) => `${s.skill.name} (${s.level})`)
                      .join(", ")}
                  </p>
                ) : (
                  <PanelState kind="empty">Beceri atanmamış.</PanelState>
                )}

                <div className="section-title" style={{ marginTop: 16 }}>
                  <h3>Çalışma programı</h3>
                </div>
                {detail.workSchedule.length ? (
                  <ul>
                    {detail.workSchedule.map((entry) => (
                      <li key={entry.id}>
                        {weekdayLabels[entry.weekday] ?? entry.weekday}{" "}
                        {new Date(entry.startsAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(entry.endsAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PanelState kind="empty">
                    Çalışma programı tanımlanmamış.
                  </PanelState>
                )}

                <div className="section-title" style={{ marginTop: 16 }}>
                  <h3>Son zaman kayıtları</h3>
                </div>
                {detail.timeEntries.length ? (
                  <ul>
                    {detail.timeEntries.map((entry) => (
                      <li key={entry.id}>
                        {timeEntryKindLabels[entry.kind]} ·{" "}
                        {new Date(entry.startsAt).toLocaleString("tr-TR")}
                        {" · "}
                        {entry.minutes} dk
                        {entry.job
                          ? ` · ${entry.job.jobNumber} ${entry.job.title}`
                          : ""}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PanelState kind="empty">
                    Zaman kaydı bulunmuyor.
                  </PanelState>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
