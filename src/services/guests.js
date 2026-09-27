import { authFetch } from "./auth";

const API_BASE_URL = (
  window.__ENV__?.BASE_API_URL ||
  import.meta.env.BASE_API_URL ||
  ""
).replace(/\/$/, "");
const GUESTS_API_BASE = `${API_BASE_URL}/guests`;

function normalizeGuestsResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.guests)) return payload.guests;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function authHeaders(accessToken) {
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function fetchGuests(accessToken, options = {}) {
  const { offset = 0, limit = 25 } = options;
  const query = new URLSearchParams({
    completed: "false",
    offset: String(offset),
    limit: String(limit),
  });

  const response = await authFetch(`${GUESTS_API_BASE}?${query}`, {
    headers: authHeaders(accessToken),
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to load guests list.");
  }

  return normalizeGuestsResponse(await response.json());
}

export async function updateGuestStatus(accessToken, guestId, status) {
  const response = await authFetch(`${GUESTS_API_BASE}/${guestId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to update guest status.");
  }

  const payload = await response.json();
  return payload?.guest || payload?.data || payload;
}

export async function createGuest(accessToken, guestData) {
  const response = await authFetch(GUESTS_API_BASE, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(guestData),
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to create monetary contribution.");
  }

  const payload = await response.json();
  return payload?.guest || payload?.data || payload;
}

export async function deleteGuest(accessToken, guestId) {
  const response = await authFetch(`${GUESTS_API_BASE}/${guestId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Unable to delete monetary contribution.");
  }

  return true;
}
