import { useCallback, useEffect, useMemo, useState } from "react";
import { getRoles } from "../api/roles";
import { changePassword, createUser, deleteUser, getUsers, updateUser } from "../api/users";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import PasswordForm from "./PasswordForm.jsx";
import UserForm from "./UserForm.jsx";
import UserTable from "./UserTable.jsx";

const emptyForm = { username: "", fullName: "", password: "", roleId: "" };
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function UsersPage({ onCount, onOpenRoles }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
      const list = Array.isArray(userData) ? userData : [];
      setUsers(list);
      setRoles(Array.isArray(roleData) ? roleData : []);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const locked = formOpen || pendingDelete || passwordUser;
    document.body.classList.toggle("is-locked", locked);
    if (!locked) {
      return undefined;
    }

    function onKey(event) {
      if (event.key === "Escape" && !saving && !deleting && !changing) {
        closeForm();
        closePassword();
        setPendingDelete(null);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
    };
  }, [formOpen, pendingDelete, passwordUser, saving, deleting, changing]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? users.filter((user) =>
          `${user.username || ""} ${user.fullName || ""} ${user.roleName || ""}`
            .toLowerCase()
            .includes(needle),
        )
      : users;

    return [...list].sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [users, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = slicePage(filtered, page);
  const assignedRoles = new Set(users.map((user) => user.roleId)).size;

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

  function closePassword() {
    if (changing) {
      return;
    }
    setPasswordUser(null);
    setPasswordForm(emptyPassword);
    setPasswordError("");
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      username: user.username || "",
      fullName: user.fullName || "",
      password: "",
      roleId: user.roleId ? String(user.roleId) : "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function startPassword(user) {
    setPasswordUser(user);
    setPasswordForm(emptyPassword);
    setPasswordError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      roleId: Number(form.roleId),
    };

    try {
      if (editingId == null) {
        await createUser({ ...payload, password: form.password.trim() });
        setNotice("Đã tạo người dùng mới.");
      } else {
        await updateUser(editingId, payload);
        setNotice("Đã cập nhật người dùng.");
      }
      setFormOpen(false);
      resetForm();
      await loadUsers();
    } catch (err) {
      setFormError(err.message || "Không lưu được người dùng.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(event) {
    event.preventDefault();
    if (!passwordUser) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setChanging(true);
    setPasswordError("");
    try {
      await changePassword(passwordUser.id, {
        currentPassword: passwordForm.currentPassword.trim(),
        newPassword: passwordForm.newPassword.trim(),
      });
      setNotice(`Đã đổi mật khẩu của ${passwordUser.username}.`);
      setPasswordUser(null);
      setPasswordForm(emptyPassword);
      await loadUsers();
    } catch (err) {
      setPasswordError(err.message || "Không đổi được mật khẩu.");
    } finally {
      setChanging(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await deleteUser(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      if (passwordUser?.id === pendingDelete.id) {
        closePassword();
      }
      setNotice(`Đã xóa “${pendingDelete.username}”.`);
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Không xóa được người dùng.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Người dùng</span></p>
          <h1>Người dùng</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên đăng nhập, họ tên hoặc vai trò"
            aria-label="Tìm người dùng"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadUsers} disabled={loading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={openCreate}>
            <Icon name="fa-plus" />
            Thêm người dùng
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-users" />
          </span>
          <div>
            <p>Tổng người dùng</p>
            <strong>{loading && users.length === 0 ? "—" : users.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-user-shield" />
          </span>
          <div>
            <p>Vai trò đang gán</p>
            <strong>{loading && users.length === 0 ? "—" : assignedRoles}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && users.length === 0 ? "—" : filtered.length}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadUsers}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Bấm một dòng để xem đầy đủ. Mật khẩu không hiện trên danh sách.</p>
          </div>
        </div>
        <UserTable
          users={paged.items}
          loading={loading}
          failed={Boolean(error)}
          editingId={editingId}
          passwordId={passwordUser?.id ?? null}
          query={query.trim()}
          onEdit={startEdit}
          onPassword={startPassword}
          onDelete={setPendingDelete}
          onCreate={openCreate}
          onClearQuery={() => setQuery("")}
        />
        <Pager
          page={paged.current}
          pageCount={paged.pageCount}
          total={paged.total}
          start={paged.start}
          onPage={setPage}
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
            aria-labelledby="user-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <UserForm
              form={form}
              roles={roles}
              editingId={editingId}
              saving={saving}
              error={formError}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              onOpenRoles={() => {
                if (saving) {
                  return;
                }
                closeForm();
                onOpenRoles();
              }}
            />
          </div>
        </div>
      ) : null}

      {passwordUser ? (
        <div className="overlay" onClick={closePassword}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <PasswordForm
              user={passwordUser}
              form={passwordForm}
              saving={changing}
              error={passwordError}
              onChange={setPasswordForm}
              onSubmit={handlePassword}
              onCancel={closePassword}
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
            aria-labelledby="delete-user-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-user-title">Xóa người dùng này?</h3>
            <p>
              <strong>{pendingDelete.fullName}</strong> ({pendingDelete.username}) sẽ bị xóa và không thể hoàn tác.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa người dùng"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
