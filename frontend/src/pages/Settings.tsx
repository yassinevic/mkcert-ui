import { useEffect, useState } from "react";
import { getStatus, installCA } from "../services/api";
import { ShieldCheck, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import "./Certificates.css"; // Reuse the same styling

interface Status {
  mkcert_version: string | null;
  root_ca: string | null;
  cert_path: string;
}

export function Settings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getStatus().then(setStatus).catch(console.error);
  }, []);

  const handleInstall = async () => {
    setLoading(true);
    try {
      await installCA();
      const newStatus = await getStatus();
      setStatus(newStatus);
    } catch {
      alert("Failed to install CA");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="certificates-page">
        <div className="page-header">
          <div className="header-title">
            <h1>Settings</h1>
            <p>Configure mkcert and certificate storage settings</p>
          </div>
        </div>
        <div
          className="page-content"
          style={{ padding: "2rem", textAlign: "center" }}
        >
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="certificates-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Settings</h1>
          <p>Configure mkcert and certificate storage settings</p>
        </div>
      </div>

      <div className="page-content" style={{ padding: "2rem" }}>
        <div style={{ maxWidth: "800px" }}>
          {/* mkcert Status */}
          <div className="info-callout" style={{ marginBottom: "1.5rem" }}>
            <div className="info-callout-icon">
              {status.mkcert_version ? (
                <CheckCircle
                  size={20}
                  style={{ color: "var(--accent-success)" }}
                />
              ) : (
                <AlertCircle
                  size={20}
                  style={{ color: "var(--accent-warning)" }}
                />
              )}
            </div>
            <div className="info-callout-content">
              <h4>mkcert Status</h4>
              <p>
                {status.mkcert_version
                  ? `Installed and ready (${status.mkcert_version})`
                  : "mkcert is not installed or not found in PATH"}
              </p>
            </div>
          </div>

          {/* Root CA Info */}
          {status.root_ca && (
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <ShieldCheck
                  size={20}
                  style={{ color: "var(--accent-primary)" }}
                />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                  Root CA Certificate
                </h3>
              </div>
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                  wordBreak: "break-all",
                }}
              >
                {status.root_ca}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleInstall}
                disabled={loading}
              >
                <RefreshCw size={16} />
                {loading ? "Installing..." : "Re-install Root CA"}
              </button>
            </div>
          )}

          {/* Certificate Path */}
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              Certificate Storage Path
            </h3>
            <p
              style={{
                margin: "0 0 1rem 0",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Location where generated certificates will be stored
            </p>
            <div
              style={{
                background: "var(--bg-card)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                wordBreak: "break-all",
              }}
            >
              {status.cert_path}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
