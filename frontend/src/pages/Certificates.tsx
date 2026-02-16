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
      console.error("Failed to load certificates:", error);
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
      alert("Please enter at least one domain or IP address");
      return;
    }

    setLoading(true);
    addMessage(`mkcert ${finalDomains.join(" ")}`, "command");
    addMessage(`Creating certificate for: ${finalDomains.join(", ")}...`);

    try {
      await createCertificate(finalDomains, finalDomains[0]);
      addMessage(`✓ Certificate created successfully`, "success");
      addMessage(
        `Valid for ${finalDomains.length} domain${finalDomains.length > 1 ? "s" : ""}`,
      );
      setShowModal(false);
      setDomains([]);
      setDomainInput("");
      await loadCerts();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage(`✗ Failed to create certificate`, "error");
      addMessage(`Error: ${errorMessage}`, "error");
      alert(`Failed to create certificate: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (id: number, name: string) => {
    setLoading(true);
    addMessage(`mkcert -renew ${name}`, "command");
    addMessage(`Renewing certificate for: ${name}...`);

    try {
      await renewCertificate(id);
      addMessage(`✓ Certificate renewed successfully`, "success");
      await loadCerts();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage(`✗ Failed to renew certificate`, "error");
      addMessage(`Error: ${errorMessage}`, "error");
      alert(`Failed to renew certificate: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id: number) => {
    downloadCertificate(id);
  };

  const handleDownloadAll = async () => {
    addMessage("mkcert -export-all", "command");
    addMessage("Exporting all certificates...");

    try {
      const { filename } = await downloadAllCertificates();
      addMessage(`✓ Export download started (${filename})`, "success");
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      addMessage("✗ Failed to export certificates", "error");
      addMessage(`Error: ${errorMessage}`, "error");
      alert(`Failed to export certificates: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(`Are you sure you want to delete the certificate for "${name}"?`)
    )
      return;
    addMessage(`mkcert -delete ${name}`, "command");
    addMessage(`Removing certificate files for ${name}...`);
    try {
      await deleteCertificate(id);
      addMessage(`✓ Certificate deleted successfully`, "success");
      await loadCerts();
    } catch {
      addMessage(`✗ Failed to delete certificate`, "error");
      alert("Failed to delete certificate");
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
      return { type: "expired", label: "Unknown", daysLeft: 0, percentage: 0 };
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
        label: "Expired",
        daysLeft: daysUntilExpiry,
        percentage: 0,
      };
    if (daysUntilExpiry < 30)
      return {
        type: "expiring",
        label: "Expiring",
        daysLeft: daysUntilExpiry,
        percentage,
      };
    return {
      type: "healthy",
      label: "Healthy",
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
            <h1>Certificate Health Overview</h1>
            <p>Visual status tracking for local SSL certificates</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleDownloadAll}>
              <Download size={18} /> Export All
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Create New Certificate
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Filter by domain or name..."
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
              All
            </button>
            <button
              className={`pill-btn ${statusFilter === "healthy" ? "active healthy" : ""}`}
              onClick={() => setStatusFilter("healthy")}
            >
              Healthy
            </button>
            <button
              className={`pill-btn ${statusFilter === "expiring" ? "active expiring" : ""}`}
              onClick={() => setStatusFilter("expiring")}
            >
              Expiring
            </button>
            <button
              className={`pill-btn ${statusFilter === "expired" ? "active expired" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              Expired
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
                    <span className="status-label-top">Status</span>
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
                    title="Renew"
                  >
                    <RefreshCw
                      size={20}
                      className={loading ? "animate-spin" : ""}
                    />
                    <span>Renew</span>
                  </button>
                  <button
                    className="card-action-btn"
                    onClick={() => handleDownload(cert.id)}
                    title="Export"
                  >
                    <Download size={20} />
                    <span>Export</span>
                  </button>
                  <button
                    className="card-action-btn danger"
                    onClick={() => handleDelete(cert.id, cert.name)}
                    title="Delete"
                  >
                    <Trash2 size={20} />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="card-body">
                  <h3 className="domain-title">{cert.name}</h3>
                  <p className="domain-subtitle">{domainList.join(", ")}</p>

                  <div className="cert-info">
                    <div className="info-row">
                      <span className="info-label">
                        {status.type === "expired"
                          ? "Expired on"
                          : "Valid until"}
                      </span>
                      <span className={`info-value ${status.type}`}>
                        {status.daysLeft >= 0
                          ? `In ${status.daysLeft} days`
                          : `${Math.abs(status.daysLeft)} days ago`}
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
                <h2>Create New Certificate</h2>
                <p>Generate locally-trusted SSL certificates.</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Domains / IP Addresses</label>
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
                    placeholder="Add domain..."
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
                  <h4>Local Trust Store Detected</h4>
                  <p>
                    Certificates will be automatically trusted by your system
                    browsers.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
