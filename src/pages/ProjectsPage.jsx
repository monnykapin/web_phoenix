import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "../lib/toast";
import { getAccessToken } from "../services/auth";
import { createProject, fetchProjects } from "../services/projects";

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

function ProjectsPage() {
  const navigate = useNavigate();
  const pageSize = 25;
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState("");
  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    description: "",
    scopeText: "",
    memberUser: "",
    memberRole: "developer",
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      setLoadingProjects(true);
      setProjectsError("");

      try {
        const accessToken = getAccessToken();
        const data = await fetchProjects(accessToken, {
          offset: (page - 1) * pageSize,
          limit: pageSize,
          status: statusFilter === "all" ? "" : statusFilter,
        });

        if (active) {
          setProjects(data.projects);
          setTotal(data.total);
        }
      } catch (error) {
        if (active) {
          setProjectsError(error.message || "Unable to load projects list.");
        }
      } finally {
        if (active) {
          setLoadingProjects(false);
        }
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [page, statusFilter, reloadKey]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const searchableFields = [
        project._id,
        project.id,
        project.name,
        project.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchableFields.includes(query);
    });
  }, [projects, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectForm.name.trim()) return;

    setCreatingProject(true);
    setCreateProjectError("");

    try {
      const accessToken = getAccessToken();

      // Format scope items with leading dash if omitted
      const scope = newProjectForm.scopeText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => (line.startsWith("-") ? line : `- ${line}`));

      // Format member array if provided
      const member = newProjectForm.memberUser.trim()
        ? [
            {
              user: newProjectForm.memberUser.trim(),
              role: newProjectForm.memberRole || "developer",
            },
          ]
        : [];

      const payload = {
        name: newProjectForm.name.trim(),
        description: newProjectForm.description.trim(),
        scope,
        tasks: [],
        member,
      };

      const created = await createProject(accessToken, payload);

      toast.success("Project created successfully.");
      setShowCreateModal(false);
      setNewProjectForm({
        name: "",
        description: "",
        scopeText: "",
        memberUser: "",
        memberRole: "developer",
      });

      if (created) {
        setProjects((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
      }
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setCreateProjectError(err.message || "Failed to create project.");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <DashboardLayout title="Projects" footerNote="Project management panel">
      <section
        className="dashboard-card"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <div className="card-title-row" style={{ marginBottom: "20px" }}>
          <div>
            <h2>Project List</h2>
            <p className="hero-subtext">
              Track and manage projects, scopes, and team assignments.
            </p>
          </div>
          <button
            type="button"
            className="add-contribution-btn"
            onClick={() => {
              setCreateProjectError("");
              setShowCreateModal(true);
            }}
          >
            + Add Project
          </button>
        </div>

        <div className="rental-filters" style={{ marginBottom: "20px" }}>
          <label className="guest-search">
            <span className="guest-search-label">Search</span>
            <input
              type="text"
              placeholder="Search by name or project ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="guest-search guest-status-filter">
            <span className="guest-search-label">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <button
            type="button"
            className="clear-filter-btn"
            onClick={clearFilters}
          >
            Clear Filter
          </button>
        </div>

        {loadingProjects ? <p>Loading projects...</p> : null}

        {projectsError ? <p className="form-error">{projectsError}</p> : null}

        {!loadingProjects && !projectsError && filteredProjects.length === 0 ? (
          <p>No projects found.</p>
        ) : null}

        {!loadingProjects && !projectsError && filteredProjects.length > 0 ? (
          <>
            <div className="guest-table-wrap">
              <table className="guest-table guest-table--rentals">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>Created Date</th>
                    <th>Updated Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const projectId = project._id || project.id;
                    return (
                      <tr
                        key={projectId}
                        className="project-row-clickable"
                        onClick={() =>
                          navigate(`/dashboard/projects/${projectId}`)
                        }
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            navigate(`/dashboard/projects/${projectId}`);
                          }
                        }}
                      >
                        <td>
                          <code
                            className="system-info-val"
                            style={{ fontSize: "0.84rem" }}
                          >
                            {projectId || "-"}
                          </code>
                        </td>
                        <td>
                          <Link
                            to={`/dashboard/projects/${projectId}`}
                            className="project-name-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <strong>{project.name || "-"}</strong>
                          </Link>
                        </td>
                        <td>{formatDate(project.createdAt)}</td>
                        <td>{formatDate(project.updatedAt)}</td>
                        <td>
                          <span className={statusChipClass(project.status)}>
                            {formatStatus(project.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>

      {/* Create Project Modal */}
      {showCreateModal ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => {
            if (!creatingProject) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="confirm-dialog create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="hero-kicker">New Project</p>
            <h3 id="create-project-title">Create Project</h3>

            <form className="create-form" onSubmit={handleCreateProject}>
              <label>
                <span className="guest-search-label">Project Name *</span>
                <input
                  type="text"
                  value={newProjectForm.name}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Created Project new112"
                  required
                />
              </label>

              <label>
                <span className="guest-search-label">Description</span>
                <input
                  type="text"
                  value={newProjectForm.description}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g. test"
                />
              </label>

              <label>
                <span className="guest-search-label">
                  Project Scope (one item per line)
                </span>
                <textarea
                  rows={3}
                  value={newProjectForm.scopeText}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({
                      ...prev,
                      scopeText: e.target.value,
                    }))
                  }
                  placeholder={"-testing new version\n-update new version"}
                />
              </label>

              <div className="create-form-row">
                <label className="create-form-grow">
                  <span className="guest-search-label">
                    Initial Member (User ID)
                  </span>
                  <input
                    type="text"
                    value={newProjectForm.memberUser}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({
                        ...prev,
                        memberUser: e.target.value,
                      }))
                    }
                    placeholder="e.g. 667c37eb6bb65f95c11e2418"
                  />
                </label>

                <label>
                  <span className="guest-search-label">Role</span>
                  <select
                    value={newProjectForm.memberRole}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({
                        ...prev,
                        memberRole: e.target.value,
                      }))
                    }
                  >
                    <option value="developer">Developer</option>
                    <option value="manager">Manager</option>
                    <option value="designer">Designer</option>
                    <option value="tester">Tester</option>
                    <option value="lead">Lead</option>
                  </select>
                </label>
              </div>

              {createProjectError ? (
                <p className="form-error">{createProjectError}</p>
              ) : null}

              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingProject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-primary"
                  disabled={creatingProject}
                >
                  {creatingProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default ProjectsPage;
