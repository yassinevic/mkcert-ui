import { useEffect, useState } from "react";
import {
  getStatus,
  installCA,
  uninstallCA,
  getCADownloadUrl,
} from "../services/api";
import { useTerminal } from "../hooks/useTerminal";
import { t } from "../i18n";
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
      console.error(t("authorities.errors.load"), error);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleInstall = async () => {
    setLoading(true);
    addMessage(t("authorities.terminal.installCommand"), "command");
    addMessage(t("authorities.terminal.installing"));
    try {
      await installCA();
      await loadStatus();
      addMessage(t("authorities.terminal.installSuccess"), "success");
      alert(t("authorities.alerts.installSuccess"));
    } catch (error) {
      addMessage(t("authorities.terminal.installFail"), "error");
      console.error(t("authorities.errors.install"), error);
      alert(t("authorities.alerts.installFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (
      !confirm(
        t("authorities.confirm.uninstall"),
      )
    )
      return;
    setLoading(true);
    addMessage(t("authorities.terminal.uninstallCommand"), "command");
    addMessage(t("authorities.terminal.uninstalling"));
    try {
      await uninstallCA();
      await loadStatus();
      addMessage(t("authorities.terminal.uninstallSuccess"), "success");
      alert(t("authorities.alerts.uninstallSuccess"));
    } catch (error) {
      addMessage(t("authorities.terminal.uninstallFail"), "error");
      console.error(t("authorities.errors.uninstall"), error);
      alert(t("authorities.alerts.uninstallFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = getCADownloadUrl();
  };

  if (!status)
    return <div className="loading">{t("authorities.loading")}</div>;

  return (
    <div className="authorities-page">
      <div className="page-header">
        <div className="header-title">
          <h1>{t("authorities.title")}</h1>
          <p>{t("authorities.subtitle")}</p>
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
          {status.installed
            ? t("authorities.installed")
            : t("authorities.install")}
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
                  <h3>{t("authorities.caTitle")}</h3>
                  <p>
                    {t("authorities.trustStore.label", {
                      status: status.installed
                        ? t("authorities.trustStore.verified")
                        : t("authorities.trustStore.notFound"),
                    })}
                  </p>
                </div>
                <div className="ca-status-pill">
                  <span
                    className={`pill ${status.installed ? "success" : "error"}`}
                  >
                    {status.installed
                      ? t("authorities.status.active")
                      : t("authorities.status.inactive")}
                  </span>
                </div>
              </div>

              <div className="ca-details">
                <div className="detail-item">
                  <Folder size={16} />
                  <div className="detail-text">
                    <label>{t("authorities.storageLocation")}</label>
                    <code>{status.root_ca || t("common.na")}</code>
                  </div>
                  <button
                    className="icon-btn-sm"
                    onClick={() =>
                      alert(t("authorities.openFolderUnsupported"))
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
                    <span>{t("authorities.trustedByBrowsers")}</span>
                  </div>
                  <div className="ca-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownload}
                      title={t("authorities.downloadPemTitle")}
                    >
                      <Download size={14} /> {t("authorities.downloadPem")}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleUninstall}
                      disabled={loading}
                      title={t("authorities.uninstallTitle")}
                    >
                      <ShieldOff size={14} /> {t("authorities.uninstall")}
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
              label={t("authorities.stats.engineVersion")}
              value={status.mkcert_version || t("common.notDetected")}
              subValue={t("authorities.stats.engineSub")}
            />
            <StatCard
              icon={Calendar}
              label={t("authorities.stats.signatureAlg")}
              value={t("authorities.stats.signatureValue")}
              subValue={t("authorities.stats.signatureSub")}
            />
            <StatCard
              icon={ShieldCheck}
              label={t("authorities.stats.trustStatus")}
              value={
                status.installed
                  ? t("authorities.stats.trusted")
                  : t("authorities.stats.fixRequired")
              }
              statusColor={status.installed ? "#4caf50" : "#f44336"}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>{t("authorities.systemDetails")}</h3>
          <div className="settings-grid">
            <div className="detail-item">
              <Folder size={16} />
              <div className="detail-text">
                <label>{t("authorities.rootCaLocation")}</label>
                <code>{status.root_ca || t("common.na")}</code>
              </div>
            </div>
            <div className="detail-item">
              <Folder size={16} />
              <div className="detail-text">
                <label>{t("authorities.certStoragePath")}</label>
                <code>{status.cert_path || t("common.na")}</code>
              </div>
            </div>
          </div>
        </div>

        <div className="help-section">
          <h3>
            <Info size={18} /> {t("authorities.helpTitle")}
          </h3>
          <p>{t("authorities.helpBody")}</p>
          <div className="help-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                window.open("https://github.com/FiloSottile/mkcert", "_blank")
              }
            >
              {t("authorities.viewDocs")} <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
