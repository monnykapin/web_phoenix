import heroImg from "../assets/hero.png";

const previewRows = [
  { room: "Room 101", meta: "Due 05 Aug", status: "paid", label: "Paid" },
  { room: "Room 204", meta: "Due 05 Aug", status: "pending", label: "Pending" },
  { room: "Room 312", meta: "Due 01 Aug", status: "overdue", label: "Overdue" },
];

const features = [
  "Rental room tracking",
  "Monetary contributions",
  "Monthly reports",
];

function HeroPanel() {
  return (
    <section className="auth-visual" aria-label="Phoenix Dashboard preview">
      <div className="auth-brand">
        <span className="auth-brand-mark" aria-hidden="true">
          <img src={heroImg} alt="" />
        </span>
        <span className="auth-brand-text">
          <strong>Phoenix</strong>
          <small>Dashboard</small>
        </span>
      </div>

      <div className="auth-visual-copy">
        <p className="hero-kicker">Welcome back</p>
        <h1>Sign in to your workspace</h1>
        <p className="hero-subtext">
          Keep rental rooms, contributions, and payments in one place — built for
          daily operations.
        </p>
      </div>

      <div className="auth-preview" aria-hidden="true">
        <div className="auth-preview-chrome">
          <span className="auth-preview-dot" />
          <span className="auth-preview-dot" />
          <span className="auth-preview-dot" />
          <span className="auth-preview-url">phoenix / rentals</span>
        </div>
        <div className="auth-preview-body">
          <div className="auth-preview-stats">
            <div className="auth-preview-stat">
              <p className="auth-preview-stat-value">128</p>
              <p className="auth-preview-stat-label">Rooms</p>
            </div>
            <div className="auth-preview-stat">
              <p className="auth-preview-stat-value">92%</p>
              <p className="auth-preview-stat-label">Collected</p>
            </div>
            <div className="auth-preview-stat">
              <p className="auth-preview-stat-value">7</p>
              <p className="auth-preview-stat-label">Overdue</p>
            </div>
          </div>

          <ul className="auth-preview-rows">
            {previewRows.map((row) => (
              <li className="auth-preview-row" key={row.room}>
                <span className="auth-preview-room">{row.room}</span>
                <span className="auth-preview-meta">{row.meta}</span>
                <span className={`status-chip status-chip--${row.status}`}>
                  {row.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="auth-features">
        {features.map((feature) => (
          <li key={feature}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HeroPanel;
