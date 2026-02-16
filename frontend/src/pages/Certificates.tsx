import { useEffect, useState } from "react";
import {
  getCertificates,
  createCertificate,
  deleteCertificate,
  renewCertificate,
} from "../services/api";
import {
  downloadAllCertificates,
  downloadCertificate,
} from "../services/download";
import { getApiErrorMessage } from "../services/errors";
import { t } from "../i18n";
import { useTerminal } from "../hooks/useTerminal";
import {
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "./Certificates.css";

interface Certificate {
  id: number;
  name: string;
  domains: string;
  created_at: string;
  expires_at: string | null;
  status: string;
  path_cert: string;
  path_key: string;
}

export function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { addMessage } = useTerminal();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "healthy" | "expiring" | "expired"
  >("all");

  const loadCerts = async () => {
    try {
      const data = await getCertificates();
      setCerts(data);
    } catch (error) {
      console.error(t("certificates.errors.load"), error);
    }
  };

  useEffect(() => {
    loadCerts();
  }, []);

  const handleAddDomain = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && domainInput.trim()) {
      e.preventDefault();
      if (!domains.includes(domainInput.trim())) {
        setDomains([...domains, domainInput.trim()]);
      }
      setDomainInput("");
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const handleCreate = async () => {
    const finalDomains = [...domains];
    if (domainInput.trim() && !finalDomains.includes(domainInput.trim())) {
      finalDomains.push(domainInput.trim());
    }

    if (finalDomains.length === 0) {
      alert(t("certificates.alerts.enterDomain"));
      return;
    }

    setLoading(true);
    addMessage(
      t("certificates.terminal.createCommand", {
        domains: finalDomains.join(" "),
      }),
      "command",
    );
    addMessage(
      t("certificates.terminal.creating", {
        domains: finalDomains.join(", "),
      }),
    );

    try {
      await createCertificate(finalDomains, finalDomains[0]);
      const plural = finalDomains.length > 1 ? "s" : "";
      addMessage(t("certificates.terminal.createSuccess"), "success");
      addMessage(
        t("certificates.terminal.validFor", {
          count: finalDomains.length,
          plural,
        }),
      );
      setShowModal(false);
      setDomains([]);
      setDomainInput("");
      await loadCerts();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage(t("certificates.terminal.createFail"), "error");
      addMessage(
        t("certificates.terminal.error", { error: errorMessage }),
        "error",
      );
      alert(t("certificates.alerts.createFail", { error: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (id: number, name: string) => {
    setLoading(true);
    addMessage(
      t("certificates.terminal.renewCommand", { name }),
      "command",
    );
    addMessage(t("certificates.terminal.renewing", { name }));

    try {
      await renewCertificate(id);
      addMessage(t("certificates.terminal.renewSuccess"), "success");
      await loadCerts();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage(t("certificates.terminal.renewFail"), "error");
      addMessage(
        t("certificates.terminal.error", { error: errorMessage }),
        "error",
      );
      alert(t("certificates.alerts.renewFail", { error: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id: number) => {
    downloadCertificate(id);
  };

  const handleDownloadAll = async () => {
    addMessage(t("certificates.terminal.exportAllCommand"), "command");
    addMessage(t("certificates.terminal.exportingAll"));

    try {
      const { filename } = await downloadAllCertificates();
      addMessage(
        t("certificates.terminal.exportStarted", { filename }),
        "success",
      );
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage(t("certificates.terminal.exportFail"), "error");
      addMessage(
        t("certificates.terminal.error", { error: errorMessage }),
        "error",
      );
      alert(t("certificates.alerts.exportFail", { error: errorMessage }));
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(t("certificates.confirm.delete", { name }))
    )
      return;
    addMessage(
      t("certificates.terminal.deleteCommand", { name }),
      "command",
    );
    addMessage(t("certificates.terminal.deleting", { name }));
    try {
      await deleteCertificate(id);
      addMessage(t("certificates.terminal.deleteSuccess"), "success");
      await loadCerts();
    } catch {
      addMessage(t("certificates.terminal.deleteFail"), "error");
      alert(t("certificates.alerts.deleteFail"));
    }
  };

  const getCertStatus = (
    expires_at: string | null,
  ): {
    type: "expired" | "expiring" | "healthy";
    label: string;
    daysLeft: number;
    percentage: number;
  } => {
    if (!expires_at) {
      return {
        type: "expired",
        label: t("certificates.status.unknown"),
        daysLeft: 0,
        percentage: 0,
      };
    }

    const expiry = new Date(expires_at);
    const created = new Date();
    created.setMonth(created.getMonth() - 27); // Approximate
    const now = new Date();

    const totalTime = expiry.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const percentage = Math.max(
      0,
      Math.min(100, ((totalTime - elapsed) / totalTime) * 100),
    );
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0)
      return {
        type: "expired",
        label: t("certificates.status.expired"),
        daysLeft: daysUntilExpiry,
        percentage: 0,
      };
    if (daysUntilExpiry < 30)
      return {
        type: "expiring",
        label: t("certificates.status.expiring"),
        daysLeft: daysUntilExpiry,
        percentage,
      };
    return {
      type: "healthy",
      label: t("certificates.status.healthy"),
      daysLeft: daysUntilExpiry,
      percentage,
    };
  };

  const filteredCerts = certs.filter((cert) => {
    const status = getCertStatus(cert.expires_at);
    const matchesSearch =
      cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.domains.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && status.type === statusFilter;
  });

  return (
    <div className="certificates-page">
      <div className="page-header">
        <div className="header-top">
          <div className="header-title">
            <h1>{t("certificates.title")}</h1>
            <p>{t("certificates.subtitle")}</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleDownloadAll}>
              <Download size={18} /> {t("certificates.exportAll")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> {t("certificates.createNew")}
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t("certificates.searchPlaceholder")}
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button
              className={`pill-btn ${statusFilter === "all" ? "active all" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              {t("certificates.filter.all")}
            </button>
            <button
              className={`pill-btn ${statusFilter === "healthy" ? "active healthy" : ""}`}
              onClick={() => setStatusFilter("healthy")}
            >
              {t("certificates.filter.healthy")}
            </button>
            <button
              className={`pill-btn ${statusFilter === "expiring" ? "active expiring" : ""}`}
              onClick={() => setStatusFilter("expiring")}
            >
              {t("certificates.filter.expiring")}
            </button>
            <button
              className={`pill-btn ${statusFilter === "expired" ? "active expired" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              {t("certificates.filter.expired")}
            </button>
          </div>
          <button className="icon-btn" onClick={loadCerts}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="cert-grid">
          {filteredCerts.map((cert) => {
            const domainList = JSON.parse(cert.domains);
            const status = getCertStatus(cert.expires_at);
            return (
              <div key={cert.id} className={`cert-card ${status.type}`}>
                <div className="card-header">
                  <div className={`status-icon-wrapper ${status.type}`}>
                    {status.type === "expired" ? (
                      <AlertCircle size={22} className="text-danger" />
                    ) : status.type === "expiring" ? (
                      <AlertTriangle size={22} className="text-warning" />
                    ) : (
                      <CheckCircle2 size={22} className="text-success" />
                    )}
                  </div>
                  <div className="card-status-info">
                    <span className="status-label-top">
                      {t("certificates.status.label")}
                    </span>
                    <span className={`status-pill ${status.type}`}>
                      <span className="status-dot"></span>
                      {status.label.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="card-action-btn"
                    onClick={() => handleRenew(cert.id, cert.name)}
                    disabled={loading}
                    title={t("certificates.actions.renew")}
                  >
                    <RefreshCw
                      size={20}
                      className={loading ? "animate-spin" : ""}
                    />
                    <span>{t("certificates.actions.renew")}</span>
                  </button>
                  <button
                    className="card-action-btn"
                    onClick={() => handleDownload(cert.id)}
                    title={t("certificates.actions.export")}
                  >
                    <Download size={20} />
                    <span>{t("certificates.actions.export")}</span>
                  </button>
                  <button
                    className="card-action-btn danger"
                    onClick={() => handleDelete(cert.id, cert.name)}
                    title={t("certificates.actions.delete")}
                  >
                    <Trash2 size={20} />
                    <span>{t("certificates.actions.delete")}</span>
                  </button>
                </div>

                <div className="card-body">
                  <h3 className="domain-title">{cert.name}</h3>
                  <p className="domain-subtitle">{domainList.join(", ")}</p>

                  <div className="cert-info">
                    <div className="info-row">
                      <span className="info-label">
                        {status.type === "expired"
                          ? t("certificates.validity.expiredOn")
                          : t("certificates.validity.validUntil")}
                      </span>
                      <span className={`info-value ${status.type}`}>
                        {status.daysLeft >= 0
                          ? t("certificates.validity.inDays", {
                              days: status.daysLeft,
                            })
                          : t("certificates.validity.daysAgo", {
                              days: Math.abs(status.daysLeft),
                            })}
                      </span>
                    </div>
                  </div>

                  <div className="validity-bar">
                    <div
                      className={`validity-progress ${status.type}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">
                <ShieldCheck size={22} />
              </div>
              <div className="modal-title">
                <h2>{t("certificates.modal.title")}</h2>
                <p>{t("certificates.modal.subtitle")}</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  {t("certificates.modal.domainsLabel")}
                </label>
                <div className="tag-input-container">
                  {domains.map((d) => (
                    <span key={d} className="tag">
                      {d}
                      <button onClick={() => handleRemoveDomain(d)}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="tag-input"
                    placeholder={t("certificates.modal.addDomainPlaceholder")}
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={handleAddDomain}
                  />
                </div>
              </div>
              <div className="info-callout">
                <div className="info-callout-icon">
                  <Info size={20} />
                </div>
                <div className="info-callout-content">
                  <h4>{t("certificates.modal.trustTitle")}</h4>
                  <p>{t("certificates.modal.trustBody")}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                {t("certificates.modal.cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading
                  ? t("certificates.modal.generating")
                  : t("certificates.modal.generate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
