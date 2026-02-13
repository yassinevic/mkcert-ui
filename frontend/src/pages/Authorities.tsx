import { useEffect, useState } from "react";
import {
  getStatus,
  installCA,
  uninstallCA,
  getCADownloadUrl,
} from "../services/api";
import { useTerminal } from "../hooks/useTerminal";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Download,
  Folder,
  Cpu,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import "./Authorities.css";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  statusColor?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  statusColor,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrapper">
        <Icon size={20} />
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <div className="stat-value-group">
          <span className="stat-value">{value}</span>
          {statusColor && (
            <div
              className="status-dot"
              style={{ backgroundColor: statusColor }}
            />
          )}
        </div>
        {subValue && <span className="stat-subvalue">{subValue}</span>}
      </div>
    </div>
  );
}

interface CAStatus {
  mkcert_version: string | null;
  root_ca: string | null;
  cert_path: string;
  installed: boolean;
}

export function Authorities() {
  const [status, setStatus] = useState<CAStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { addMessage } = useTerminal();

  const loadStatus = async () => {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      console.error("Failed to load status:", error);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleInstall = async () => {
    setLoading(true);
    addMessage("mkcert -install", "command");
    addMessage("Configuring local CA and system trust stores...");
    try {
      await installCA();
      await loadStatus();
      addMessage("✓ Root CA installed successfully!", "success");
      alert("Root CA installed successfully!");
    } catch (error) {
      addMessage("✗ Installation failed", "error");
      console.error("Installation failed:", error);
      alert("Failed to install CA. Please check terminal for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (
      !confirm(
        "Are you sure you want to uninstall the local CA? This will make all existing local certificates untrusted.",
      )
    )
      return;
    setLoading(true);
    addMessage("mkcert -uninstall", "command");
    addMessage("Removing local CA from system trust stores...");
    try {
      await uninstallCA();
      await loadStatus();
      addMessage("✓ Root CA uninstalled successfully", "success");
      alert("Root CA uninstalled successfully.");
    } catch (error) {
      addMessage("✗ Uninstallation failed", "error");
      console.error("Uninstallation failed:", error);
      alert("Failed to uninstall CA.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = getCADownloadUrl();
  };

  if (!status) return <div className="loading">Loading Authority data...</div>;

  return (
    <div className="authorities-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Certificate Authorities</h1>
          <p>Management and verification of local trusted roots</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleInstall}
          disabled={loading || status.installed}
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <ShieldCheck size={18} />
          )}
          {status.installed ? "Root CA Installed" : "Install Root CA"}
        </button>
      </div>

      <div className="page-content">
        <div className="authorities-grid">
          {/* Main CA Card */}
          <div className="ca-main-info">
            <div className="ca-card">
              <div className="ca-header">
                <div
                  className={`ca-badge ${status.installed ? "success" : "error"}`}
                >
                  {status.installed ? (
                    <ShieldCheck size={24} />
                  ) : (
                    <ShieldAlert size={24} />
                  )}
                </div>
                <div className="ca-title-group">
                  <h3>mkcert local development CA</h3>
                  <p>
                    Trust Store: {status.installed ? "Verified" : "Not Found"}
                  </p>
                </div>
                <div className="ca-status-pill">
                  <span
                    className={`pill ${status.installed ? "success" : "error"}`}
                  >
                    {status.installed ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>

              <div className="ca-details">
                <div className="detail-item">
                  <Folder size={16} />
                  <div className="detail-text">
                    <label>Storage Location</label>
                    <code>{status.root_ca || "N/A"}</code>
                  </div>
                  <button
                    className="icon-btn-sm"
                    onClick={() =>
                      alert("Opening folder not supported in browser")
                    }
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              <div className="ca-footer">
                <div className="footer-top">
                  <div className="validity-indicator">
                    <CheckCircle2 size={16} className="success" />
                    <span>Trusted by System Browsers</span>
                  </div>
                  <div className="ca-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownload}
                      title="Download Root CA Certificate"
                    >
                      <Download size={14} /> Download Pem
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleUninstall}
                      disabled={loading}
                      title="Uninstall Root CA from System Trust Store"
                    >
                      <ShieldOff size={14} /> Uninstall
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="ca-stats-column">
            <StatCard
              icon={Cpu}
              label="Engine Version"
              value={status.mkcert_version || "Not Detected"}
              subValue="CLI Binary found in PATH"
            />
            <StatCard
              icon={Calendar}
              label="Signature Algorithm"
              value="RSA 2048"
              subValue="Standard for local development"
            />
            <StatCard
              icon={ShieldCheck}
              label="Trust Status"
              value={status.installed ? "Fully Trusted" : "Fix Required"}
              statusColor={status.installed ? "#4caf50" : "#f44336"}
            />
          </div>
        </div>

        <div className="help-section">
          <h3>
            <Info size={18} /> How it works
          </h3>
          <p>
            The <code>mkcert</code> authority generates a unique root
            certificate stored on your computer. By installing it, your local
            browsers and operating system will recognize any certificates
            generated through this dashboard as legitimate and secure,
            eliminating "Your connection is not private" errors.
          </p>
          <div className="help-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                window.open("https://github.com/FiloSottile/mkcert", "_blank")
              }
            >
              View Documentation <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
