import { authFetch } from "./auth";

const API_BASE_URL = (
  window.__ENV__?.BASE_API_URL ||
  import.meta.env.BASE_API_URL ||
  ""
).replace(/\/$/, "");

const PROJECTS_API_BASE = `${API_BASE_URL}/projects`;

function authHeaders(accessToken) {
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function fetchProjects(accessToken, options = {}) {
  const { offset = 0, limit = 25, status = "" } = options;
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  if (status && status !== "all") {
    query.set("status", status);
  }

  let response;
  try {
    response = await authFetch(`${PROJECTS_API_BASE}?${query}`, {
      headers: authHeaders(accessToken),
    });
  } catch (error) {
    if (
      error?.message?.includes("Session expired") ||
      error?.message?.includes("log in")
    ) {
      throw error;
    }
    throw new Error(
      "Unable to reach the server. The API may be rate-limited — please wait a moment and try again.",
      { cause: error },
    );
  }

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to load projects list.");
  }

  const payload = await response.json();
  const projects = Array.isArray(payload?.projects)
    ? payload.projects
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    projects,
    total: payload?.total ?? projects.length,
    limit: payload?.limit ?? limit,
    offset: payload?.offset ?? offset,
  };
}

export async function fetchProject(accessToken, projectId) {
  let response;
  try {
    response = await authFetch(`${PROJECTS_API_BASE}/${projectId}`, {
      headers: authHeaders(accessToken),
    });
  } catch (error) {
    if (
      error?.message?.includes("Session expired") ||
      error?.message?.includes("log in")
    ) {
      throw error;
    }
    throw new Error(
      "Unable to reach the server. The API may be rate-limited — please wait a moment and try again.",
      { cause: error },
    );
  }

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to load project details.");
  }

  const payload = await response.json();
  return payload?.project || payload?.data || payload;
}

export async function createProject(accessToken, projectData) {
  let response;
  try {
    response = await authFetch(PROJECTS_API_BASE, {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });
  } catch (error) {
    if (
      error?.message?.includes("Session expired") ||
      error?.message?.includes("log in")
    ) {
      throw error;
    }
    throw new Error(
      "Unable to reach the server. The API may be rate-limited — please wait a moment and try again.",
      { cause: error },
    );
  }

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ||
        "Unable to create project. Please verify the information and try again.",
    );
  }

  const payload = await response.json();
  return payload?.project || payload?.data || payload;
}
