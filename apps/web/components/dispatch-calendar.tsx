"use client";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  UNASSIGNED,
  addDays,
  addMonths,
  cellKey,
  computeRescheduledRange,
  getMonthGrid,
  resolveDropChanges,
  startOfWeek,
  toDateKey,
} from "./dispatch-calendar.helpers";
import { PanelState, StatusBadge } from "./design-system";

type Employee = {
  id: string;
  memberId: string;
  title: string;
  member: { id: string; user: { name: string } };
};
type CalendarJob = {
  id: string;
  jobNumber: string;
  title: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  scheduledStart: string | null;
  estimatedDurationMinutes: number | null;
  version: number;
  customer: { displayName: string };
  assignments: Array<{ memberId: string; primary: boolean }>;
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

const dayLabels = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export function DispatchCalendar({
  organizationId,
  permissions,
}: {
  organizationId: string;
  permissions: string[];
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [error, setError] = useState("");

  const canDrag =
    permissions.includes("job.assign") && permissions.includes("job.update");

  const days = useMemo(
    () =>
      view === "month"
        ? getMonthGrid(anchor)
        : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)),
    [view, anchor],
  );

  const load = useCallback(async () => {
    setState("loading");
    try {
      const from = days[0]!.toISOString();
      const to = addDays(days[days.length - 1]!, 1).toISOString();
      const [emp, jobsResponse] = await Promise.all([
        json<Employee[]>(`/api/v1/organizations/${organizationId}/employees`),
        json<{ items: CalendarJob[] }>(
          `/api/v1/organizations/${organizationId}/jobs?page=1&pageSize=100&status=ALL&search=&scheduledFrom=${encodeURIComponent(from)}&scheduledTo=${encodeURIComponent(to)}`,
        ),
      ]);
      setEmployees(emp);
      setJobs(jobsResponse.items);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Takvim verileri alınamadı");
      setState("error");
    }
  }, [organizationId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const jobsByCell = useMemo(() => {
    const map = new Map<string, CalendarJob[]>();
    for (const job of jobs) {
      if (!job.scheduledStart) continue;
      const primary = job.assignments.find((a) => a.primary);
      const memberId = primary?.memberId ?? UNASSIGNED;
      const dayKey = toDateKey(new Date(job.scheduledStart));
      const key = cellKey(memberId, dayKey);
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    for (const list of map.values())
      list.sort((a, b) =>
        (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""),
      );
    return map;
  }, [jobs]);

  const hasUnassigned = useMemo(
    () =>
      jobs.some(
        (j) => j.scheduledStart && !j.assignments.some((a) => a.primary),
      ),
    [jobs],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const job = jobs.find((j) => j.id === active.id);
    if (!job || !job.scheduledStart) return;
    const changes = resolveDropChanges(
      { scheduledStart: job.scheduledStart, assignments: job.assignments },
      String(over.id),
    );
    if (!changes.memberId && !changes.dayKey) return;
    try {
      if (changes.memberId)
        await json(
          `/api/v1/organizations/${organizationId}/jobs/${job.id}/assign`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ memberId: changes.memberId, primary: true }),
          },
        );
      if (changes.dayKey) {
        const range = computeRescheduledRange(
          job.scheduledStart,
          changes.dayKey,
          job.estimatedDurationMinutes,
        );
        await json(
          `/api/v1/organizations/${organizationId}/jobs/${job.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...range, version: job.version }),
          },
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Değişiklik kaydedilemedi");
    } finally {
      await load();
    }
  }

  function goPrevious() {
    setAnchor((d) => (view === "month" ? addMonths(d, -1) : addDays(d, -7)));
  }
  function goNext() {
    setAnchor((d) => (view === "month" ? addMonths(d, 1) : addDays(d, 7)));
  }

  return (
    <section className="content-card table-card week-calendar-card">
      <div className="section-title customer-title">
        <div>
          <p className="eyebrow">DİSPATCH</p>
          <h2>{view === "month" ? "Aylık Takvim" : "Haftalık Takvim"}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className={view === "week" ? "primary" : "row-action"}
            onClick={() => setView("week")}
          >
            Hafta
          </button>
          <button
            className={view === "month" ? "primary" : "row-action"}
            onClick={() => setView("month")}
          >
            Ay
          </button>
          <button className="row-action" onClick={goPrevious}>
            <ChevronLeft size={14} />{" "}
            {view === "month" ? "Önceki ay" : "Önceki hafta"}
          </button>
          <StatusBadge>
            {view === "month"
              ? anchor.toLocaleDateString("tr-TR", {
                  month: "long",
                  year: "numeric",
                })
              : `${days[0]!.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} – ${days[6]!.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`}
          </StatusBadge>
          <button className="row-action" onClick={goNext}>
            {view === "month" ? "Sonraki ay" : "Sonraki hafta"}{" "}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {error && <PanelState kind="error">{error}</PanelState>}
      {state === "loading" && (
        <PanelState kind="loading">Takvim yükleniyor…</PanelState>
      )}
      {state === "idle" && employees.length === 0 && (
        <PanelState kind="empty">
          Takvimde gösterilecek çalışan profili yok.
        </PanelState>
      )}

      {state === "idle" && employees.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
          <div
            className="week-calendar"
            style={{
              gridTemplateColumns: `150px repeat(${days.length}, minmax(${view === "month" ? 84 : 140}px, 1fr))`,
            }}
          >
            <div className="week-calendar-row week-calendar-head">
              <div className="week-calendar-lane-label" />
              {days.map((day, index) => (
                <div key={toDateKey(day)} className="week-calendar-day-head">
                  {view === "week" ? (
                    <>
                      <strong>{dayLabels[index]}</strong>
                      <small>
                        {day.toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </small>
                    </>
                  ) : (
                    <>
                      <strong>{day.getDate()}</strong>
                      <small>{dayLabels[index % 7]!.slice(0, 3)}</small>
                    </>
                  )}
                </div>
              ))}
            </div>
            {employees.map((emp) => (
              <div key={emp.id} className="week-calendar-row">
                <div className="week-calendar-lane-label">
                  <strong>{emp.member.user.name}</strong>
                  <small>{emp.title}</small>
                </div>
                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const cellId = cellKey(emp.memberId, dayKey);
                  return (
                    <CalendarCell
                      key={cellId}
                      id={cellId}
                      draggable={canDrag}
                      maxVisible={view === "month" ? 2 : undefined}
                      jobs={jobsByCell.get(cellId) ?? []}
                    />
                  );
                })}
              </div>
            ))}
            {hasUnassigned && (
              <div className="week-calendar-row">
                <div className="week-calendar-lane-label">
                  <strong>Atanmamış</strong>
                </div>
                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const cellId = cellKey(UNASSIGNED, dayKey);
                  return (
                    <CalendarCell
                      key={cellId}
                      id={cellId}
                      draggable={canDrag}
                      droppable={false}
                      maxVisible={view === "month" ? 2 : undefined}
                      jobs={jobsByCell.get(cellId) ?? []}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DndContext>
      )}
      {!canDrag && state === "idle" && employees.length > 0 && (
        <p className="week-calendar-note">
          Sürükleyerek yeniden atama/planlama için "iş emri atama" ve "iş emri
          güncelleme" yetkisi gerekir; işleri görüntüleyebilirsiniz.
        </p>
      )}
    </section>
  );
}

function CalendarCell({
  id,
  jobs,
  draggable,
  droppable = true,
  maxVisible,
}: {
  id: string;
  jobs: CalendarJob[];
  draggable: boolean;
  droppable?: boolean;
  /** Ay görünümünde dar hücrelerde tüm işleri sıkıştırmak yerine ilk
   * `maxVisible` kadarını gösterip kalanı "+N daha" ile özetler. */
  maxVisible?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });
  const visibleJobs =
    maxVisible !== undefined ? jobs.slice(0, maxVisible) : jobs;
  const hiddenCount = jobs.length - visibleJobs.length;
  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      className={isOver ? "week-calendar-cell over" : "week-calendar-cell"}
    >
      {visibleJobs.map((job) => (
        <JobChip key={job.id} job={job} draggable={draggable} />
      ))}
      {hiddenCount > 0 && (
        <div className="job-chip-more">+{hiddenCount} daha</div>
      )}
    </div>
  );
}

function JobChip({
  job,
  draggable,
}: {
  job: CalendarJob;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id, disabled: !draggable });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "job-chip dragging" : "job-chip"}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      {draggable && <GripVertical size={11} />}
      <div>
        <strong>{job.title}</strong>
        <small>{job.customer.displayName}</small>
        {job.scheduledStart && (
          <small>
            {new Date(job.scheduledStart).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>
        )}
      </div>
    </div>
  );
}
