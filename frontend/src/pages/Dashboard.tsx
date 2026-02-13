import { useEffect, useState } from "react";
import { getCertificates } from "../services/api";
import { ShieldCheck, Clock } from "lucide-react";
import "./Page.css";

export function Dashboard() {
  const [stats, setStats] = useState({ total: 0, expiring: 0, valid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const certs = await getCertificates();
        const now = new Date();
        const expiring = certs.filter((c: { expires_at: string }) => {
          if (!c.expires_at) return false;
          const exp = new Date(c.expires_at);
          const days = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
          return days < 30 && days > 0;
        }).length;

        setStats({
          total: certs.length,
          expiring,
          valid: certs.length, // simplified for MVP
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Overview of your local certificates</p>
      </header>

      <div className="grid-cards">
        <div className="card glass-panel stat-card">
          <div className="icon-wrapper glass-icon">
            <ShieldCheck size={32} color="var(--accent-success)" />
          </div>
          <div className="stat-info">
            <h3>Total Certificates</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>

        <div className="card glass-panel stat-card">
          <div className="icon-wrapper glass-icon warning">
            <Clock size={32} color="var(--accent-warning)" />
          </div>
          <div className="stat-info">
            <h3>Expiring Soon</h3>
            <p className="stat-value">{stats.expiring}</p>
          </div>
        </div>
      </div>

      {loading && (
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Loading data...
        </p>
      )}

      {/* Recent Activity or Quick Actions could go here */}
    </div>
  );
}
