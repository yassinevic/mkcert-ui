import { Archive as ArchiveIcon } from "lucide-react";
import { t } from "../i18n";
import "./Page.css";

export function Archive() {
  return (
    <div className="page-content">
      <header className="page-header">
        <h1>{t("archive.title")}</h1>
        <p className="subtitle">{t("archive.subtitle")}</p>
      </header>
      <div
        className="glass-panel"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <ArchiveIcon size={48} color="var(--text-muted)" />
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          {t("archive.comingSoon")}
        </p>
      </div>
    </div>
  );
}
