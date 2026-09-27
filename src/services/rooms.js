import { authFetch } from "./auth";

const API_BASE_URL = (
  window.__ENV__?.BASE_API_URL ||
  import.meta.env.BASE_API_URL ||
  ""
).replace(/\/$/, "");
const ROOMS_API_BASE = `${API_BASE_URL}/rooms`;

function authHeaders(accessToken) {
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function normalizeRooms(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rooms)) return payload.rooms;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export async function fetchRooms(accessToken, options = {}) {
  const { offset = 0, limit = 100 } = options;
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  let response;
  try {
    response = await authFetch(`${ROOMS_API_BASE}?${query}`, {
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
    throw new Error("Unable to load rooms.");
  }

  return normalizeRooms(await response.json());
}

export async function createRoom(accessToken, roomData) {
  let response;
  try {
    response = await authFetch(ROOMS_API_BASE, {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roomData),
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
    throw new Error("Unable to create room.");
  }

  const payload = await response.json();
  return payload?.room || payload?.data || payload;
}
