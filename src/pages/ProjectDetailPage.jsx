import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getAccessToken } from "../services/auth";
import {
  deleteProject,
  fetchProject,
  updateProject,
  updateProjectStatus,
} from "../services/projects";
import { toast } from "../lib/toast";

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
    desc: "Awaiting kickoff or initial requirements",
    chipClass: "status-chip--pending",
  },
  {
    value: "in_progress",
    label: "In Progress",
    desc: "Active development and execution",
    chipClass: "status-chip--paid",
  },
  {
    value: "on_hold",
    label: "On Hold",
    desc: "Temporarily blocked or awaiting decisions",
    chipClass: "status-chip--overdue",
  },
  {
    value: "completed",
    label: "Complete",
    desc: "All objectives and deliverables finished",
    chipClass: "status-chip--paid",
  },
];

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

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status) {
  if (!status) return "pending";
  const s = String(status)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "complete") return "completed";
  return s;
}

function formatStatus(status) {
  if (!status) return "-";
  const s = String(status)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "pending") return "Pending";
  if (s === "in_progress") return "In Progress";
  if (s === "on_hold") return "On Hold";
  if (s === "completed" || s === "complete") return "Complete";
  if (s === "active") return "Active";
  if (s === "ongoing") return "Ongoing";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipClass(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "pending") return "status-chip status-chip--pending";
  if (s === "in_progress" || s === "active" || s === "ongoing")
    return "status-chip status-chip--paid";
  if (s === "completed" || s === "complete")
    return "status-chip status-chip--paid";
  if (s === "on_hold" || s === "overdue")
    return "status-chip status-chip--overdue";
  return "status-chip";
}

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    scopeText: "",
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProject = async () => {
      if (!id) return;
      setLoading(true);
      setError("");

      try {
        const accessToken = getAccessToken();
        const projectData = await fetchProject(accessToken, id);

        if (active) {
          setProject(projectData);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load project details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProject();

    return () => {
      active = false;
    };
  }, [id]);

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    if (!showMenu) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showMenu]);

  const isAnyModalOpen = Boolean(
    showEditModal || showStatusModal || showDeleteModal,
  );

  // Prevent background page scrolling when any modal is open
  useEffect(() => {
    if (!isAnyModalOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isAnyModalOpen]);

  // Open Edit Modal
  const openEditModal = () => {
    if (!project) return;
    const scopeText = Array.isArray(project.scope)
      ? project.scope.join("\n")
      : "";
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      scopeText,
    });
    setEditError("");
    setShowEditModal(true);
  };

  // Submit Update Project
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError("Project name is required.");
      return;
    }
    setUpdating(true);
    setEditError("");
    try {
      const accessToken = getAccessToken();
      const scope = editForm.scopeText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => (line.startsWith("-") ? line : `- ${line}`));

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        scope,
      };

      const updated = await updateProject(
        accessToken,
        project._id || id,
        payload,
      );
      setProject((prev) => ({
        ...prev,
        ...payload,
        ...(updated && typeof updated === "object" ? updated : {}),
        updatedAt: new Date().toISOString(),
      }));
      toast.success("Project updated successfully.");
      setShowEditModal(false);
    } catch (err) {
      setEditError(err.message || "Failed to update project.");
    } finally {
      setUpdating(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = () => {
    setDeleteInput("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Submit Delete Project
  const handleDeleteProject = async () => {
    if (deleteInput.trim().toLowerCase() !== "delete") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const accessToken = getAccessToken();
      await deleteProject(accessToken, project._id || id);
      toast.success("Project deleted successfully.");
      setShowDeleteModal(false);
      navigate("/dashboard/projects");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete project.");
      setDeleting(false);
    }
  };

  // Open Status Modal
  const openStatusModal = () => {
    if (!project) return;
    setSelectedStatus(normalizeStatus(project.status) || "pending");
    setStatusError("");
    setShowStatusModal(true);
  };

  // Submit Update Project Status
  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setUpdatingStatus(true);
    setStatusError("");
    try {
      const accessToken = getAccessToken();
      const updated = await updateProjectStatus(
        accessToken,
        project._id || id,
        selectedStatus,
      );
      setProject((prev) => ({
        ...prev,
        status: selectedStatus,
        ...(updated && typeof updated === "object" ? updated : {}),
        updatedAt: new Date().toISOString(),
      }));
      toast.success(
        `Project status updated to ${formatStatus(selectedStatus)}.`,
      );
      setShowStatusModal(false);
    } catch (err) {
      setStatusError(err.message || "Failed to update project status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <DashboardLayout
      title="Project Details"
      kicker="Projects"
      footerNote="Project details panel"
    >
      <section className="dashboard-card project-detail-card">
        {/* Navigation Bar: Back Link on Left, 3-Dot Options on Right */}
        <div className="project-detail-nav">
          <Link to="/dashboard/projects" className="back-link">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Projects
          </Link>

          {!loading && !error && project ? (
            <div className="project-options-menu" ref={menuRef}>
              <button
                type="button"
                className="guest-menu-trigger"
                aria-label="Project actions"
                aria-expanded={showMenu}
                onClick={() => setShowMenu((current) => !current)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {showMenu ? (
                <div
                  className="guest-menu guest-menu--popup"
                  role="menu"
                  aria-label="Project actions"
                >
                  <button
                    type="button"
                    className="guest-menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      openEditModal();
                    }}
                  >
                    Update Project
                  </button>
                  <button
                    type="button"
                    className="guest-menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      openStatusModal();
                    }}
                  >
                    Change Project Status
                  </button>
                  <button
                    type="button"
                    className="guest-menu-item guest-menu-item--danger"
                    onClick={() => {
                      setShowMenu(false);
                      openDeleteModal();
                    }}
                  >
                    Delete Project
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="loading-state">Loading project details...</p>
        ) : null}

        {error ? (
          <div className="project-error-panel">
            <p className="form-error">{error}</p>
            <button
              type="button"
              className="pagination-btn"
              style={{ marginTop: "12px" }}
              onClick={() => navigate("/dashboard/projects")}
            >
              Return to Project List
            </button>
          </div>
        ) : null}

        {!loading && !error && project ? (
          <div className="project-detail-body">
            {/* Header / Title Banner */}
            <div className="project-detail-header">
              <div>
                <span className="project-detail-badge">Project Overview</span>
                <h2 className="project-detail-title">
                  {project.name || "Untitled Project"}
                </h2>
                <p className="project-detail-desc">
                  {project.description ||
                    "No description provided for this project."}
                </p>
              </div>
              <div className="project-detail-status-wrap">
                <span className={statusChipClass(project.status)}>
                  {formatStatus(project.status)}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="project-meta-grid">
              <div className="project-meta-card">
                <span className="project-meta-label">Status</span>
                <span className="project-meta-value highlight">
                  {formatStatus(project.status)}
                </span>
              </div>
              <div className="project-meta-card">
                <span className="project-meta-label">Created Date</span>
                <span className="project-meta-value">
                  {formatDate(project.createdAt)}
                </span>
              </div>
              <div className="project-meta-card">
                <span className="project-meta-label">Last Updated</span>
                <span className="project-meta-value">
                  {formatDate(project.updatedAt)}
                </span>
              </div>
              <div className="project-meta-card">
                <span className="project-meta-label">Tasks</span>
                <span className="project-meta-value">
                  {Array.isArray(project.tasks) ? project.tasks.length : 0}
                </span>
              </div>
              <div className="project-meta-card">
                <span className="project-meta-label">Members</span>
                <span className="project-meta-value">
                  {Array.isArray(project.member) ? project.member.length : 0}
                </span>
              </div>
            </div>

            {/* Main Sections: Scope, Tasks, Members */}
            <div className="project-sections-grid">
              {/* Scope Section */}
              <div className="project-section-panel">
                <div className="project-panel-header">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <h3>Project Scope</h3>
                </div>
                {Array.isArray(project.scope) && project.scope.length > 0 ? (
                  <ul className="project-scope-list">
                    {project.scope.map((item, index) => (
                      <li key={index} className="project-scope-item">
                        <span className="scope-bullet" />
                        <span>{item.replace(/^-\s*/, "")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-panel-copy">No scope items defined.</p>
                )}
              </div>

              {/* Tasks Section */}
              <div className="project-section-panel">
                <div className="project-panel-header">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <h3>
                    Tasks (
                    {Array.isArray(project.tasks) ? project.tasks.length : 0})
                  </h3>
                </div>
                {Array.isArray(project.tasks) && project.tasks.length > 0 ? (
                  <ul className="project-items-list">
                    {project.tasks.map((task, idx) => (
                      <li key={idx} className="project-task-item">
                        {typeof task === "object"
                          ? task.name || task.title || JSON.stringify(task)
                          : String(task)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-panel-copy">
                    No tasks recorded for this project yet.
                  </p>
                )}
              </div>

              {/* Team Members Section */}
              <div className="project-section-panel">
                <div className="project-panel-header">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3>
                    Team Members (
                    {Array.isArray(project.member) ? project.member.length : 0})
                  </h3>
                </div>
                {Array.isArray(project.member) && project.member.length > 0 ? (
                  <div className="project-members-wrap">
                    {project.member.map((mem, idx) => (
                      <span key={idx} className="project-member-tag">
                        {typeof mem === "object"
                          ? mem.name || mem.email || mem._id
                          : String(mem)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="empty-panel-copy">No team members assigned.</p>
                )}
              </div>

              {/* Technical / Meta Details */}
              <div className="project-section-panel">
                <div className="project-panel-header">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <h3>System Information</h3>
                </div>
                <div className="project-system-info">
                  <div className="system-info-row">
                    <span className="system-info-key">Project ID:</span>
                    <code className="system-info-val">
                      {project._id || project.id || "-"}
                    </code>
                  </div>
                  <div className="system-info-row">
                    <span className="system-info-key">Created By:</span>
                    <span className="system-info-val">
                      {typeof project.createdBy === "object"
                        ? project.createdBy.name || project.createdBy._id || "-"
                        : project.createdBy || "-"}
                    </span>
                  </div>
                  <div className="system-info-row">
                    <span className="system-info-key">Created At:</span>
                    <span className="system-info-val">
                      {formatDateTime(project.createdAt)}
                    </span>
                  </div>
                  <div className="system-info-row">
                    <span className="system-info-key">Updated At:</span>
                    <span className="system-info-val">
                      {formatDateTime(project.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      {/* Edit Project Modal */}
      {showEditModal && project ? (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-project-title"
          onClick={() => {
            if (!updating) setShowEditModal(false);
          }}
        >
          <div
            className="confirm-dialog create-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-project-title">Update Project</h3>
            <p className="confirm-copy">
              Update the project information and details below.
            </p>

            <form
              onSubmit={handleUpdateProject}
              className="create-form"
              style={{ marginTop: "16px" }}
            >
              <label>
                <span className="guest-search-label">Project Name *</span>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Phoenix Redesign"
                />
              </label>

              <label>
                <span className="guest-search-label">Description</span>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief overview or goals of this project"
                />
              </label>

              <label>
                <span className="guest-search-label">
                  Project Scope (one item per line)
                </span>
                <textarea
                  rows={4}
                  value={editForm.scopeText}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      scopeText: e.target.value,
                    }))
                  }
                  placeholder={"-testing new version\n-update new version"}
                />
              </label>

              {editError ? <p className="form-error">{editError}</p> : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Update Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Change Status Modal */}
      {showStatusModal && project ? (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-modal-title"
          onClick={() => {
            if (!updatingStatus) setShowStatusModal(false);
          }}
        >
          <div
            className="confirm-dialog"
            style={{ width: "min(540px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="status-modal-title">Change Project Status</h3>
            <p className="confirm-copy">
              Select a new status for <strong>{project.name}</strong>.
            </p>

            {/* Status Workflow Progression */}
            <div className="status-workflow-pipeline" aria-hidden="true">
              <div
                className={`pipeline-step ${
                  normalizeStatus(selectedStatus) === "pending" ? "active" : ""
                }`}
              >
                <span
                  className="status-chip status-chip--pending"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                >
                  Pending
                </span>
              </div>
              <span className="pipeline-arrow">➔</span>
              <div
                className={`pipeline-step ${
                  normalizeStatus(selectedStatus) === "in_progress"
                    ? "active"
                    : ""
                }`}
              >
                <span
                  className="status-chip status-chip--paid"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                >
                  In Progress
                </span>
              </div>
              <span className="pipeline-arrow">or</span>
              <div
                className={`pipeline-step ${
                  normalizeStatus(selectedStatus) === "on_hold" ? "active" : ""
                }`}
              >
                <span
                  className="status-chip status-chip--overdue"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                >
                  On Hold
                </span>
              </div>
              <span className="pipeline-arrow">➔</span>
              <div
                className={`pipeline-step ${
                  normalizeStatus(selectedStatus) === "completed"
                    ? "active"
                    : ""
                }`}
              >
                <span
                  className="status-chip status-chip--paid"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                >
                  Complete
                </span>
              </div>
            </div>

            {/* Status Selectable Options */}
            <div className="status-options-grid">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`status-option-card ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedStatus(opt.value)}
                  >
                    <div className="status-option-card-header">
                      <span className="status-option-name">{opt.label}</span>
                      <span
                        className={`status-chip ${opt.chipClass}`}
                        style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <span className="status-option-desc">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {statusError ? <p className="form-error">{statusError}</p> : null}

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-secondary"
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-primary"
                onClick={handleUpdateStatus}
                disabled={
                  updatingStatus ||
                  selectedStatus === normalizeStatus(project.status)
                }
              >
                {updatingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && project ? (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-project-title" style={{ color: "#dc2626" }}>
              Delete Project
            </h3>
            <p className="confirm-copy">
              Are you sure you want to delete{" "}
              <strong>{project.name || "this project"}</strong>? This action is
              permanent and cannot be undone.
            </p>

            <div className="delete-confirmation-box">
              <label
                htmlFor="delete-confirm-input-field"
                className="delete-input-label"
              >
                Please type <strong>delete</strong> to confirm:
              </label>
              <input
                id="delete-confirm-input-field"
                type="text"
                className="delete-confirm-input"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder='Type "delete" to proceed'
                autoFocus
              />
            </div>

            {deleteError ? <p className="form-error">{deleteError}</p> : null}

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-danger"
                onClick={handleDeleteProject}
                disabled={
                  deleteInput.trim().toLowerCase() !== "delete" || deleting
                }
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default ProjectDetailPage;
