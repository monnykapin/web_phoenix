import { useState } from "react";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.7 5.9A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.4 17.4 0 0 1-3.3 4M6.2 8.1A17.3 17.3 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onLogin(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in at the moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <header className="login-form-header">
        <p className="hero-kicker">Account access</p>
        <h2>Sign in</h2>
        <p className="login-form-subtext">
          Use your work email and password to open the Phoenix Dashboard.
        </p>
      </header>

      <div className="login-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "login-error" : undefined}
          required
        />
      </div>

      <div className="login-field">
        <label htmlFor="password">Password</label>
        <div className="login-password">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
          <button
            type="button"
            className="login-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="form-error" id="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="login-submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="login-form-note">
        Trouble signing in? Ask your workspace administrator to reset your access.
      </p>
    </form>
  );
}

export default LoginForm;
