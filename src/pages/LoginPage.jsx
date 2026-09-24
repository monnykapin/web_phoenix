import { Navigate, useNavigate } from "react-router-dom";
import HeroPanel from "../components/HeroPanel";
import LoginForm from "../components/LoginForm";
import {
  hasAccessToken,
  loginRequest,
  saveAuthSession,
} from "../services/auth";

function LoginPage() {
  const navigate = useNavigate();

  if (hasAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (email, password) => {
    const data = await loginRequest(email, password);
    saveAuthSession(data);
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="auth-page">
      <HeroPanel />
      <section className="auth-form-panel">
        <LoginForm onLogin={handleLogin} />
      </section>
    </main>
  );
}

export default LoginPage;
