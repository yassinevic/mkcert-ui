import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { FileText, Award, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getStatus } from "../services/api";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { t, type Locale } from "../i18n";
import "./Sidebar.css";

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const [status, setStatus] = useState<{
    installed: boolean;
    path: string;
  } | null>(null);

  useEffect(() => {
    getStatus()
      .then((data) => {
        setStatus({
          installed: data.installed,
          path: data.root_ca || t("sidebar.status.notInstalled"),
        });
      })
      .catch(() => {
        setStatus({ installed: false, path: t("sidebar.status.errorConnecting") });
      });
  }, [locale]);

  const links = [
    { to: "/", icon: FileText, label: t("sidebar.links.certificates") },
    { to: "/authorities", icon: Award, label: t("sidebar.links.authorities") },
  ];

  const nextTheme = theme === "light" ? "dark" : "light";
  const nextThemeLabel =
    nextTheme === "light"
      ? t("sidebar.mode.light")
      : t("sidebar.mode.dark");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Logo size={32} />
        </div>
        <h1>{t("sidebar.brand")}</h1>
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
        <div className="locale-switcher">
          <label className="locale-label" htmlFor="locale-select">
            {t("sidebar.language.label")}
          </label>
          <select
            id="locale-select"
            className="locale-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="en">{t("sidebar.language.en")}</option>
            <option value="fr">{t("sidebar.language.fr")}</option>
            <option value="ar">{t("sidebar.language.ar")}</option>
          </select>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={t("sidebar.themeToggle", { mode: nextThemeLabel })}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          <span>
            {theme === "light"
              ? t("sidebar.mode.darkLabel")
              : t("sidebar.mode.lightLabel")}
          </span>
        </button>

        <div className="ca-status">
          <div className="ca-status-header">
            <div
              className={`ca-status-dot ${status?.installed ? "installed" : "not-installed"}`}
            />
            <span className="ca-status-label">
              {t("sidebar.rootStatus")}
            </span>
          </div>
          <p className="ca-status-info">
            {status?.path || t("sidebar.status.checking")}
          </p>
        </div>
      </div>
    </aside>
  );
}
