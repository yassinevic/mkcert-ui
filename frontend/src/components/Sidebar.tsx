import { NavLink } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  Settings,
  Award,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getStatus } from "../services/api";
import { useTheme } from "../hooks/useTheme";
import "./Sidebar.css";

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState<{
    installed: boolean;
    path: string;
  } | null>(null);

  useEffect(() => {
    getStatus()
      .then((data) => {
        setStatus({
          installed: data.installed,
          path: data.root_ca || "Not installed",
        });
      })
      .catch(() => {
        setStatus({ installed: false, path: "Error connecting" });
      });
  }, []);

  const links = [
    { to: "/", icon: FileText, label: "Certificates" },
    { to: "/authorities", icon: Award, label: "Authorities" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={20} />
        </div>
        <h1>mkcert UI</h1>
      </div>
      <nav>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <link.icon size={18} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>

        <div className="ca-status">
          <div className="ca-status-header">
            <div
              className={`ca-status-dot ${status?.installed ? "installed" : "not-installed"}`}
            />
            <span className="ca-status-label">ROOT CA STATUS</span>
          </div>
          <p className="ca-status-info">
            {status?.path || "Checking status..."}
          </p>
        </div>
      </div>
    </aside>
  );
}
