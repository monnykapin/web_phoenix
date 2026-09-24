import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "../lib/toast";
import { useMenuInViewport } from "../lib/popupMenu";
import DashboardLayout from "../components/DashboardLayout";
import { getAccessToken } from "../services/auth";
import {
  createRental,
  deleteRental,
  fetchRentalStatus,
  fetchRentals,
  recordRentalPayment,
  updateRental,
  updateRentalStatus,
} from "../services/rentals";
import { createRoom, fetchRooms } from "../services/rooms";

const STATUS_VALUES = ["all", "paid", "pending", "overdue"];

const MANUAL_STATUS_VALUES = [
  { value: "pending", label: "Pending" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

const STAT_ROWS = [
  [
    { key: "totalRentals", label: "Total Rentals", type: "count" },
    { key: "paid", label: "Paid", type: "count" },
    { key: "pending", label: "Pending", type: "count" },
    { key: "overdue", label: "Overdue", type: "count" },
  ],
  [
    { key: "allTimeCollect", label: "All Time Collect", type: "amount" },
    { key: "expectedRent", label: "Expected Collect", type: "amount" },
    { key: "collectedRent", label: "Collected Rent", type: "amount" },
    { key: "outstandingRent", label: "Outstanding Rent", type: "amount" },
  ],
];

function formatStatus(status) {
  if (!status) return "-";
  const labels = {
    paid: "Paid",
    pending: "Pending",
    unpaid: "Unpaid",
    overdue: "Overdue",
    active: "Active",
    vacant: "Vacant",
    occupied: "Occupied",
    "moved-out": "Moved Out",
    "move-out": "Moved Out",
  };
  if (labels[status]) return labels[status];
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipClass(status) {
  if (status === "paid") return "status-chip status-chip--paid";
  if (status === "pending") return "status-chip status-chip--pending";
  if (status === "unpaid") return "status-chip status-chip--unpaid";
  if (status === "overdue") return "status-chip status-chip--overdue";
  return "status-chip";
}

function formatAmount(amount) {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return amount || "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

// roomId/tenantId can be a plain id string, null, or a populated object
// (e.g. { _id, number }) from the API. Return a safe string to display.
function formatReference(value) {
  if (!value) return "";
  if (typeof value === "object") {
    return (
      value.number || value.name || value.title || value.code || value._id || ""
    );
  }
  return value;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

// Extract the day-of-month (01-31) from a dueDate, safe against timezone
// shifts for "YYYY-MM-DD" strings (parsed as UTC).
function extractDayPart(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-(\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getDate()).padStart(2, "0");
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Build the payment date "YYYY-MM-DD": year/month come from the active month
// filter (or the current month when no filter is set); the day comes from the
// rental's dueDate, falling back to today.
function getPaymentDate(monthFilter, rental) {
  const now = new Date();
  const year = monthFilter
    ? monthFilter.slice(0, 4)
    : String(now.getFullYear());
  const month = monthFilter
    ? monthFilter.slice(5, 7)
    : String(now.getMonth() + 1).padStart(2, "0");
  const day =
    extractDayPart(rental?.dueDate) || String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const EMPTY_FORM = {
  roomId: "",
  roomNumber: "",
  tenantId: "",
  moveInDate: "",
  moveOutDate: "",
  rentAmount: "35",
  dueDate: "",
};

function RentalsPage() {
  const pageSize = 10;
  const actionAreaRef = useRef(null);
  const popupMenuRef = useRef(null);

  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingRentals, setLoadingRentals] = useState(true);
  const [rentalsError, setRentalsError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth);
  const [page, setPage] = useState(1);

  const [openMenuId, setOpenMenuId] = useState("");
  useMenuInViewport(popupMenuRef, actionAreaRef, Boolean(openMenuId));
  const [confirmAction, setConfirmAction] = useState(null);
  const [busyId, setBusyId] = useState("");

  const statusMenuRef = useRef(null);
  const statusAreaRef = useRef(null);
  const [statusMenuId, setStatusMenuId] = useState("");
  useMenuInViewport(statusMenuRef, statusAreaRef, Boolean(statusMenuId));

  const [stats, setStats] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingRental, setCreatingRental] = useState(false);
  const [createRentalError, setCreateRentalError] = useState("");
  const [newRentalForm, setNewRentalForm] = useState(EMPTY_FORM);

  const [showEditModal, setShowEditModal] = useState(false);
  const [savingRental, setSavingRental] = useState(false);
  const [updateRentalError, setUpdateRentalError] = useState("");
  const [editRentalForm, setEditRentalForm] = useState(EMPTY_FORM);
  const [editRentalId, setEditRentalId] = useState("");

  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState("");

  const addMenuRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState("");
  const [newRoomForm, setNewRoomForm] = useState({
    number: "",
    description: "",
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;

    const loadRentals = async () => {
      setLoadingRentals(true);
      setRentalsError("");

      try {
        const accessToken = getAccessToken();
        const data = await fetchRentals(accessToken, {
          offset: (page - 1) * pageSize,
          limit: pageSize,
          status: statusFilter === "all" ? "" : statusFilter,
          month: monthFilter,
        });

        if (active) {
          setRentals(data.rentals);
          setTotal(data.total);
          setStats(data.stats);
        }
      } catch (error) {
        if (active) {
          setRentalsError(error.message || "Unable to load rentals list.");
        }
      } finally {
        if (active) {
          setLoadingRentals(false);
        }
      }
    };

    loadRentals();

    return () => {
      active = false;
    };
  }, [page, statusFilter, monthFilter]);

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

  useEffect(() => {
    if (!statusMenuId) {
      return undefined;
    }

    const handleStatusMenuPointerDown = (event) => {
      if (
        !statusAreaRef.current?.contains(event.target) &&
        !statusMenuRef.current?.contains(event.target)
      ) {
        setStatusMenuId("");
      }
    };

    document.addEventListener("mousedown", handleStatusMenuPointerDown);
    document.addEventListener("touchstart", handleStatusMenuPointerDown);

    return () => {
      document.removeEventListener("mousedown", handleStatusMenuPointerDown);
      document.removeEventListener("touchstart", handleStatusMenuPointerDown);
    };
  }, [statusMenuId]);

  useEffect(() => {
    let active = true;

    const loadRooms = async () => {
      try {
        const accessToken = getAccessToken();
        const roomsData = await fetchRooms(accessToken);
        if (active) setRooms(roomsData);
      } catch (error) {
        if (active) {
          setRoomsError(error.message || "Unable to load rooms.");
        }
      }
    };

    loadRooms();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!showAddMenu) return undefined;

    const handlePointerDown = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showAddMenu]);

  const filteredRentals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rentals.filter((rental) => {
      const searchableFields = [
        formatReference(rental.roomId),
        formatReference(rental.tenantId),
        rental.rentAmount,
        rental.paymentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchableFields.includes(query);
    });
  }, [rentals, searchTerm]);

  const availableRooms = useMemo(
    () => rooms.filter((room) => room.status !== "rented"),
    [rooms],
  );

  const statRows = useMemo(() => {
    if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
      return [];
    }

    return STAT_ROWS.map((row) =>
      row.filter((card) => card.key in stats),
    ).filter((row) => row.length > 0);
  }, [stats]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMonthFilter("");
    setPage(1);
  };

  const openEditModal = (rental) => {
    setEditRentalId(rental._id || rental.id);
    setEditRentalForm({
      roomId:
        rental.roomId && typeof rental.roomId === "object"
          ? rental.roomId._id || ""
          : rental.roomId || "",
      roomNumber:
        rental.roomId && typeof rental.roomId === "object"
          ? rental.roomId.number || ""
          : "",
      tenantId:
        rental.tenantId && typeof rental.tenantId === "object"
          ? rental.tenantId._id || ""
          : rental.tenantId || "",
      moveInDate: toDateInputValue(rental.moveInDate),
      moveOutDate: toDateInputValue(rental.moveOutDate),
      rentAmount: rental.rentAmount ?? "",
      dueDate: toDateInputValue(rental.dueDate),
    });
    setUpdateRentalError("");
    setShowEditModal(true);
  };

  const handleCreateRental = async (event) => {
    event.preventDefault();
    setCreatingRental(true);
    setCreateRentalError("");

    try {
      const accessToken = getAccessToken();
      const createdRental = await createRental(accessToken, {
        roomId: newRentalForm.roomId || null,
        tenantId: newRentalForm.tenantId || null,
        moveInDate: newRentalForm.moveInDate || undefined,
        moveOutDate: newRentalForm.moveOutDate || undefined,
        rentAmount: Number(newRentalForm.rentAmount),
        dueDate: newRentalForm.dueDate || undefined,
      });

      if (
        statusFilter === "all" ||
        statusFilter === createdRental.paymentStatus
      ) {
        setRentals((currentRentals) =>
          [createdRental, ...currentRentals].slice(0, pageSize),
        );
        setTotal((currentTotal) => currentTotal + 1);
      }

      setShowCreateModal(false);
      setNewRentalForm(EMPTY_FORM);
      toast.success("Rental room added successfully.");
    } catch (error) {
      setCreateRentalError(error.message || "Unable to create rental.");
    } finally {
      setCreatingRental(false);
    }
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setCreatingRoom(true);
    setCreateRoomError("");

    try {
      const accessToken = getAccessToken();
      const createdRoom = await createRoom(accessToken, {
        number: newRoomForm.number,
        description: newRoomForm.description || undefined,
      });

      setRooms((currentRooms) => [createdRoom, ...currentRooms]);
      // Pre-select the newly created room in the create-rental form.
      setNewRentalForm((currentForm) => ({
        ...currentForm,
        roomId: createdRoom._id || createdRoom.id || currentForm.roomId,
      }));
      setShowRoomModal(false);
      setNewRoomForm({ number: "", description: "" });
      toast.success("Room added successfully.");
    } catch (error) {
      setCreateRoomError(error.message || "Unable to create room.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleUpdateRental = async (event) => {
    event.preventDefault();
    setSavingRental(true);
    setUpdateRentalError("");

    try {
      const accessToken = getAccessToken();
      const updatedRental = await updateRental(accessToken, editRentalId, {
        roomId: editRentalForm.roomId || null,
        tenantId: editRentalForm.tenantId || null,
        moveInDate: editRentalForm.moveInDate || undefined,
        moveOutDate: editRentalForm.moveOutDate || null,
        rentAmount: Number(editRentalForm.rentAmount),
        dueDate: editRentalForm.dueDate || undefined,
      });

      setRentals((currentRentals) =>
        currentRentals.map((rental) =>
          (rental._id || rental.id) === editRentalId
            ? { ...rental, ...updatedRental }
            : rental,
        ),
      );

      setShowEditModal(false);
      toast.success("Rental room updated successfully.");
    } catch (error) {
      setUpdateRentalError(error.message || "Unable to update rental.");
    } finally {
      setSavingRental(false);
    }
  };

  const handleRecordPayment = async (rentalId) => {
    setBusyId(rentalId);
    setRentalsError("");

    try {
      const accessToken = getAccessToken();
      const updatedRental = await recordRentalPayment(accessToken, rentalId);

      setRentals((currentRentals) =>
        currentRentals.map((rental) =>
          (rental._id || rental.id) === rentalId
            ? { ...rental, ...updatedRental, paymentStatus: "paid" }
            : rental,
        ),
      );
      setConfirmAction(null);
      toast.success("Payment recorded successfully.");
    } catch (error) {
      setRentalsError(error.message || "Unable to record payment.");
    } finally {
      setBusyId("");
    }
  };

  const handleRefreshStatus = async (rentalId) => {
    setBusyId(rentalId);
    setRentalsError("");

    try {
      const accessToken = getAccessToken();
      const status = await fetchRentalStatus(accessToken, rentalId);
      const statusValue =
        typeof status === "string" ? status : status?.paymentStatus;

      if (statusValue) {
        setRentals((currentRentals) =>
          currentRentals.map((rental) =>
            (rental._id || rental.id) === rentalId
              ? { ...rental, paymentStatus: statusValue }
              : rental,
          ),
        );
      }
      setOpenMenuId("");
      toast.success("Rental status refreshed.");
    } catch (error) {
      setRentalsError(error.message || "Unable to refresh rental status.");
    } finally {
      setBusyId("");
    }
  };

  const handleUpdateStatus = async (rentalId, status) => {
    setBusyId(rentalId);
    setRentalsError("");

    try {
      const accessToken = getAccessToken();
      const rental = rentals.find((item) => (item._id || item.id) === rentalId);

      // Selecting "Paid" records an actual payment instead of just flipping
      // the status: POST /rentals/:id/payments with { amount, paymentDate }.
      // paymentDate's year/month come from the active month filter (or the
      // current month), and the day comes from the rental's dueDate (or today).
      if (status === "paid") {
        const amount = Number(rental?.rentAmount);
        const paymentData = {
          paymentDate: getPaymentDate(monthFilter, rental),
        };
        if (Number.isFinite(amount)) {
          paymentData.amount = amount;
        }

        const updatedRental = await recordRentalPayment(
          accessToken,
          rentalId,
          paymentData,
        );

        setRentals((currentRentals) =>
          currentRentals.map((item) =>
            (item._id || item.id) === rentalId
              ? { ...item, ...updatedRental, paymentStatus: "paid" }
              : item,
          ),
        );

        toast.success("Payment recorded successfully.");
        return;
      }

      const updatedRental = await updateRentalStatus(
        accessToken,
        rentalId,
        status,
      );
      const mergedRental =
        updatedRental && typeof updatedRental === "object"
          ? updatedRental
          : { status, paymentStatus: status };

      setRentals((currentRentals) =>
        currentRentals.map((item) =>
          (item._id || item.id) === rentalId
            ? { ...item, ...mergedRental, status, paymentStatus: status }
            : item,
        ),
      );

      toast.success("Rental status updated.");
    } catch (error) {
      setRentalsError(error.message || "Unable to update rental status.");
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteRental = async (rentalId) => {
    setBusyId(rentalId);
    setRentalsError("");

    try {
      const accessToken = getAccessToken();
      await deleteRental(accessToken, rentalId);

      setRentals((currentRentals) =>
        currentRentals.filter(
          (rental) => (rental._id || rental.id) !== rentalId,
        ),
      );
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      setConfirmAction(null);
      toast.success("Rental room deleted successfully.");

      if (rentals.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      }
    } catch (error) {
      setRentalsError(error.message || "Unable to delete rental.");
    } finally {
      setBusyId("");
    }
  };

  const confirmCopy =
    confirmAction?.actionType === "delete"
      ? `Are you sure you want to delete ${confirmAction.label}?`
      : `Record payment for ${confirmAction?.label}? The status will be set to paid.`;

  return (
    <DashboardLayout
      title="Rental Rooms"
      footerNote="Rental room management panel"
    >
      <section className="dashboard-card">
        <div className="card-title-row">
          <h2>Rental Rooms</h2>
          <div className="rental-header-actions">
            <div className="rental-add-menu" ref={addMenuRef}>
              <button
                type="button"
                className="guest-menu-trigger"
                aria-label="More actions"
                aria-expanded={showAddMenu}
                onClick={() => setShowAddMenu((current) => !current)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {showAddMenu ? (
                <div
                  className="guest-menu guest-menu--add"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Add actions"
                >
                  <button
                    type="button"
                    className="guest-menu-item"
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowRoomModal(true);
                    }}
                  >
                    Add Room
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="add-contribution-btn"
              onClick={() => setShowCreateModal(true)}
            >
              Add Rental Room
            </button>
          </div>
        </div>

        {statRows.length > 0 ? (
          <>
            {statRows.map((row, rowIndex) => (
              <div className="rental-stats" key={`stats-row-${rowIndex}`}>
                {row.map((card) => (
                  <div className="rental-stat-card" key={card.key}>
                    <p className="rental-stat-value">
                      {card.type === "amount"
                        ? formatAmount(stats[card.key])
                        : typeof stats[card.key] === "number"
                          ? stats[card.key].toLocaleString("en-US")
                          : String(stats[card.key])}
                    </p>
                    <p className="rental-stat-label">{card.label}</p>
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : null}

        <section className="guest-section">
          <div className="guest-section-header">
            <h3>Rental Room List</h3>
            <p className="guest-section-copy">
              Search rental rooms by room, tenant, amount, status, or month.
            </p>
          </div>

          <div className="guest-filters rental-filters">
            <label className="guest-search">
              <span className="guest-search-label">Search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search rental rooms"
              />
            </label>

            <label className="guest-search guest-status-filter">
              <span className="guest-search-label">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                {STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="guest-search">
              <span className="guest-search-label">Month</span>
              <input
                type="month"
                value={monthFilter}
                onChange={(event) => {
                  setMonthFilter(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <button
              type="button"
              className="clear-filter-btn"
              onClick={clearFilters}
            >
              Clear Filter
            </button>
          </div>

          {loadingRentals ? <p>Loading rental rooms...</p> : null}

          {rentalsError ? <p className="form-error">{rentalsError}</p> : null}

          {!loadingRentals && !rentalsError && rentals.length === 0 ? (
            <p>No rental rooms found.</p>
          ) : null}

          {!loadingRentals &&
          !rentalsError &&
          rentals.length > 0 &&
          filteredRentals.length === 0 ? (
            <p>No rental rooms match your filters.</p>
          ) : null}

          {!loadingRentals && !rentalsError && filteredRentals.length > 0 ? (
            <>
              <div className="guest-table-wrap">
                <table className="guest-table guest-table--rentals">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Move In</th>
                      <th>Move Out</th>
                      <th>Rent</th>
                      <th>Due Date</th>
                      <th>Payment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRentals.map((rental, index) => {
                      const key = rental._id || rental.id || index;
                      const isMenuOpen = openMenuId === key;
                      const isStatusMenuOpen = statusMenuId === key;
                      const isBusy = busyId === key;
                      const displayName =
                        formatReference(rental.roomId) ||
                        formatReference(rental.tenantId) ||
                        `Rental ${index + 1}`;

                      return (
                        <tr key={key}>
                          <td>
                            <span className="guest-name">
                              {formatReference(rental.roomId) || "-"}
                            </span>
                          </td>
                          <td>{formatDate(rental.moveInDate)}</td>
                          <td>{formatDate(rental.moveOutDate)}</td>
                          <td>{formatAmount(rental.rentAmount)}</td>
                          <td>{formatDate(rental.dueDate)}</td>
                          <td>{formatDate(rental.paymentDate)}</td>
                          <td>
                            <div className="guest-actions">
                              <button
                                ref={isStatusMenuOpen ? statusAreaRef : null}
                                type="button"
                                className={`${statusChipClass(
                                  rental.paymentStatus,
                                )} status-chip-btn`}
                                aria-label="Change rental status"
                                aria-expanded={isStatusMenuOpen}
                                disabled={isBusy}
                                onClick={() => {
                                  if (isStatusMenuOpen) {
                                    setStatusMenuId("");
                                    return;
                                  }
                                  setStatusMenuId(key);
                                }}
                              >
                                {formatStatus(rental.paymentStatus)}
                              </button>

                              {isStatusMenuOpen
                                ? createPortal(
                                    <div
                                      className="guest-menu guest-menu--popup"
                                      ref={statusMenuRef}
                                      role="dialog"
                                      aria-modal="true"
                                      aria-label="Change rental status"
                                    >
                                      {MANUAL_STATUS_VALUES.map((option) => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          className="guest-menu-item"
                                          disabled={isBusy}
                                          onClick={() => {
                                            setStatusMenuId("");
                                            handleUpdateStatus(
                                              key,
                                              option.value,
                                            );
                                          }}
                                        >
                                          {option.label}
                                        </button>
                                      ))}
                                    </div>,
                                    document.body,
                                  )
                                : null}
                            </div>
                          </td>
                          <td>
                            <div className="guest-actions">
                              <button
                                ref={isMenuOpen ? actionAreaRef : null}
                                type="button"
                                className="guest-menu-trigger"
                                aria-label="Open rental actions"
                                aria-expanded={isMenuOpen}
                                disabled={isBusy}
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
                                      aria-label="Rental actions"
                                    >
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setConfirmAction({
                                            actionType: "payment",
                                            rentalId: key,
                                            label: displayName,
                                          });
                                          setOpenMenuId("");
                                        }}
                                      >
                                        Record Payment
                                      </button>
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={isBusy}
                                        onClick={() => handleRefreshStatus(key)}
                                      >
                                        Refresh Status
                                      </button>
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setOpenMenuId("");
                                          openEditModal(rental);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="guest-menu-item"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setConfirmAction({
                                            actionType: "delete",
                                            rentalId: key,
                                            label: displayName,
                                          });
                                          setOpenMenuId("");
                                        }}
                                      >
                                        Delete
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
                <p className="pagination-summary">
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} of {total} rental rooms
                </p>
                <div className="pagination-actions">
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={page <= 1}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={page >= totalPages}
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
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">Confirm action</p>
            <h3 id="confirm-dialog-title">
              {confirmAction.actionType === "delete"
                ? "Delete rental room"
                : "Record payment"}
            </h3>
            <p className="confirm-copy">{confirmCopy}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={busyId === confirmAction.rentalId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-primary"
                onClick={() => {
                  if (confirmAction.actionType === "delete") {
                    handleDeleteRental(confirmAction.rentalId);
                    return;
                  }
                  handleRecordPayment(confirmAction.rentalId);
                }}
                disabled={busyId === confirmAction.rentalId}
              >
                {busyId === confirmAction.rentalId
                  ? confirmAction.actionType === "delete"
                    ? "Deleting..."
                    : "Recording..."
                  : "Confirm"}
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
            if (!creatingRental) setShowCreateModal(false);
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
            <h3 id="create-dialog-title">Add rental room</h3>

            <form className="create-form" onSubmit={handleCreateRental}>
              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">Room</span>
                  <select
                    value={newRentalForm.roomId}
                    onChange={(event) =>
                      setNewRentalForm((currentForm) => ({
                        ...currentForm,
                        roomId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a room</option>
                    {availableRooms.map((room) => {
                      const roomKey = room._id || room.id;
                      return (
                        <option key={roomKey} value={roomKey}>
                          {room.number || room.name || roomKey}
                        </option>
                      );
                    })}
                  </select>
                  {roomsError ? (
                    <span className="form-error">{roomsError}</span>
                  ) : null}
                  {!roomsError &&
                  rooms.length > 0 &&
                  availableRooms.length === 0 ? (
                    <span className="guest-section-copy">
                      No available rooms — every room is currently rented.
                    </span>
                  ) : null}
                  {!roomsError && rooms.length === 0 ? (
                    <span className="guest-section-copy">
                      No rooms yet — add one via the ⋮ menu.
                    </span>
                  ) : null}
                </label>
                <label>
                  <span className="guest-search-label">Tenant ID</span>
                  <input
                    type="text"
                    value={newRentalForm.tenantId}
                    onChange={(event) =>
                      setNewRentalForm((currentForm) => ({
                        ...currentForm,
                        tenantId: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">Move-in date</span>
                  <input
                    type="date"
                    value={newRentalForm.moveInDate}
                    onChange={(event) =>
                      setNewRentalForm((currentForm) => ({
                        ...currentForm,
                        moveInDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span className="guest-search-label">Rent (USD)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRentalForm.rentAmount}
                    onChange={(event) =>
                      setNewRentalForm((currentForm) => ({
                        ...currentForm,
                        rentAmount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>
              </div>

              <label>
                <span className="guest-search-label">Due date</span>
                <input
                  type="date"
                  value={newRentalForm.dueDate}
                  onChange={(event) =>
                    setNewRentalForm((currentForm) => ({
                      ...currentForm,
                      dueDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {createRentalError ? (
                <p className="form-error">{createRentalError}</p>
              ) : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingRental}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={creatingRental}
                >
                  {creatingRental ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showRoomModal ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => {
            if (!creatingRoom) setShowRoomModal(false);
          }}
        >
          <div
            className="confirm-dialog create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">New room</p>
            <h3 id="create-room-dialog-title">Add room</h3>

            <form className="create-form" onSubmit={handleCreateRoom}>
              <label>
                <span className="guest-search-label">Number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newRoomForm.number}
                  onChange={(event) =>
                    setNewRoomForm((currentForm) => ({
                      ...currentForm,
                      number: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="e.g. Room 2"
                  required
                />
              </label>

              <label>
                <span className="guest-search-label">Description</span>
                <input
                  type="text"
                  value={newRoomForm.description}
                  onChange={(event) =>
                    setNewRoomForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder="e.g. Floor 1 room"
                />
              </label>

              {createRoomError ? (
                <p className="form-error">{createRoomError}</p>
              ) : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowRoomModal(false)}
                  disabled={creatingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={creatingRoom}
                >
                  {creatingRoom ? "Saving..." : "Add Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => {
            if (!savingRental) setShowEditModal(false);
          }}
        >
          <div
            className="confirm-dialog create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">Edit entry</p>
            <h3 id="edit-dialog-title">Edit rental room</h3>

            <form className="create-form" onSubmit={handleUpdateRental}>
              <div className="create-form-row create-form-row--three">
                <label className="create-form-grow">
                  <span className="guest-search-label">Room ID</span>
                  <input
                    type="text"
                    value={editRentalForm.roomId}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        roomId: event.target.value,
                      }))
                    }
                    placeholder="e.g. Room A101"
                  />
                </label>
                <label>
                  <span className="guest-search-label">Room Number</span>
                  <input
                    type="text"
                    value={editRentalForm.roomNumber}
                    readOnly
                    placeholder="—"
                  />
                </label>
                <label>
                  <span className="guest-search-label">Tenant ID</span>
                  <input
                    type="text"
                    value={editRentalForm.tenantId}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        tenantId: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">Move-in date</span>
                  <input
                    type="date"
                    value={editRentalForm.moveInDate}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        moveInDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span className="guest-search-label">Rent (USD)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editRentalForm.rentAmount}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        rentAmount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>
              </div>

              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">Move-out date</span>
                  <input
                    type="date"
                    value={editRentalForm.moveOutDate}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        moveOutDate: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="guest-search-label">Due date</span>
                  <input
                    type="date"
                    value={editRentalForm.dueDate}
                    onChange={(event) =>
                      setEditRentalForm((currentForm) => ({
                        ...currentForm,
                        dueDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>

              {updateRentalError ? (
                <p className="form-error">{updateRentalError}</p>
              ) : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingRental}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={savingRental}
                >
                  {savingRental ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default RentalsPage;
