const API_BASE_URL = (
  window.__ENV__?.BASE_API_URL ||
  import.meta.env.BASE_API_URL ||
  ""
).replace(/\/$/, "");

const LOGIN_URL = `${API_BASE_URL}/auth/login`;
const REFRESH_URL = `${API_BASE_URL}/auth/refresh`;

let refreshPromise = null;

export async function loginRequest(email, password) {
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("Login failed. Please verify your credentials.");
  }

  return response.json();
}

export function saveAuthSession(data) {
  if (data?.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
  }
  if (data?.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }
  if (data?.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const rawUser = localStorage.getItem("user");
  return rawUser ? JSON.parse(rawUser) : null;
}

export function hasAccessToken() {
  return Boolean(
    localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"),
  );
}

export function getAccessToken() {
  return localStorage.getItem("accessToken") || "";
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken") || "";
}

export function hasRefreshToken() {
  return Boolean(localStorage.getItem("refreshToken"));
}

export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token, bufferSeconds = 30) {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return false;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime + bufferSeconds;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    redirectToLogin();
    throw new Error("No refresh token available. Please log in.");
  }

  refreshPromise = (async () => {
    try {
      let response;
      try {
        response = await fetch(REFRESH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (networkError) {
        throw new Error(
          "Network error during token refresh: " + networkError.message,
          { cause: networkError },
        );
      }

      if (response.status === 401 || response.status === 403) {
        clearAuthSession();
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(`Token refresh failed with status ${response.status}`);
      }

      const payload = await response.json();
      const newAccessToken =
        payload?.accessToken ||
        payload?.token ||
        payload?.data?.accessToken ||
        payload?.data?.token;

      if (!newAccessToken) {
        throw new Error("Refresh endpoint did not return an access token.");
      }

      localStorage.setItem("accessToken", newAccessToken);

      const newRefreshToken =
        payload?.refreshToken ||
        payload?.refresh_token ||
        payload?.data?.refreshToken ||
        payload?.data?.refresh_token;
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken);
      }

      if (payload?.user) {
        localStorage.setItem("user", JSON.stringify(payload.user));
      }

      return newAccessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getValidAccessToken() {
  let token = getAccessToken();
  if (!token && hasRefreshToken()) {
    try {
      token = await refreshAccessToken();
    } catch {
      return "";
    }
  } else if (token && isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch {
      return "";
    }
  }
  return token;
}

export async function authFetch(url, options = {}) {
  let token = getAccessToken();

  if (!token && hasRefreshToken()) {
    try {
      token = await refreshAccessToken();
    } catch {
      // Refresh failed, proceed to let the server or caller handle response
    }
  } else if (token && isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch {
      // Refresh failed, proceed with existing token
    }
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized and we have a refresh token, try refreshing and retrying once
  if (response.status === 401 && hasRefreshToken()) {
    try {
      const newToken = await refreshAccessToken();
      const retryHeaders = new Headers(options.headers || {});
      if (!retryHeaders.has("Accept")) {
        retryHeaders.set("Accept", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${newToken}`);

      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    } catch {
      return response;
    }
  }

  return response;
}
