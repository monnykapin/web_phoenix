import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "../lib/toast";
import { useMenuInViewport } from "../lib/popupMenu";
import DashboardLayout from "../components/DashboardLayout";
import { getAccessToken } from "../services/auth";
import {
  createGuest,
  deleteGuest,
  fetchGuests,
  updateGuestStatus,
} from "../services/guests";

function DashboardPage() {
  const pageSize = 25;
  const actionAreaRef = useRef(null);
  const popupMenuRef = useRef(null);
  const [guests, setGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestsError, setGuestsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState("");
  useMenuInViewport(popupMenuRef, actionAreaRef, Boolean(openMenuId));
  const [updatingGuestId, setUpdatingGuestId] = useState("");
  const [deletingGuestId, setDeletingGuestId] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [createGuestError, setCreateGuestError] = useState("");
  const [newGuestForm, setNewGuestForm] = useState({
    guestName: "",
    guestLocation: "",
    amount: "",
    currency: "USD",
    status: "outgoing",
  });

  useEffect(() => {
    let active = true;

    const loadGuests = async () => {
      setLoadingGuests(true);
      setGuestsError("");

      try {
        const accessToken = getAccessToken();
        const guestsData = await fetchGuests(accessToken, {
          offset: (page - 1) * pageSize,
          limit: pageSize,
        });

        if (active) {
          setGuests(guestsData);
          setHasNextPage(guestsData.length === pageSize);
        }
      } catch (error) {
        if (active) {
          setGuestsError(error.message || "Unable to load guests list.");
        }
      } finally {
        if (active) {
          setLoadingGuests(false);
        }
      }
    };

    loadGuests();

    return () => {
      active = false;
    };
  }, [page]);

  useEffect(() => {
    if (!openMenuId) return undefined;

    const handlePointerDown = (event) => {
      if (
        !actionAreaRef.current?.contains(event.target) &&
        !popupMenuRef.current?.contains(event.target)
      ) {
        setOpenMenuId("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [openMenuId]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(
      guests.map((guest) => guest.status).filter(Boolean),
    );

    return ["all", ...statuses];
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return guests.filter((guest) => {
      const searchableFields = [
        guest.guestName,
        guest.guestLocation,
        guest.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableFields.includes(query);
      const matchesStatus =
        statusFilter === "all" || guest.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [guests, searchTerm, statusFilter]);

  const handleUpdateStatus = async (guestId, status) => {
    setUpdatingGuestId(guestId);
    setGuestsError("");

    try {
      const accessToken = getAccessToken();
      const updatedGuest = await updateGuestStatus(
        accessToken,
        guestId,
        status,
      );

      setGuests((currentGuests) =>
        currentGuests.map((guest) =>
          (guest._id || guest.id) === guestId
            ? { ...guest, ...updatedGuest, status }
            : guest,
        ),
      );
      setOpenMenuId("");
      setConfirmAction(null);
      toast.success("Monetary contribution updated successfully.");
    } catch (error) {
      setGuestsError(error.message || "Unable to update guest status.");
    } finally {
      setUpdatingGuestId("");
    }
  };

  const handleDeleteGuest = async (guestId) => {
    setDeletingGuestId(guestId);
    setGuestsError("");

    try {
      const accessToken = getAccessToken();
      await deleteGuest(accessToken, guestId);

      setGuests((currentGuests) =>
        currentGuests.filter((guest) => (guest._id || guest.id) !== guestId),
      );
      setOpenMenuId("");
      setConfirmAction(null);
      toast.success("Monetary contribution deleted successfully.");

      if (guests.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      }
    } catch (error) {
      setGuestsError(
        error.message || "Unable to delete monetary contribution.",
      );
    } finally {
      setDeletingGuestId("");
    }
  };

  const handleCreateGuest = async (event) => {
    event.preventDefault();
    setCreatingGuest(true);
    setCreateGuestError("");

    try {
      const accessToken = getAccessToken();
      const createdGuest = await createGuest(accessToken, newGuestForm);

      if (page === 1) {
        setGuests((currentGuests) =>
          [createdGuest, ...currentGuests].slice(0, pageSize),
        );
        setHasNextPage(true);
      } else {
        setPage(1);
      }

      setShowCreateModal(false);
      setNewGuestForm({
        guestName: "",
        guestLocation: "",
        amount: "",
        currency: "USD",
        status: "outgoing",
      });
      toast.success("Monetary contribution added successfully.");
    } catch (error) {
      setCreateGuestError(
        error.message || "Unable to create monetary contribution.",
      );
    } finally {
      setCreatingGuest(false);
    }
  };

  const formatStatus = (status) => {
    if (!status) return "-";
    if (status === "incoming") return "Open Incoming";
    if (status === "outgoing") return "Open Outgoing";
    if (status === "settled") return "Settled";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatAmount = (amount, currency = "USD") => {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return amount || "-";
    }

    if (currency === "KHR") {
      return `៛${numericAmount.toLocaleString("en-US")}`;
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numericAmount);
  };

  return (
    <DashboardLayout title="Dashboard" footerNote="Guest operations panel">
      <section className="dashboard-card">
        <div className="card-title-row">
          <h2>Monetary Contribution</h2>
          <button
            type="button"
            className="add-contribution-btn"
            onClick={() => setShowCreateModal(true)}
          >
            Add Contribution
          </button>
        </div>

        <section className="guest-section">
          <div className="guest-section-header">
            <h3>Monetary Contribution List</h3>
            <p className="guest-section-copy">
              Search monetary contributions by name, location, or status.
            </p>
          </div>

          <div className="guest-filters">
            <label className="guest-search">
              <span className="guest-search-label">Search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search contributions"
              />
            </label>

            <label className="guest-search guest-status-filter">
              <span className="guest-search-label">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadingGuests ? <p>Loading guests...</p> : null}

          {guestsError ? <p className="form-error">{guestsError}</p> : null}

          {!loadingGuests && !guestsError && guests.length === 0 ? (
            <p>No monetary contributions found.</p>
          ) : null}

          {!loadingGuests &&
          !guestsError &&
          guests.length > 0 &&
          filteredGuests.length === 0 ? (
            <p>No monetary contributions match your search.</p>
          ) : null}

          {!loadingGuests && !guestsError && filteredGuests.length > 0 ? (
            <>
              <div className="guest-table-wrap">
                <table className="guest-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.map((guest, index) => {
                      const key = guest._id || guest.id || index;
                      const isMenuOpen = openMenuId === key;
                      const nextStatus =
                        guest.status === "settled"
                          ? "outgoing"
                          : guest.status === "incoming"
                            ? "outgoing"
                            : "settled";
                      const menuLabel =
                        guest.status === "settled"
                          ? "Mark as outgoing"
                          : "Mark as settled";

                      return (
                        <tr key={key}>
                          <td>
                            <span
                              className={
                                guest.status === "settled"
                                  ? "guest-name guest-name--settled"
                                  : "guest-name"
                              }
                            >
                              {guest.guestName || "Unnamed Guest"}
                            </span>
                          </td>
                          <td>{guest.guestLocation || "-"}</td>
                          <td>{formatAmount(guest.amount, guest.currency)}</td>
                          <td>
                            <span
                              className={
                                guest.status === "settled"
                                  ? "status-chip status-chip--settled"
                                  : "status-chip"
                              }
                            >
                              {formatStatus(guest.status)}
                            </span>
                          </td>
                          <td>
                            {guest.createdAt
                              ? new Date(guest.createdAt).toLocaleString()
                              : "-"}
                          </td>
                          <td>
                            <div className="guest-actions">
                              <button
                                ref={isMenuOpen ? actionAreaRef : null}
                                type="button"
                                className="guest-menu-trigger"
                                aria-label="Open guest actions"
                                aria-expanded={isMenuOpen}
                                disabled={
                                  updatingGuestId === key ||
                                  deletingGuestId === key
                                }
                                onClick={() => {
                                  if (isMenuOpen) {
                                    setOpenMenuId("");
                                    return;
                                  }
                                  setOpenMenuId(key);
                                }}
                              >
                                <span></span>
                                <span></span>
                                <span></span>
                              </button>

                              {isMenuOpen
                                ? createPortal(
                                    <div
                                      className="guest-menu guest-menu--popup"
                                      ref={popupMenuRef}
                                      role="dialog"
                                      aria-modal="true"
                                      aria-label="Guest actions"
                                    >
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={
                                          updatingGuestId === key ||
                                          deletingGuestId === key
                                        }
                                        onClick={() => {
                                          setConfirmAction({
                                            actionType: "status",
                                            guestId: key,
                                            guestName:
                                              guest.guestName || "this guest",
                                            nextStatus,
                                            menuLabel,
                                          });
                                          setOpenMenuId("");
                                        }}
                                      >
                                        {updatingGuestId === key
                                          ? "Updating..."
                                          : menuLabel}
                                      </button>
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={
                                          updatingGuestId === key ||
                                          deletingGuestId === key
                                        }
                                        onClick={() => {
                                          setConfirmAction({
                                            actionType: "delete",
                                            guestId: key,
                                            guestName:
                                              guest.guestName ||
                                              "this contribution",
                                            menuLabel: "Delete",
                                          });
                                          setOpenMenuId("");
                                        }}
                                      >
                                        {deletingGuestId === key
                                          ? "Deleting..."
                                          : "Delete"}
                                      </button>
                                    </div>,
                                    document.body,
                                  )
                                : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination-bar">
                <p className="pagination-summary">Page {page}</p>
                <div className="pagination-actions">
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={page === 1 || loadingGuests}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={!hasNextPage || loadingGuests}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </section>

      {confirmAction ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => {
            if (
              updatingGuestId !== confirmAction.guestId &&
              deletingGuestId !== confirmAction.guestId
            ) {
              setConfirmAction(null);
            }
          }}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">Confirm action</p>
            <h3 id="confirm-dialog-title">{confirmAction.menuLabel}</h3>
            <p className="confirm-copy">
              {confirmAction.actionType === "delete" ? (
                <>Are you sure you want to delete {confirmAction.guestName}?</>
              ) : (
                <>
                  Are you sure you want to set {confirmAction.guestName} to{" "}
                  <strong>{confirmAction.nextStatus}</strong>?
                </>
              )}
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={
                  updatingGuestId === confirmAction.guestId ||
                  deletingGuestId === confirmAction.guestId
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-primary"
                onClick={() => {
                  if (confirmAction.actionType === "delete") {
                    handleDeleteGuest(confirmAction.guestId);
                    return;
                  }

                  handleUpdateStatus(
                    confirmAction.guestId,
                    confirmAction.nextStatus,
                  );
                }}
                disabled={
                  updatingGuestId === confirmAction.guestId ||
                  deletingGuestId === confirmAction.guestId
                }
              >
                {updatingGuestId === confirmAction.guestId
                  ? "Updating..."
                  : deletingGuestId === confirmAction.guestId
                    ? "Deleting..."
                    : confirmAction.menuLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => {
            if (!creatingGuest) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="confirm-dialog create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">New entry</p>
            <h3 id="create-dialog-title">Add monetary contribution</h3>

            <form className="create-form" onSubmit={handleCreateGuest}>
              <label>
                <span className="guest-search-label">Name</span>
                <input
                  type="text"
                  value={newGuestForm.guestName}
                  onChange={(event) =>
                    setNewGuestForm((currentForm) => ({
                      ...currentForm,
                      guestName: event.target.value,
                    }))
                  }
                  placeholder="Name of contributor"
                  required
                />
              </label>

              <label>
                <span className="guest-search-label">Location</span>
                <input
                  type="text"
                  value={newGuestForm.guestLocation}
                  onChange={(event) =>
                    setNewGuestForm((currentForm) => ({
                      ...currentForm,
                      guestLocation: event.target.value,
                    }))
                  }
                  placeholder="Location of contributor"
                  required
                />
              </label>

              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newGuestForm.amount}
                    onChange={(event) =>
                      setNewGuestForm((currentForm) => ({
                        ...currentForm,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span className="guest-search-label">Currency</span>
                  <select
                    value={newGuestForm.currency}
                    onChange={(event) =>
                      setNewGuestForm((currentForm) => ({
                        ...currentForm,
                        currency: event.target.value,
                      }))
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="KHR">KHR</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="guest-search-label">Status</span>
                <select
                  value={newGuestForm.status}
                  onChange={(event) =>
                    setNewGuestForm((currentForm) => ({
                      ...currentForm,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="outgoing">Open Outgoing</option>
                  <option value="incoming">Open Incoming</option>
                  <option value="settled">Settled</option>
                </select>
              </label>

              {createGuestError ? (
                <p className="form-error">{createGuestError}</p>
              ) : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingGuest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={creatingGuest}
                >
                  {creatingGuest ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default DashboardPage;
