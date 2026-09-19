"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  ClipboardList,
  ContactRound,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Route,
  Search,
  Server,
  Sun,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { PanelState, StatusBadge } from "../components/design-system";
import { Customers } from "../components/customers";
import { Jobs } from "../components/jobs";
import { Dispatch } from "../components/dispatch";
import { Catalog } from "../components/catalog";

const phases = [
  "Mimari ve planlama",
  "Monorepo ve altyapı",
  "Kimlik ve organizasyon",
  "Uygulama ve tasarım sistemi",
  "Müşteri yönetimi",
  "İş emirleri",
  "Planlama ve dispatch",
  "Teklif yönetimi",
  "Servis formları",
  "Fatura ve tahsilat",
  "Ürün ve stok",
  "Raporlama",
  "Entegrasyonlar",
  "Teknisyen uygulaması",
  "Müşteri portalı",
  "Güvenlik ve kalite",
];

type Tab =
  | "Genel Bakış"
  | "Müşteriler"
  | "İş Emirleri"
  | "Dispatch"
  | "Katalog"
  | "Ekip ve Roller"
  | "Sistem Durumu"
  | "Geliştirme Planı";
interface SessionUser {
  id: string;
  name: string;
  email: string;
  memberships: Array<{
    organization: {
      id: string;
      name: string;
      slug: string;
      timezone: string;
      currency: string;
    };
    role: { id: string; name: string };
  }>;
}
interface WorkspaceContext {
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
  };
  membership: {
    id: string;
    role: { id: string; name: string };
    permissions: string[];
  };
  plan: null | {
    key: string;
    name: string;
    status: string;
    entitlements: Array<{
      featureKey: string;
      enabled: boolean;
      limitValue: number | null;
    }>;
  };
  onboarding: Array<{ key: string; completedAt: string | null }>;
  metrics: {
    members: number;
    customers: number;
    unreadNotifications: number;
  };
}
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}
interface MemberItem {
  id: string;
  active: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  role: { id: string; name: string };
}

const onboardingLabels: Record<string, string> = {
  organization_created: "Şirket çalışma alanı oluşturuldu",
  owner_account_created: "Şirket sahibi hesabı doğrulandı",
  team_invited: "İlk ekip üyesini davet edin",
  service_catalog_ready: "Hizmet kataloğunu hazırlayın",
  first_customer_created: "İlk müşteriyi oluşturun",
  first_job_created: "İlk iş emrini planlayın",
};

async function apiMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? "İşlem tamamlanamadı";
  } catch {
    return "Sunucuyla bağlantı kurulamadı";
  }
}

export default function Home() {
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [tab, setTab] = useState<Tab>("Genel Bakış");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsState, setNotificationsState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [membersState, setMembersState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [health, setHealth] = useState<null | {
    status: string;
    checks?: Record<string, string>;
  }>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);

  useEffect(() => {
    setDark(localStorage.getItem("sahaflow-theme") === "dark");
    void fetch("/api/v1/auth/me", { cache: "no-store" }).then(
      async (response) => {
        if (response.status === 401) {
          window.location.assign("/giris");
          return;
        }
        if (!response.ok) {
          setWorkspaceError(await apiMessage(response));
          return;
        }
        const user = (await response.json()) as SessionUser;
        setSessionUser(user);
        const saved = localStorage.getItem("sahaflow-organization");
        const selected = user.memberships.some(
          (item) => item.organization.id === saved,
        )
          ? saved!
          : user.memberships[0]?.organization.id;
        if (selected) setOrganizationId(selected);
        else setWorkspaceError("Aktif bir organizasyon üyeliğiniz bulunmuyor");
      },
    );
  }, []);

  const loadedOrganizationId = useRef<string | null>(null);
  useEffect(() => {
    if (!organizationId) return;
    if (loadedOrganizationId.current !== organizationId) {
      setWorkspace(null);
      loadedOrganizationId.current = organizationId;
    }
    setWorkspaceError("");
    localStorage.setItem("sahaflow-organization", organizationId);
    void fetch(`/api/v1/organizations/${organizationId}/workspace`, {
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        setWorkspaceError(await apiMessage(response));
        return;
      }
      setWorkspace((await response.json()) as WorkspaceContext);
    });
  }, [organizationId, workspaceRevision]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setNotificationsOpen(false);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const permissions = workspace?.membership.permissions ?? [];
  const entitlements =
    workspace?.plan?.entitlements
      .filter((entry) => entry.enabled)
      .map((entry) => entry.featureKey) ?? [];
  const navigation = useMemo(
    () =>
      [
        {
          label: "İş Emirleri" as Tab,
          icon: ClipboardList,
          permission: "job.read",
          entitlement: "operations.jobs",
        },
        {
          label: "Müşteriler" as Tab,
          icon: ContactRound,
          permission: "customer.read",
          entitlement: "crm.customers",
        },
        {
          label: "Dispatch" as Tab,
          icon: Route,
          permission: "employee.read",
          entitlement: "operations.employees",
        },
        {
          label: "Katalog" as Tab,
          icon: Layers3,
          permission: "inventory.read",
          entitlement: "inventory.products",
        },
        {
          label: "Genel Bakış" as Tab,
          icon: LayoutDashboard,
          permission: "workspace.read",
          entitlement: "workspace.shell",
        },
        {
          label: "Ekip ve Roller" as Tab,
          icon: Users,
          permission: "member.read",
          entitlement: "team.management",
        },
        {
          label: "Sistem Durumu" as Tab,
          icon: Server,
          permission: "organization.read",
          entitlement: "workspace.shell",
        },
        {
          label: "Geliştirme Planı" as Tab,
          icon: Workflow,
          permission: "workspace.read",
          entitlement: "workspace.shell",
        },
      ].filter(
        (item) =>
          permissions.includes(item.permission) &&
          entitlements.includes(item.entitlement),
      ),
    [permissions, entitlements],
  );
  const commandResults = navigation.filter((item) =>
    item.label
      .toLocaleLowerCase("tr-TR")
      .includes(commandQuery.toLocaleLowerCase("tr-TR")),
  );

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.assign("/giris");
  }

  function changeTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("sahaflow-theme", next ? "dark" : "light");
  }

  function navigate(next: Tab) {
    setTab(next);
    setMobile(false);
    setCommandOpen(false);
    if (next === "Ekip ve Roller" && membersState === "idle")
      void loadMembers();
  }

  async function loadMembers() {
    if (!organizationId) return;
    setMembersState("loading");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/members`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      setMembersState("error");
      return;
    }
    setMembers((await response.json()) as MemberItem[]);
    setMembersState("idle");
  }

  async function loadNotifications() {
    if (!organizationId) return;
    setNotificationsOpen(true);
    setNotificationsState("loading");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/notifications?page=1&pageSize=10&status=all`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      setNotificationsState("error");
      return;
    }
    const data = (await response.json()) as { items: NotificationItem[] };
    setNotifications(data.items);
    setNotificationsState("idle");
  }

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/notifications/${item.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ read: true }),
      },
    );
    if (!response.ok) return;
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, readAt: now } : entry,
      ),
    );
    setWorkspace((current) =>
      current
        ? {
            ...current,
            metrics: {
              ...current.metrics,
              unreadNotifications: Math.max(
                0,
                current.metrics.unreadNotifications - 1,
              ),
            },
          }
        : current,
    );
  }

  async function checkHealth() {
    setHealthBusy(true);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      setHealth(
        (await response.json()) as {
          status: string;
          checks?: Record<string, string>;
        },
      );
    } catch {
      setHealth({ status: "unavailable" });
    } finally {
      setHealthBusy(false);
    }
  }

  const initials = (sessionUser?.name ?? "SF")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const completed =
    workspace?.onboarding.filter((step) => step.completedAt).length ?? 0;

  return (
    <div className={dark ? "shell dark" : "shell"}>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="/">
          <Layers3 size={34} />
          <span>
            Saha<span className="accent">Flow</span> <small>TR</small>
            <em>Saha işinizin dijital gücü.</em>
          </span>
        </a>
        <button
          className="mobile close"
          onClick={() => setMobile(false)}
          aria-label="Menüyü kapat"
        >
          <X />
        </button>
        <p className="nav-label">ÇALIŞMA ALANI</p>
        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={tab === label ? "active" : ""}
              key={label}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              {label}
              {tab === label && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note workspace-plan">
          <StatusBadge tone="success">
            {workspace?.plan?.status === "active" ? "AKTİF" : "YÜKLENİYOR"}
          </StatusBadge>
          <strong>{workspace?.plan?.name ?? "Plan bilgisi"}</strong>
          <p>
            {workspace?.plan?.entitlements.length ?? 0} özellik hakkı backend
            tarafından doğrulandı.
          </p>
        </div>
        <div className="company">
          <span className="company-avatar">
            {workspace?.organization.name.slice(0, 2).toUpperCase() ?? "SF"}
          </span>
          <div>
            {workspace?.organization.name ?? "Çalışma alanı yükleniyor"}
            <small>
              {workspace?.membership.role.name ?? "Üyelik doğrulanıyor"}
            </small>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header>
          <button
            className="mobile"
            onClick={() => setMobile(true)}
            aria-label="Menüyü aç"
          >
            <Menu />
          </button>
          <div className="workspace-selector">
            <Building2 size={17} />
            <select
              aria-label="Organizasyon seç"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              {sessionUser?.memberships.map((item) => (
                <option key={item.organization.id} value={item.organization.id}>
                  {item.organization.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <button
            className="command-trigger"
            onClick={() => setCommandOpen(true)}
          >
            <Search size={16} /> Ara veya komut çalıştır <kbd>Ctrl K</kbd>
          </button>
          <div className="header-actions">
            <span className="environment">
              <i /> Phase 5
            </span>
            <button
              aria-label={dark ? "Açık tema" : "Koyu tema"}
              onClick={changeTheme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="notification-wrap">
              <button
                aria-label="Bildirimler"
                onClick={() =>
                  notificationsOpen
                    ? setNotificationsOpen(false)
                    : void loadNotifications()
                }
              >
                <Bell size={19} />
                {Boolean(workspace?.metrics.unreadNotifications) && (
                  <span className="notification-count">
                    {workspace!.metrics.unreadNotifications}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="popover-title">
                    <strong>Bildirimler</strong>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Bildirimleri kapat"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {notificationsState === "loading" && (
                    <PanelState kind="loading">
                      Bildirimler yükleniyor…
                    </PanelState>
                  )}
                  {notificationsState === "error" && (
                    <PanelState kind="error">Bildirimler alınamadı.</PanelState>
                  )}
                  {notificationsState === "idle" &&
                    notifications.length === 0 && (
                      <PanelState kind="empty">
                        Henüz bildiriminiz yok.
                      </PanelState>
                    )}
                  {notifications.map((item) => (
                    <button
                      className={
                        item.readAt
                          ? "notification-item read"
                          : "notification-item"
                      }
                      key={item.id}
                      onClick={() => void markRead(item)}
                    >
                      <span />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                        <small>
                          {new Intl.DateTimeFormat("tr-TR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(item.createdAt))}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href="/api/health" aria-label="API durumu">
              <CircleHelp size={19} />
            </a>
            {sessionUser && (
              <button
                className="session-chip"
                onClick={logout}
                title="Çıkış yap"
              >
                <span className="avatar">{initials}</span>
                <span>
                  {sessionUser.name}
                  <small>Çıkış yap</small>
                </span>
              </button>
            )}
          </div>
        </header>

        <main>
          {workspaceError && (
            <PanelState kind="error">{workspaceError}</PanelState>
          )}
          {!workspace && !workspaceError && (
            <PanelState kind="loading">
              Çalışma alanınız hazırlanıyor…
            </PanelState>
          )}
          {workspace && (
            <>
              <div className="heading workspace-heading">
                <div>
                  <p className="eyebrow">
                    {workspace.organization.name.toLocaleUpperCase("tr-TR")}
                  </p>
                  <h1>
                    {tab === "Genel Bakış"
                      ? `Merhaba, ${sessionUser?.name.split(" ")[0] ?? ""}`
                      : tab}
                  </h1>
                  <p>
                    {tab === "Genel Bakış"
                      ? "Şirket kurulumunuzu tamamlayarak ilk operasyona hazırlanın."
                      : "Yetkili çalışma alanı verileri"}
                  </p>
                </div>
                <StatusBadge tone="success">
                  {workspace.membership.role.name}
                </StatusBadge>
              </div>
              {tab === "Genel Bakış" && (
                <Overview
                  workspace={workspace}
                  completed={completed}
                  onNavigate={navigate}
                />
              )}
              {tab === "Ekip ve Roller" && (
                <Team
                  members={members}
                  state={membersState}
                  retry={loadMembers}
                />
              )}
              {tab === "Müşteriler" && (
                <Customers
                  organizationId={organizationId}
                  permissions={permissions}
                  onCustomerCreated={() =>
                    setWorkspaceRevision((value) => value + 1)
                  }
                />
              )}
              {tab === "İş Emirleri" && (
                <Jobs
                  organizationId={organizationId}
                  permissions={permissions}
                  onChanged={() => setWorkspaceRevision((value) => value + 1)}
                />
              )}
              {tab === "Dispatch" && (
                <Dispatch
                  organizationId={organizationId}
                  permissions={permissions}
                />
              )}
              {tab === "Katalog" && (
                <Catalog
                  organizationId={organizationId}
                  permissions={permissions}
                />
              )}
              {tab === "Sistem Durumu" && (
                <SystemStatus
                  health={health}
                  busy={healthBusy}
                  check={checkHealth}
                />
              )}
              {tab === "Geliştirme Planı" && <Roadmap />}
              <footer>
                <span>
                  SahaFlow TR <span>·</span> Saha işinizin dijital gücü.
                </span>
                <span>
                  {workspace.organization.currency} ·{" "}
                  {workspace.organization.timezone}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>

      {commandOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => setCommandOpen(false)}
        >
          <section
            className="command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Komut menüsü"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-input">
              <Command size={19} />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Sayfa veya işlem ara…"
                aria-label="Komut ara"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-results">
              {commandResults.length === 0 ? (
                <PanelState kind="empty">Eşleşen komut bulunamadı.</PanelState>
              ) : (
                commandResults.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => navigate(label)}>
                    <Icon size={18} />
                    <span>
                      {label}
                      <small>Çalışma alanına git</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Overview({
  workspace,
  completed,
  onNavigate,
}: {
  workspace: WorkspaceContext;
  completed: number;
  onNavigate: (tab: Tab) => void;
}) {
  const total = workspace.onboarding.length;
  return (
    <>
      <section className="metric-grid">
        <Metric
          label="Aktif ekip"
          value={String(workspace.metrics.members)}
          detail="Organizasyon üyesi"
          icon={<Users />}
        />
        <Metric
          label="Kurulum ilerlemesi"
          value={`${completed}/${total}`}
          detail={`%${Math.round((completed / Math.max(total, 1)) * 100)} tamamlandı`}
          icon={<Check />}
        />
        <Metric
          label="Müşteriler"
          value={String(workspace.metrics.customers)}
          detail="Organizasyon müşteri kaydı"
          icon={<ContactRound />}
        />
        <Metric
          label="Bildirim"
          value={String(workspace.metrics.unreadNotifications)}
          detail="Okunmamış bildirim"
          icon={<Bell />}
        />
      </section>
      <section className="dashboard-grid">
        <div className="content-card onboarding-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">BAŞLANGIÇ</p>
              <h2>Çalışma alanını tamamlayın</h2>
            </div>
            <StatusBadge tone={completed === total ? "success" : "warning"}>
              {completed}/{total}
            </StatusBadge>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${(completed / Math.max(total, 1)) * 100}%`,
              }}
            />
          </div>
          <div className="checklist">
            {workspace.onboarding.map((step) => (
              <div
                key={step.key}
                className={step.completedAt ? "complete" : ""}
              >
                <span>{step.completedAt ? <Check size={15} /> : null}</span>
                <div>
                  <strong>{onboardingLabels[step.key] ?? step.key}</strong>
                  <small>
                    {step.completedAt
                      ? "Tamamlandı"
                      : step.key === "team_invited"
                        ? "Ekip yönetiminden devam edin"
                        : step.key === "first_customer_created"
                          ? "Müşteri yönetiminden devam edin"
                          : "İlgili ürün fazında etkinleşecek"}
                  </small>
                </div>
                {step.key === "team_invited" && !step.completedAt && (
                  <button onClick={() => onNavigate("Ekip ve Roller")}>
                    Görüntüle
                  </button>
                )}
                {step.key === "first_customer_created" && !step.completedAt && (
                  <button onClick={() => onNavigate("Müşteriler")}>
                    Görüntüle
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="content-card account-card">
          <p className="eyebrow">ORGANİZASYON</p>
          <h2>{workspace.organization.name}</h2>
          <p>Tenant kapsamı ve rol yetkileri backend tarafından doğrulandı.</p>
          <dl>
            <div>
              <dt>Rol</dt>
              <dd>{workspace.membership.role.name}</dd>
            </div>
            <div>
              <dt>Para birimi</dt>
              <dd>{workspace.organization.currency}</dd>
            </div>
            <div>
              <dt>Saat dilimi</dt>
              <dd>{workspace.organization.timezone}</dd>
            </div>
            <div>
              <dt>Yetki sayısı</dt>
              <dd>{workspace.membership.permissions.length}</dd>
            </div>
          </dl>
          <button
            className="primary"
            onClick={() => onNavigate("Ekip ve Roller")}
          >
            Ekip ve rolleri görüntüle <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function Team({
  members,
  state,
  retry,
}: {
  members: MemberItem[];
  state: string;
  retry: () => Promise<void>;
}) {
  return (
    <section className="content-card table-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">RBAC</p>
          <h2>Organizasyon üyeleri</h2>
        </div>
        <StatusBadge>{members.length} üye</StatusBadge>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Ekip yükleniyor…</PanelState>
      )}
      {state === "error" && (
        <PanelState kind="error">
          Ekip alınamadı.{" "}
          <button onClick={() => void retry()}>Tekrar dene</button>
        </PanelState>
      )}
      {state === "idle" && members.length === 0 && (
        <PanelState kind="empty">Bu organizasyonda üye bulunmuyor.</PanelState>
      )}
      {members.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.user.name}</strong>
                  </td>
                  <td>{member.user.email}</td>
                  <td>{member.role.name}</td>
                  <td>
                    <StatusBadge tone={member.active ? "success" : "neutral"}>
                      {member.active ? "Aktif" : "Pasif"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SystemStatus({
  health,
  busy,
  check,
}: {
  health: null | { status: string; checks?: Record<string, string> };
  busy: boolean;
  check: () => Promise<void>;
}) {
  return (
    <section className="content-card system-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">CANLI KONTROL</p>
          <h2>Altyapı servisleri</h2>
        </div>
        <button
          className="primary"
          onClick={() => void check()}
          disabled={busy}
        >
          {busy ? "Kontrol ediliyor…" : "Bağlantıları kontrol et"}
        </button>
      </div>
      {!health && (
        <PanelState kind="empty">Henüz bağlantı kontrolü yapılmadı.</PanelState>
      )}
      {health && (
        <div className="service-grid">
          {["database", "redis", "storage"].map((key) => {
            const value = health.checks?.[key] ?? "down";
            return (
              <div key={key}>
                <Activity size={19} />
                <strong>
                  {key === "database"
                    ? "PostgreSQL"
                    : key === "storage"
                      ? "MinIO"
                      : "Redis"}
                </strong>
                <StatusBadge tone={value === "up" ? "success" : "warning"}>
                  {value === "up" ? "Hazır" : "Kapalı"}
                </StatusBadge>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Roadmap() {
  return (
    <section className="roadmap content-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">ADIM ADIM SAHAFLOW</p>
          <h2>Uygulama yol haritası</h2>
        </div>
        <span>{phases.length} geliştirme fazı</span>
      </div>
      <div className="phase-grid">
        {phases.map((name, index) => (
          <div className="phase" key={name}>
            <span className={index <= 5 ? "phase-number done" : "phase-number"}>
              {index <= 5 ? (
                <Check size={18} />
              ) : (
                String(index).padStart(2, "0")
              )}
            </span>
            <div>
              <h3>{name}</h3>
              <small>{index <= 5 ? "Tamamlandı" : "Planlandı"}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
