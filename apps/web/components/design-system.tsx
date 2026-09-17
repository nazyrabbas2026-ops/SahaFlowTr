import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function PanelState({
  kind,
  children,
}: {
  kind: "loading" | "empty" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`panel-state ${kind}`}
      role={kind === "error" ? "alert" : undefined}
    >
      {kind === "loading" ? (
        <LoaderCircle className="spin" size={19} />
      ) : kind === "error" ? (
        <AlertCircle size={19} />
      ) : null}
      <span>{children}</span>
    </div>
  );
}
