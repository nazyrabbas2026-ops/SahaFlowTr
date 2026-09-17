"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Edit3,
  MapPin,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { PanelState, StatusBadge } from "./design-system";

type CustomerType = "INDIVIDUAL" | "COMPANY";
type CustomerStatus = "ACTIVE" | "ARCHIVED";
interface CustomerSummary {
  id: string;
  customerNumber: string;
  type: CustomerType;
  status: CustomerStatus;
  displayName: string;
  primaryPhone: string | null;
  email: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  _count: { contacts: number; addresses: number; assets: number };
}
interface ContactItem {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  preferredChannel: "PHONE" | "EMAIL" | "SMS" | "WHATSAPP";
  isPrimary: boolean;
  marketingConsentAt: string | null;
  active: boolean;
}
interface AddressItem {
  id: string;
  label: string;
  type: "BILLING" | "SERVICE" | "BOTH";
  line1: string;
  line2: string | null;
  district: string;
  city: string;
  postalCode: string | null;
  siteName: string | null;
  building: string | null;
  block: string | null;
  floor: string | null;
  unit: string | null;
  accessInstructions: string | null;
  active: boolean;
}
interface AssetItem {
  id: string;
  addressId: string | null;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  warrantyEndsAt: string | null;
  maintenanceIntervalDays: number | null;
  notes: string | null;
  active: boolean;
  address: { id: string; label: string } | null;
}
interface CustomerDetail extends CustomerSummary {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  alternatePhone: string | null;
  nationalIdLastFour: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  notes: string | null;
  contacts: ContactItem[];
  addresses: AddressItem[];
  assets: AssetItem[];
}

const customerFormSchema = z
  .object({
    type: z.enum(["INDIVIDUAL", "COMPANY"]),
    firstName: z.string().trim().max(80),
    lastName: z.string().trim().max(80),
    companyName: z.string().trim().max(160),
    primaryPhone: z.string().trim().max(30),
    alternatePhone: z.string().trim().max(30),
    email: z.union([
      z.string().trim().email("Geçerli bir e-posta girin"),
      z.literal(""),
    ]),
    nationalId: z.union([
      z
        .string()
        .trim()
        .regex(/^\d{11}$/, "TCKN 11 haneli olmalıdır"),
      z.literal(""),
    ]),
    taxNumber: z.union([
      z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Vergi numarası 10 haneli olmalıdır"),
      z.literal(""),
    ]),
    taxOffice: z.string().trim().max(120),
    notes: z.string().trim().max(2000),
    tags: z.string().max(400),
  })
  .superRefine((value, context) => {
    if (value.type === "INDIVIDUAL") {
      if (value.firstName.length < 2)
        context.addIssue({
          code: "custom",
          path: ["firstName"],
          message: "Ad gereklidir",
        });
      if (value.lastName.length < 2)
        context.addIssue({
          code: "custom",
          path: ["lastName"],
          message: "Soyad gereklidir",
        });
    } else if (value.companyName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Firma adı gereklidir",
      });
    }
  });
type CustomerFormValues = z.infer<typeof customerFormSchema>;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    try {
      const data = (await response.json()) as {
        message?: string | { fields?: Array<{ message: string }> };
        fields?: Array<{ message: string }>;
      };
      if (typeof data.message === "string") throw new Error(data.message);
      const fieldMessage =
        data.message?.fields?.[0]?.message ?? data.fields?.[0]?.message;
      throw new Error(fieldMessage ?? "İşlem tamamlanamadı");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message !== "Unexpected end of JSON input"
      )
        throw error;
      throw new Error("Sunucuyla bağlantı kurulamadı");
    }
  }
  return (await response.json()) as T;
}

export function Customers({
  organizationId,
  permissions,
  onCustomerCreated,
}: {
  organizationId: string;
  permissions: string[];
  onCustomerCreated: () => void;
}) {
  const [items, setItems] = useState<CustomerSummary[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailState, setDetailState] = useState<"loading" | "idle" | "error">(
    "idle",
  );
  const [customerForm, setCustomerForm] = useState<
    CustomerDetail | "new" | null
  >(null);
  const [relatedForm, setRelatedForm] = useState<null | {
    kind: "contact" | "address" | "asset";
    item?: ContactItem | AddressItem | AssetItem;
  }>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    const params = new URLSearchParams({
      search: appliedSearch,
      type,
      status,
      page: String(page),
      pageSize: "10",
    });
    try {
      const data = await requestJson<{
        items: CustomerSummary[];
        pagination: { total: number; pages: number };
      }>(`/api/v1/organizations/${organizationId}/customers?${params}`);
      setItems(data.items);
      setPagination(data.pagination);
      setState("idle");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Müşteriler alınamadı",
      );
      setState("error");
    }
  }, [appliedSearch, organizationId, page, status, type]);

  const loadDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetailState("loading");
      try {
        setDetail(
          await requestJson<CustomerDetail>(
            `/api/v1/organizations/${organizationId}/customers/${id}`,
          ),
        );
        setDetailState("idle");
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Müşteri alınamadı",
        );
        setDetailState("error");
      }
    },
    [organizationId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function archiveCustomer() {
    if (!detail || !window.confirm(`${detail.displayName} arşivlensin mi?`))
      return;
    try {
      await requestJson(
        `/api/v1/organizations/${organizationId}/customers/${detail.id}`,
        { method: "DELETE" },
      );
      setSelectedId(null);
      setDetail(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "İşlem tamamlanamadı",
      );
    }
  }

  async function restoreCustomer() {
    if (!detail) return;
    await requestJson(
      `/api/v1/organizations/${organizationId}/customers/${detail.id}/restore`,
      { method: "POST" },
    );
    await loadDetail(detail.id);
    await load();
  }

  async function archiveRelated(
    kind: "contact" | "address" | "asset",
    id: string,
  ) {
    if (!detail || !window.confirm("Bu kayıt arşivlensin mi?")) return;
    await requestJson(
      `/api/v1/organizations/${organizationId}/customers/${detail.id}/${kind === "contact" ? "contacts" : kind === "address" ? "addresses" : "assets"}/${id}`,
      { method: "DELETE" },
    );
    await loadDetail(detail.id);
  }

  if (selectedId)
    return (
      <section className="customer-detail-view">
        <button
          className="back-button"
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        >
          <ArrowLeft size={17} /> Müşterilere dön
        </button>
        {detailState === "loading" && (
          <PanelState kind="loading">Müşteri 360 yükleniyor…</PanelState>
        )}
        {detailState === "error" && (
          <PanelState kind="error">{error}</PanelState>
        )}
        {detail && detailState === "idle" && (
          <>
            <div className="customer-detail-head content-card">
              <div className="customer-identity">
                <span>
                  {detail.type === "COMPANY" ? (
                    <Building2 />
                  ) : (
                    <CircleUserRound />
                  )}
                </span>
                <div>
                  <small>{detail.customerNumber}</small>
                  <h2>{detail.displayName}</h2>
                  <StatusBadge
                    tone={detail.status === "ACTIVE" ? "success" : "neutral"}
                  >
                    {detail.status === "ACTIVE" ? "Aktif" : "Arşivde"}
                  </StatusBadge>
                </div>
              </div>
              <div className="detail-actions">
                {permissions.includes("customer.update") && (
                  <button onClick={() => setCustomerForm(detail)}>
                    <Edit3 size={16} /> Düzenle
                  </button>
                )}
                {permissions.includes("customer.archive") &&
                  (detail.status === "ACTIVE" ? (
                    <button
                      className="danger-ghost"
                      onClick={() => void archiveCustomer()}
                    >
                      <Archive size={16} /> Arşivle
                    </button>
                  ) : (
                    <button onClick={() => void restoreCustomer()}>
                      <RotateCcw size={16} /> Geri al
                    </button>
                  ))}
              </div>
            </div>
            <div className="customer-360-grid">
              <section className="content-card customer-summary-card">
                <p className="eyebrow">MÜŞTERİ BİLGİLERİ</p>
                <dl>
                  <Info label="Telefon" value={detail.primaryPhone} />
                  <Info
                    label="Alternatif telefon"
                    value={detail.alternatePhone}
                  />
                  <Info label="E-posta" value={detail.email} />
                  {detail.type === "COMPANY" && (
                    <>
                      <Info label="Vergi numarası" value={detail.taxNumber} />
                      <Info label="Vergi dairesi" value={detail.taxOffice} />
                    </>
                  )}
                  {detail.nationalIdLastFour && (
                    <Info
                      label="TCKN"
                      value={`*******${detail.nationalIdLastFour}`}
                    />
                  )}
                  <Info label="Etiketler" value={detail.tags.join(", ")} />
                </dl>
                {detail.notes && (
                  <p className="customer-notes">{detail.notes}</p>
                )}
              </section>
              <RelatedSection
                title="İletişim kişileri"
                icon={<Phone />}
                empty="İletişim kişisi bulunmuyor"
                add={() => setRelatedForm({ kind: "contact" })}
                canEdit={permissions.includes("customer.update")}
              >
                {detail.contacts
                  .filter((item) => item.active)
                  .map((item) => (
                    <RelatedItem
                      key={item.id}
                      title={item.name}
                      lines={[item.role, item.phone, item.email]}
                      badge={item.isPrimary ? "Birincil" : undefined}
                      edit={() => setRelatedForm({ kind: "contact", item })}
                      archive={() => void archiveRelated("contact", item.id)}
                    />
                  ))}
              </RelatedSection>
              <RelatedSection
                title="Servis adresleri"
                icon={<MapPin />}
                empty="Servis adresi bulunmuyor"
                add={() => setRelatedForm({ kind: "address" })}
                canEdit={permissions.includes("customer.update")}
              >
                {detail.addresses
                  .filter((item) => item.active)
                  .map((item) => (
                    <RelatedItem
                      key={item.id}
                      title={item.label}
                      lines={[
                        `${item.line1}, ${item.district}/${item.city}`,
                        item.siteName,
                      ]}
                      badge={
                        item.type === "BOTH"
                          ? "Fatura + Servis"
                          : item.type === "BILLING"
                            ? "Fatura"
                            : "Servis"
                      }
                      edit={() => setRelatedForm({ kind: "address", item })}
                      archive={() => void archiveRelated("address", item.id)}
                    />
                  ))}
              </RelatedSection>
              <RelatedSection
                title="Cihaz ve varlıklar"
                icon={<Package />}
                empty="Kayıtlı cihaz bulunmuyor"
                add={() => setRelatedForm({ kind: "asset" })}
                canEdit={permissions.includes("customer.update")}
              >
                {detail.assets
                  .filter((item) => item.active)
                  .map((item) => (
                    <RelatedItem
                      key={item.id}
                      title={item.name}
                      lines={[
                        [item.brand, item.model].filter(Boolean).join(" "),
                        item.serialNumber ? `Seri: ${item.serialNumber}` : null,
                        item.address?.label,
                      ]}
                      badge={item.category}
                      edit={() => setRelatedForm({ kind: "asset", item })}
                      archive={() => void archiveRelated("asset", item.id)}
                    />
                  ))}
              </RelatedSection>
            </div>
          </>
        )}
        {customerForm && (
          <CustomerForm
            organizationId={organizationId}
            initial={customerForm === "new" ? undefined : customerForm}
            onClose={() => setCustomerForm(null)}
            onSaved={async (saved) => {
              setCustomerForm(null);
              await loadDetail(saved.id);
              await load();
              onCustomerCreated();
            }}
          />
        )}
        {relatedForm && detail && (
          <RelatedForm
            organizationId={organizationId}
            customer={detail}
            kind={relatedForm.kind}
            item={relatedForm.item}
            onClose={() => setRelatedForm(null)}
            onSaved={async () => {
              setRelatedForm(null);
              await loadDetail(detail.id);
            }}
          />
        )}
      </section>
    );

  return (
    <section className="content-card customer-list-card">
      <div className="section-title customer-title">
        <div>
          <p className="eyebrow">CRM</p>
          <h2>Müşteriler</h2>
          <p>{pagination.total} müşteri kaydı</p>
        </div>
        {permissions.includes("customer.create") && (
          <button className="primary" onClick={() => setCustomerForm("new")}>
            <Plus size={16} /> Yeni müşteri
          </button>
        )}
      </div>
      <div className="list-toolbar">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedSearch(search);
          }}
        >
          <Search size={16} />
          <input
            aria-label="Müşteri ara"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ad, numara, telefon veya e-posta…"
          />
          <button type="submit">Ara</button>
        </form>
        <select
          aria-label="Müşteri tipi"
          value={type}
          onChange={(event) => {
            setPage(1);
            setType(event.target.value);
          }}
        >
          <option value="ALL">Tüm tipler</option>
          <option value="INDIVIDUAL">Bireysel</option>
          <option value="COMPANY">Kurumsal</option>
        </select>
        <select
          aria-label="Müşteri durumu"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="ARCHIVED">Arşiv</option>
          <option value="ALL">Tüm durumlar</option>
        </select>
      </div>
      {state === "loading" && (
        <PanelState kind="loading">Müşteriler yükleniyor…</PanelState>
      )}
      {state === "error" && (
        <PanelState kind="error">
          {error} <button onClick={() => void load()}>Tekrar dene</button>
        </PanelState>
      )}
      {state === "idle" && items.length === 0 && (
        <PanelState kind="empty">
          Filtrelerle eşleşen müşteri bulunamadı.
        </PanelState>
      )}
      {state === "idle" && items.length > 0 && (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>İletişim</th>
                <th>Tip</th>
                <th>Kayıtlar</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.displayName}</strong>
                    <small>{customer.customerNumber}</small>
                  </td>
                  <td>{customer.primaryPhone ?? customer.email ?? "—"}</td>
                  <td>
                    {customer.type === "COMPANY" ? "Kurumsal" : "Bireysel"}
                  </td>
                  <td>
                    {customer._count.addresses} adres · {customer._count.assets}{" "}
                    cihaz
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        customer.status === "ACTIVE" ? "success" : "neutral"
                      }
                    >
                      {customer.status === "ACTIVE" ? "Aktif" : "Arşiv"}
                    </StatusBadge>
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={() => void loadDetail(customer.id)}
                    >
                      Detay <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={15} /> Önceki
        </button>
        <span>
          {page} / {pagination.pages}
        </span>
        <button
          disabled={page >= pagination.pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Sonraki <ChevronRight size={15} />
        </button>
      </div>
      {customerForm && (
        <CustomerForm
          organizationId={organizationId}
          onClose={() => setCustomerForm(null)}
          onSaved={async (saved) => {
            setCustomerForm(null);
            await load();
            await loadDetail(saved.id);
            onCustomerCreated();
          }}
        />
      )}
    </section>
  );
}

function CustomerForm({
  organizationId,
  initial,
  onClose,
  onSaved,
}: {
  organizationId: string;
  initial?: CustomerDetail;
  onClose: () => void;
  onSaved: (customer: CustomerSummary) => Promise<void>;
}) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormValues>,
    defaultValues: {
      type: initial?.type ?? "INDIVIDUAL",
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      companyName: initial?.companyName ?? "",
      primaryPhone: initial?.primaryPhone ?? "",
      alternatePhone: initial?.alternatePhone ?? "",
      email: initial?.email ?? "",
      nationalId: "",
      taxNumber: initial?.taxNumber ?? "",
      taxOffice: initial?.taxOffice ?? "",
      notes: initial?.notes ?? "",
      tags: initial?.tags.join(", ") ?? "",
    },
  });
  const type = watch("type");
  async function submit(values: CustomerFormValues) {
    setServerError("");
    const payload: Record<string, unknown> = {
      type: values.type,
      primaryPhone: values.primaryPhone || null,
      alternatePhone: values.alternatePhone || null,
      email: values.email || null,
      taxNumber: values.taxNumber || null,
      taxOffice: values.taxOffice || null,
      notes: values.notes || null,
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    if (values.type === "INDIVIDUAL")
      Object.assign(payload, {
        firstName: values.firstName,
        lastName: values.lastName,
      });
    else
      Object.assign(payload, {
        companyName: values.companyName,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
      });
    if (values.nationalId) payload.nationalId = values.nationalId;
    if (initial) payload.version = initial.version;
    try {
      const customer = await requestJson<CustomerSummary>(
        `/api/v1/organizations/${organizationId}/customers${initial ? `/${initial.id}` : ""}`,
        {
          method: initial ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      await onSaved(customer);
    } catch (caught) {
      setServerError(
        caught instanceof Error ? caught.message : "Müşteri kaydedilemedi",
      );
    }
  }
  return (
    <Modal
      title={initial ? "Müşteriyi düzenle" : "Yeni müşteri"}
      onClose={onClose}
    >
      <form className="entity-form" onSubmit={handleSubmit(submit)} noValidate>
        <div className="segmented">
          <label>
            <input type="radio" value="INDIVIDUAL" {...register("type")} />{" "}
            Bireysel
          </label>
          <label>
            <input type="radio" value="COMPANY" {...register("type")} />{" "}
            Kurumsal
          </label>
        </div>
        {type === "INDIVIDUAL" ? (
          <div className="form-grid">
            <FormField label="Ad" error={errors.firstName?.message}>
              <input {...register("firstName")} />
            </FormField>
            <FormField label="Soyad" error={errors.lastName?.message}>
              <input {...register("lastName")} />
            </FormField>
          </div>
        ) : (
          <FormField label="Firma adı" error={errors.companyName?.message}>
            <input {...register("companyName")} />
          </FormField>
        )}
        <div className="form-grid">
          <FormField label="Telefon">
            <input {...register("primaryPhone")} />
          </FormField>
          <FormField label="Alternatif telefon">
            <input {...register("alternatePhone")} />
          </FormField>
        </div>
        <FormField label="E-posta" error={errors.email?.message}>
          <input type="email" {...register("email")} />
        </FormField>
        {type === "INDIVIDUAL" ? (
          <FormField
            label="TCKN (opsiyonel)"
            error={errors.nationalId?.message}
          >
            <input
              inputMode="numeric"
              autoComplete="off"
              {...register("nationalId")}
            />
            {initial?.nationalIdLastFour && (
              <small>
                Mevcut değer *******{initial.nationalIdLastFour}; boş
                bırakırsanız korunur.
              </small>
            )}
          </FormField>
        ) : (
          <div className="form-grid">
            <FormField label="Vergi numarası" error={errors.taxNumber?.message}>
              <input inputMode="numeric" {...register("taxNumber")} />
            </FormField>
            <FormField label="Vergi dairesi">
              <input {...register("taxOffice")} />
            </FormField>
          </div>
        )}
        <FormField label="Etiketler">
          <input {...register("tags")} placeholder="VIP, sözleşmeli" />
        </FormField>
        <FormField label="Not">
          <textarea rows={3} {...register("notes")} />
        </FormField>
        {serverError && (
          <div className="auth-error" role="alert">
            {serverError}
          </div>
        )}
        <ModalActions onClose={onClose} busy={isSubmitting} />
      </form>
    </Modal>
  );
}

function RelatedForm({
  organizationId,
  customer,
  kind,
  item,
  onClose,
  onSaved,
}: {
  organizationId: string;
  customer: CustomerDetail;
  kind: "contact" | "address" | "asset";
  item?: ContactItem | AddressItem | AssetItem;
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
    let payload: Record<string, unknown>;
    if (kind === "contact")
      payload = {
        name: data.get("name"),
        role: data.get("role") || undefined,
        phone: data.get("phone") || undefined,
        email: data.get("email") || undefined,
        preferredChannel: data.get("preferredChannel"),
        isPrimary: data.get("isPrimary") === "on",
        marketingConsent: data.get("marketingConsent") === "on",
        marketingConsentSource:
          data.get("marketingConsent") === "on" ? "workspace_form" : undefined,
      };
    else if (kind === "address")
      payload = {
        label: data.get("label"),
        type: data.get("type"),
        line1: data.get("line1"),
        line2: data.get("line2") || undefined,
        district: data.get("district"),
        city: data.get("city"),
        postalCode: data.get("postalCode") || undefined,
        siteName: data.get("siteName") || undefined,
        building: data.get("building") || undefined,
        block: data.get("block") || undefined,
        floor: data.get("floor") || undefined,
        unit: data.get("unit") || undefined,
        accessInstructions: data.get("accessInstructions") || undefined,
      };
    else
      payload = {
        addressId: data.get("addressId") || null,
        name: data.get("name"),
        category: data.get("category"),
        brand: data.get("brand") || undefined,
        model: data.get("model") || undefined,
        serialNumber: data.get("serialNumber") || undefined,
        installationDate: data.get("installationDate") || null,
        warrantyEndsAt: data.get("warrantyEndsAt") || null,
        maintenanceIntervalDays: data.get("maintenanceIntervalDays")
          ? Number(data.get("maintenanceIntervalDays"))
          : null,
        notes: data.get("notes") || undefined,
      };
    const plural =
      kind === "contact"
        ? "contacts"
        : kind === "address"
          ? "addresses"
          : "assets";
    try {
      await requestJson(
        `/api/v1/organizations/${organizationId}/customers/${customer.id}/${plural}${item ? `/${item.id}` : ""}`,
        {
          method: item ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Kayıt tamamlanamadı",
      );
    } finally {
      setBusy(false);
    }
  }
  const contact =
    kind === "contact" ? (item as ContactItem | undefined) : undefined;
  const address =
    kind === "address" ? (item as AddressItem | undefined) : undefined;
  const asset = kind === "asset" ? (item as AssetItem | undefined) : undefined;
  return (
    <Modal
      title={`${item ? "Düzenle" : "Ekle"} · ${kind === "contact" ? "İletişim" : kind === "address" ? "Adres" : "Cihaz"}`}
      onClose={onClose}
    >
      <form className="entity-form" onSubmit={submit}>
        {kind === "contact" && (
          <>
            <FormField label="Ad soyad">
              <input
                name="name"
                required
                minLength={2}
                defaultValue={contact?.name}
              />
            </FormField>
            <div className="form-grid">
              <FormField label="Görevi">
                <input name="role" defaultValue={contact?.role ?? ""} />
              </FormField>
              <FormField label="Tercih edilen kanal">
                <select
                  name="preferredChannel"
                  defaultValue={contact?.preferredChannel ?? "PHONE"}
                >
                  <option value="PHONE">Telefon</option>
                  <option value="EMAIL">E-posta</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </FormField>
            </div>
            <div className="form-grid">
              <FormField label="Telefon">
                <input name="phone" defaultValue={contact?.phone ?? ""} />
              </FormField>
              <FormField label="E-posta">
                <input
                  name="email"
                  type="email"
                  defaultValue={contact?.email ?? ""}
                />
              </FormField>
            </div>
            <div className="check-row">
              <label>
                <input
                  name="isPrimary"
                  type="checkbox"
                  defaultChecked={contact?.isPrimary}
                />{" "}
                Birincil kişi
              </label>
              <label>
                <input
                  name="marketingConsent"
                  type="checkbox"
                  defaultChecked={Boolean(contact?.marketingConsentAt)}
                />{" "}
                Pazarlama iletişimi izni var
              </label>
            </div>
          </>
        )}
        {kind === "address" && (
          <>
            <div className="form-grid">
              <FormField label="Adres etiketi">
                <input
                  name="label"
                  required
                  minLength={2}
                  defaultValue={address?.label}
                />
              </FormField>
              <FormField label="Adres tipi">
                <select name="type" defaultValue={address?.type ?? "SERVICE"}>
                  <option value="SERVICE">Servis</option>
                  <option value="BILLING">Fatura</option>
                  <option value="BOTH">Fatura + Servis</option>
                </select>
              </FormField>
            </div>
            <FormField label="Açık adres">
              <input
                name="line1"
                required
                minLength={5}
                defaultValue={address?.line1}
              />
            </FormField>
            <div className="form-grid">
              <FormField label="İlçe">
                <input
                  name="district"
                  required
                  defaultValue={address?.district}
                />
              </FormField>
              <FormField label="İl">
                <input
                  name="city"
                  required
                  defaultValue={address?.city ?? "Antalya"}
                />
              </FormField>
            </div>
            <div className="form-grid">
              <FormField label="Site / tesis">
                <input name="siteName" defaultValue={address?.siteName ?? ""} />
              </FormField>
              <FormField label="Posta kodu">
                <input
                  name="postalCode"
                  defaultValue={address?.postalCode ?? ""}
                />
              </FormField>
            </div>
            <div className="form-grid four">
              <FormField label="Bina">
                <input name="building" defaultValue={address?.building ?? ""} />
              </FormField>
              <FormField label="Blok">
                <input name="block" defaultValue={address?.block ?? ""} />
              </FormField>
              <FormField label="Kat">
                <input name="floor" defaultValue={address?.floor ?? ""} />
              </FormField>
              <FormField label="Bölüm">
                <input name="unit" defaultValue={address?.unit ?? ""} />
              </FormField>
            </div>
            <FormField label="Erişim talimatı">
              <textarea
                name="accessInstructions"
                rows={2}
                defaultValue={address?.accessInstructions ?? ""}
              />
            </FormField>
          </>
        )}
        {kind === "asset" && (
          <>
            <div className="form-grid">
              <FormField label="Cihaz adı">
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={asset?.name}
                />
              </FormField>
              <FormField label="Kategori">
                <input
                  name="category"
                  required
                  minLength={2}
                  defaultValue={asset?.category}
                />
              </FormField>
            </div>
            <FormField label="Servis adresi">
              <select name="addressId" defaultValue={asset?.addressId ?? ""}>
                <option value="">Adres seçilmedi</option>
                {customer.addresses
                  .filter((entry) => entry.active)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
              </select>
            </FormField>
            <div className="form-grid">
              <FormField label="Marka">
                <input name="brand" defaultValue={asset?.brand ?? ""} />
              </FormField>
              <FormField label="Model">
                <input name="model" defaultValue={asset?.model ?? ""} />
              </FormField>
            </div>
            <FormField label="Seri numarası">
              <input
                name="serialNumber"
                defaultValue={asset?.serialNumber ?? ""}
              />
            </FormField>
            <div className="form-grid">
              <FormField label="Kurulum tarihi">
                <input
                  name="installationDate"
                  type="date"
                  defaultValue={asset?.installationDate?.slice(0, 10) ?? ""}
                />
              </FormField>
              <FormField label="Garanti bitişi">
                <input
                  name="warrantyEndsAt"
                  type="date"
                  defaultValue={asset?.warrantyEndsAt?.slice(0, 10) ?? ""}
                />
              </FormField>
            </div>
            <FormField label="Bakım periyodu (gün)">
              <input
                name="maintenanceIntervalDays"
                type="number"
                min={1}
                max={3650}
                defaultValue={asset?.maintenanceIntervalDays ?? ""}
              />
            </FormField>
            <FormField label="Not">
              <textarea
                name="notes"
                rows={2}
                defaultValue={asset?.notes ?? ""}
              />
            </FormField>
          </>
        )}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <ModalActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

function RelatedSection({
  title,
  icon,
  empty,
  add,
  canEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  add: () => void;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <section className="content-card related-card">
      <div className="section-title">
        <h3>
          {icon}
          {title}
        </h3>
        {canEdit && (
          <button onClick={add}>
            <Plus size={15} /> Ekle
          </button>
        )}
      </div>
      <div className="related-list">
        {count ? children : <PanelState kind="empty">{empty}</PanelState>}
      </div>
    </section>
  );
}
function RelatedItem({
  title,
  lines,
  badge,
  edit,
  archive,
}: {
  title: string;
  lines: Array<string | null | undefined>;
  badge?: string;
  edit: () => void;
  archive: () => void;
}) {
  return (
    <article>
      <div>
        <strong>{title}</strong>
        {lines.filter(Boolean).map((line) => (
          <small key={line}>{line}</small>
        ))}
      </div>
      {badge && <StatusBadge>{badge}</StatusBadge>}
      <div className="mini-actions">
        <button onClick={edit} aria-label={`${title} düzenle`}>
          <Edit3 size={14} />
        </button>
        <button onClick={archive} aria-label={`${title} arşivle`}>
          <Archive size={14} />
        </button>
      </div>
    </article>
  );
}
function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="entity-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="popover-title">
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Pencereyi kapat">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={error ? "form-field invalid" : "form-field"}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
function ModalActions({
  onClose,
  busy,
}: {
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <div className="modal-actions">
      <button type="button" onClick={onClose}>
        İptal
      </button>
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </div>
  );
}
