import { useCallback, useEffect, useMemo, useState } from "react";
import { getUsers } from "../api/users";
import { createUserProfile, deleteUserProfile, getUserProfiles, updateUserProfile } from "../api/userProfiles";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import { emptyProfileForm, formToPayload, profileToForm } from "./profileLabels.js";
import UserProfileForm from "./UserProfileForm.jsx";
import UserProfileTable from "./UserProfileTable.jsx";

export default function UserProfilesPage({ onCount }) {
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyProfileForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileData, userData] = await Promise.all([getUserProfiles(), getUsers()]);
      const list = Array.isArray(profileData) ? profileData : [];
      setProfiles(list);
      setUsers(Array.isArray(userData) ? userData : []);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

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
    if (!needle) {
      return profiles;
    }
    return profiles.filter((profile) =>
      [
        profile.fullName,
        profile.username,
        profile.phoneNumber,
        profile.email,
        profile.identityNumber,
        profile.address,
        profile.provinceCode,
        profile.wardCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [profiles, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = slicePage(filtered, page);
  const withIdentity = profiles.filter((profile) => profile.identityNumber).length;
  const profileUserIds = new Set(profiles.map((profile) => profile.userId));
  const selectableUsers = users.filter((user) => {
    if (editingId != null && String(user.id) === form.userId) {
      return true;
    }
    if (user.deletedAt) {
      return false;
    }
    return !profileUserIds.has(user.id);
  });

  function resetForm() {
    setForm(emptyProfileForm);
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

  function startEdit(profile) {
    setEditingId(profile.id);
    setForm(profileToForm(profile));
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = formToPayload(form);

    try {
      if (editingId == null) {
        await createUserProfile(payload);
        setNotice("Đã tạo hồ sơ mới.");
      } else {
        await updateUserProfile(editingId, payload);
        setNotice("Đã cập nhật hồ sơ.");
      }
      setFormOpen(false);
      resetForm();
      await loadProfiles();
    } catch (err) {
      setFormError(err.message || "Không lưu được hồ sơ.");
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
      await deleteUserProfile(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa hồ sơ “${pendingDelete.fullName}”.`);
      setPendingDelete(null);
      await loadProfiles();
    } catch (err) {
      setError(err.message || "Không xóa được hồ sơ.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Hồ sơ</span></p>
          <h1>Hồ sơ cá nhân</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, SĐT, email hoặc CCCD"
            aria-label="Tìm hồ sơ"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadProfiles} disabled={loading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={openCreate}>
            <Icon name="fa-plus" />
            Tạo hồ sơ
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-id-card" />
          </span>
          <div>
            <p>Tổng hồ sơ</p>
            <strong>{loading && profiles.length === 0 ? "—" : profiles.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-barcode" />
          </span>
          <div>
            <p>Đã có CCCD</p>
            <strong>{loading && profiles.length === 0 ? "—" : withIdentity}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && profiles.length === 0 ? "—" : filtered.length}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadProfiles}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Bấm một dòng để xem giấy tờ, liên hệ và địa chỉ. Mỗi tài khoản một hồ sơ.</p>
          </div>
        </div>
        <UserProfileTable
          profiles={paged.items}
          loading={loading}
          failed={Boolean(error)}
          editingId={editingId}
          query={query.trim()}
          onEdit={startEdit}
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
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <UserProfileForm
              form={form}
              users={selectableUsers}
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
            aria-labelledby="delete-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-profile-title">Xóa hồ sơ này?</h3>
            <p>
              Hồ sơ của <strong>{pendingDelete.fullName}</strong> sẽ bị xóa. Tài khoản đăng nhập vẫn còn.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa hồ sơ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
