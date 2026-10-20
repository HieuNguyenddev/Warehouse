import { useCallback, useEffect, useMemo, useState } from "react";
import { createRole, deleteRole, getRoles, updateRole } from "../api/roles";
import Icon from "./Icon.jsx";
import RoleForm from "./RoleForm.jsx";
import RoleTable from "./RoleTable.jsx";

const emptyForm = { name: "", description: "" };

export default function RolesPage({ onCount, onOpenNav }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRoles();
      const list = Array.isArray(data) ? data : [];
      setRoles(list);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách vai trò.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const locked = formOpen || pendingDelete;
    document.body.classList.toggle("is-locked", locked);
    if (!locked) {
      return undefined;
    }

    function onKey(event) {
      if (event.key === "Escape" && !saving && !deleting) {
        closeForm();
        setPendingDelete(null);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
    };
  }, [formOpen, pendingDelete, saving, deleting]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? roles.filter((role) =>
          `${role.name || ""} ${role.description || ""}`.toLowerCase().includes(needle),
        )
      : roles;

    return [...list].sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [roles, query]);

  const described = roles.filter((role) => role.description).length;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
  }

  function closeForm() {
    if (saving) {
      return;
    }
    setFormOpen(false);
    resetForm();
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(role) {
    setEditingId(role.id);
    setForm({
      name: role.name || "",
      description: role.description || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    };

    try {
      if (editingId == null) {
        await createRole(payload);
        setNotice("Đã tạo vai trò mới.");
      } else {
        await updateRole(editingId, payload);
        setNotice("Đã cập nhật vai trò.");
      }
      setFormOpen(false);
      resetForm();
      await loadRoles();
    } catch (err) {
      setFormError(err.message || "Không lưu được vai trò.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await deleteRole(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa “${pendingDelete.name}”.`);
      setPendingDelete(null);
      await loadRoles();
    } catch (err) {
      setError(err.message || "Không xóa được vai trò.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <button type="button" className="icon-btn menu-btn" onClick={onOpenNav} aria-label="Mở menu">
          <Icon name="fa-bars" />
        </button>
        <div className="titles">
          <p className="eyebrow">Quản trị hệ thống</p>
          <h1>Vai trò</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên hoặc mô tả"
            aria-label="Tìm vai trò"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <button type="button" className="ghost" onClick={loadRoles} disabled={loading}>
          <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
          Làm mới
        </button>
        <button type="button" className="primary" onClick={openCreate}>
          <Icon name="fa-plus" />
          Tạo vai trò
        </button>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-user-shield" />
          </span>
          <div>
            <p>Tổng vai trò</p>
            <strong>{loading && roles.length === 0 ? "—" : roles.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-file-lines" />
          </span>
          <div>
            <p>Có mô tả</p>
            <strong>{loading && roles.length === 0 ? "—" : described}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && roles.length === 0 ? "—" : filtered.length}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadRoles}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Sắp xếp theo lần cập nhật gần nhất.</p>
          </div>
        </div>
        <RoleTable
          roles={filtered}
          loading={loading}
          failed={Boolean(error)}
          editingId={editingId}
          query={query.trim()}
          onEdit={startEdit}
          onDelete={setPendingDelete}
          onCreate={openCreate}
          onClearQuery={() => setQuery("")}
        />
      </section>

      {notice ? (
        <div className="toast" role="status">
          <Icon name="fa-circle-check" />
          <span>{notice}</span>
        </div>
      ) : null}

      {formOpen ? (
        <div className="overlay" onClick={closeForm}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <RoleForm
              form={form}
              editingId={editingId}
              saving={saving}
              error={formError}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="overlay" onClick={() => !deleting && setPendingDelete(null)}>
          <div
            className="modal modal-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-title">Xóa vai trò này?</h3>
            <p>
              <strong>{pendingDelete.name}</strong> sẽ bị xóa và không thể hoàn tác. Vai trò đang có người dùng thì không xóa được.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa vai trò"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
