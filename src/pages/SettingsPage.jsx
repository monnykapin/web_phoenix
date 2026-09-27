import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../context/ThemeContext";
import { getStoredUser } from "../services/auth";

function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const user = getStoredUser();

  const themes = [
    {
      id: "light",
      label: "Light Mode",
      desc: "Bright, crisp appearance with clean contrast.",
      icon: (
        <svg
          width="24"
          height="24"
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
      ),
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Low-light dark palette that reduces eye strain.",
      icon: (
        <svg
          width="24"
          height="24"
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
      ),
    },
    {
      id: "system",
      label: "System Default",
      desc: "Automatically adjusts based on your device preferences.",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Settings"
      kicker="Preferences"
      footerNote="Workspace configuration panel"
    >
      <section className="dashboard-card settings-card">
        <header className="settings-header">
          <div>
            <h2>Settings & Preferences</h2>
            <p className="hero-subtext">
              Manage your workspace appearance, theme, and account settings.
            </p>
          </div>
        </header>

        {/* Theme Settings Section */}
        <div className="settings-section">
          <div className="settings-section-title">
            <span className="settings-badge">Theme</span>
            <h3>Appearance</h3>
            <p className="settings-copy">
              Select your interface theme. Your preference is automatically
              saved and applied across your sessions.
            </p>
          </div>

          <div className="theme-options-grid">
            {themes.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`theme-option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setTheme(item.id)}
                >
                  <div className="theme-card-icon-wrap">
                    {item.icon}
                    {isSelected ? (
                      <span className="theme-check-badge" aria-hidden="true">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : null}
                  </div>
                  <div className="theme-card-text">
                    <strong className="theme-card-title">{item.label}</strong>
                    <span className="theme-card-desc">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="theme-status-bar">
            <span className="theme-status-dot" />
            <span>
              Active mode:{" "}
              <strong>
                {resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)}
              </strong>{" "}
              {theme === "system"
                ? "(synced with system)"
                : "(manual preference)"}
            </span>
          </div>
        </div>

        {/* Account Details Section */}
        <div className="settings-section" style={{ marginTop: "32px" }}>
          <div className="settings-section-title">
            <span className="settings-badge">Session</span>
            <h3>Account & Workspace</h3>
            <p className="settings-copy">
              Current authenticated session and workspace details.
            </p>
          </div>

          <div className="settings-account-panel">
            <div className="settings-row">
              <span className="settings-label">User Name:</span>
              <span className="settings-value">
                {user?.name || "Phoenix User"}
              </span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Email:</span>
              <span className="settings-value">
                {user?.email || "user@workspace.com"}
              </span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Role:</span>
              <span className="settings-value">
                {user?.role || "Administrator"}
              </span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Application:</span>
              <span className="settings-value">Phoenix Workspace v1.0.0</span>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default SettingsPage;
