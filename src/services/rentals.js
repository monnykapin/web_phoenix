import { authFetch } from "./auth";

const API_BASE_URL = (
  window.__ENV__?.BASE_API_URL ||
  import.meta.env.BASE_API_URL ||
  ""
).replace(/\/$/, "");
const RENTALS_API_BASE = `${API_BASE_URL}/rentals`;

function authHeaders(accessToken) {
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function normalizeRental(payload) {
  return payload?.rental || payload?.data || payload;
}

export async function fetchRentals(accessToken, options = {}) {
  const { offset = 0, limit = 10, status = "", month = "" } = options;
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  if (status) {
    query.set("status", status);
  }

  if (month) {
    query.set("month", month);
  }

  let response;
  try {
    response = await authFetch(`${RENTALS_API_BASE}?${query}`, {
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
    throw new Error("Unable to load rentals list.");
  }

  const payload = await response.json();
  const rentals = Array.isArray(payload?.rentals)
    ? payload.rentals
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    rentals,
    total: payload?.total ?? rentals.length,
    limit: payload?.limit ?? limit,
    offset: payload?.offset ?? offset,
    stats: payload?.stats ?? null,
  };
}

export async function fetchRental(accessToken, rentalId) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Unable to load rental details.");
  }

  return normalizeRental(await response.json());
}

export async function fetchRentalStatus(accessToken, rentalId) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}/status`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Unable to load rental status.");
  }

  const payload = await response.json();
  if (typeof payload === "string") return payload;
  return payload?.status ?? payload?.paymentStatus ?? payload?.data ?? payload;
}

export async function updateRentalStatus(accessToken, rentalId, status) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}/status`, {
    method: "PUT",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Unable to update rental status.");
  }

  const payload = await response.json();
  return payload?.rental || payload?.data || payload;
}

export async function createRental(accessToken, rentalData) {
  const response = await authFetch(RENTALS_API_BASE, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rentalData),
  });

  if (!response.ok) {
    throw new Error("Unable to create rental.");
  }

  return normalizeRental(await response.json());
}

export async function updateRental(accessToken, rentalId, rentalData) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}`, {
    method: "PUT",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rentalData),
  });

  if (!response.ok) {
    throw new Error("Unable to update rental.");
  }

  return normalizeRental(await response.json());
}

export async function recordRentalPayment(
  accessToken,
  rentalId,
  paymentData = {},
) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}/payments`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    throw new Error("Unable to record payment.");
  }

  return normalizeRental(await response.json());
}

export async function fetchRentalStats(accessToken) {
  const response = await authFetch(`${RENTALS_API_BASE}/stats`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Unable to load rental stats.");
  }

  return response.json();
}

export async function deleteRental(accessToken, rentalId) {
  const response = await authFetch(`${RENTALS_API_BASE}/${rentalId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Unable to delete rental.");
  }

  return true;
}
