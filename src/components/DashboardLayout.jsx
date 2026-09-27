import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import heroImg from "../assets/hero.png";
import { clearAuthSession, getStoredUser } from "../services/auth";
import { useTheme } from "../context/ThemeContext";

const menuItems = [
  {
    label: "Monetary Contribution",
    path: "/dashboard",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    label: "Rental Rooms",
    path: "/dashboard/rentals",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Projects",
    path: "/dashboard/projects",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    label: "Reservations",
    path: "/dashboard/reservations",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Reports",
    path: "/dashboard/reports",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Settings",
    path: "/dashboard/settings",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function DashboardLayout({ title, kicker = "Phoenix", children, footerNote }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const confirmLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const userInitials = (user?.name || "U")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="dashboard-shell">
      {/* Mobile Top Navigation Bar */}
      <header className="dashboard-mobile-bar">
        <div className="mobile-brand">
          <span className="mobile-brand-mark" aria-hidden="true">
            <img src={heroImg} alt="" />
          </span>
          <span className="mobile-brand-title">Phoenix</span>
        </div>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen ? (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        />
      ) : null}

      {/* Vertical Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {/* Top: Logo & Brand */}
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <img src={heroImg} alt="" />
          </span>
          <div className="sidebar-brand-text">
            <strong>Phoenix</strong>
            <small>Workspace</small>
          </div>
        </div>

        {/* Middle: Stacked Navigation Links */}
        <nav className="sidebar-nav">
          <p className="sidebar-title">Menu</p>
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/dashboard"}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link active" : "sidebar-link"
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom: User/Account Section */}
        <div className="sidebar-account">
          <div className="sidebar-user-info">
            <span className="sidebar-user-avatar" aria-hidden="true">
              {userInitials}
            </span>
            <div className="sidebar-user-meta">
              <p className="sidebar-user-name" title={user?.name || "User"}>
                {user?.name || "User"}
              </p>
              <p
                className="sidebar-user-role"
                title={user?.email || "Workspace Member"}
              >
                {user?.email || "Workspace Member"}
              </p>
            </div>
          </div>
          <div className="sidebar-account-actions">
            <button
              type="button"
              className="sidebar-theme-btn"
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {resolvedTheme === "dark" ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="sidebar-logout-btn"
              title="Sign out"
              aria-label="Logout"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        <header className="dashboard-main-header">
          <div className="dashboard-header-title">
            <p className="hero-kicker">{kicker}</p>
            <h1>{title}</h1>
          </div>
          <div className="dashboard-header-right">
            <span className="dashboard-date-badge">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </header>

        <section className="dashboard-content">{children}</section>

        <footer className="dashboard-footer">
          <p>Since 2026</p>
          <p>{footerNote || `${title} workspace`}</p>
        </footer>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">Confirm action</p>
            <h3 id="logout-dialog-title">Logout</h3>
            <p className="confirm-copy">
              Are you sure you want to logout from this session?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-primary"
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardLayout;
