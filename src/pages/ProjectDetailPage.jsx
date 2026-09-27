import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { getAccessToken } from "../services/auth";
import { fetchProject } from "../services/projects";

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

function formatStatus(status) {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusChipClass(status) {
  if (status === "pending") return "status-chip status-chip--pending";
  if (status === "active" || status === "ongoing")
    return "status-chip status-chip--paid";
  if (status === "completed") return "status-chip status-chip--paid";
  if (status === "overdue") return "status-chip status-chip--overdue";
  return "status-chip";
}

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <DashboardLayout
      title="Project Details"
      kicker="Projects"
      footerNote="Project details panel"
    >
      <section className="dashboard-card project-detail-card">
        {/* Back Link */}
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
    </DashboardLayout>
  );
}

export default ProjectDetailPage;
