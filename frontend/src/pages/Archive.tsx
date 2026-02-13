import { Archive as ArchiveIcon } from "lucide-react";
import "./Page.css";

export function Archive() {
  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Archive</h1>
        <p className="subtitle">
          Restore or permanently delete old certificates.
        </p>
      </header>
      <div
        className="glass-panel"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <ArchiveIcon size={48} color="var(--text-muted)" />
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          Archive functionality is coming soon.
        </p>
      </div>
    </div>
  );
}
