import { useCallback, useEffect, useMemo, useState } from "react";
import { getPositions } from "../api/positions";
import { getUsers } from "../api/users";
import { createUserProfile, deleteUserProfile, getUserProfiles, updateUserProfile } from "../api/userProfiles";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import { alignEmployeeCodes, emptyProfileForm, formToPayload, profileToForm } from "./profileLabels.js";
import ProfileBoard from "./ProfileBoard.jsx";
import ProfileCv from "./ProfileCv.jsx";
import UserProfileForm from "./UserProfileForm.jsx";
import UserProfileTable from "./UserProfileTable.jsx";
import { usePlaceNames } from "./usePlaceNames.js";

const VIEW_KEY = "warehouse.profileView";
const ORDER_KEY = "warehouse.profileOrder";

function readView() {
  const saved = window.localStorage.getItem(VIEW_KEY);
  return saved === "board" ? saved : "table";
}

function readOrder() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

export default function UserProfilesPage({ onCount }) {
  const [profiles, setProfiles] = useState([]);
  const [positions, setPositions] = useState([]);
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
  const [view, setView] = useState(readView);
  const [order, setOrder] = useState(readOrder);
  const [cvOpen, setCvOpen] = useState(false);
  const [cvProfileId, setCvProfileId] = useState(null);
  const [cvProvince, setCvProvince] = useState("");

  const applyProfile = useCallback((saved) => {
    if (!saved?.id) {
      return;
    }

    setProfiles((current) => {
      const next = current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
        : [...current, saved];
      return next.sort((left, right) => String(left.fullName).localeCompare(String(right.fullName), "vi") || left.id - right.id);
    });
    window.dispatchEvent(new CustomEvent("profile:avatar", {
      detail: { userId: saved.userId, avatarUrl: saved.avatarUrl || "" },
    }));
  }, []);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileData, userData, positionData] = await Promise.all([getUserProfiles(), getUsers(), getPositions()]);
      const list = Array.isArray(profileData) ? profileData : [];
      setProfiles((current) => list.map((item) => {
        const previous = current.find((profile) => profile.id === item.id);
        return {
          ...previous,
          ...item,
          employeeCode: item.employeeCode || previous?.employeeCode || "",
          positionId: item.positionId ?? previous?.positionId ?? null,
          positionName: item.positionName || previous?.positionName || "",
          positionCode: item.positionCode || previous?.positionCode || "",
        };
      }));
      setUsers(Array.isArray(userData) ? userData : []);
      setPositions(Array.isArray(positionData) ? positionData : []);
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
    const locked = formOpen || pendingDelete || cvOpen;
    document.body.classList.toggle("is-locked", locked);
    if (!locked) {
      return undefined;
    }

    function onKey(event) {
      if (event.key === "Escape" && !saving && !deleting) {
        if (pendingDelete) {
          setPendingDelete(null);
          return;
        }
        if (formOpen) {
          closeForm();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
    };
  }, [formOpen, pendingDelete, cvOpen, saving, deleting]);

  const places = usePlaceNames(profiles, cvProvince || form.provinceCode);

  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (loading && profiles.length === 0) {
      return;
    }
    const ids = profiles.map((profile) => profile.id);
    setOrder((current) => {
      const kept = current.filter((id) => ids.includes(id));
      const rest = ids.filter((id) => !kept.includes(id));
      const next = [...kept, ...rest];
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [profiles, loading]);

  useEffect(() => {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }, [order]);

  const alignedProfiles = useMemo(
    () => alignEmployeeCodes(profiles, positions),
    [profiles, positions],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return alignedProfiles;
    }
    return alignedProfiles.filter((profile) =>
      [
        profile.fullName,
        profile.username,
        profile.phoneNumber,
        profile.email,
        profile.identityNumber,
        profile.employeeCode,
        profile.positionName,
        profile.positionCode,
        profile.address,
        places.placeLabel(profile),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [alignedProfiles, query, places]);

  const boardProfiles = useMemo(() => {
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...filtered].sort((left, right) => (rank.get(left.id) ?? 9999) - (rank.get(right.id) ?? 9999));
  }, [filtered, order]);

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

  function moveProfile(fromId, toId) {
    setOrder((current) => {
      const next = current.filter((id) => id !== fromId);
      const index = next.indexOf(toId);
      if (index < 0) {
        return current;
      }
      next.splice(index, 0, fromId);
      return next;
    });
  }

  function openCv(profile) {
    const target = profile || boardProfiles.find((item) => item.id === cvProfileId) || boardProfiles[0] || null;
    setCvProfileId(target?.id ?? null);
    setCvOpen(true);
  }

  async function saveCv(id, draft) {
    setSaving(true);
    try {
      const saved = await updateUserProfile(id, formToPayload(draft));
      applyProfile(saved);
      setNotice(saved?.employeeCode ? `Đã cập nhật hồ sơ. Mã nhân viên ${saved.employeeCode}.` : "Đã cập nhật hồ sơ.");
      await loadProfiles();
      return saved;
    } finally {
      setSaving(false);
    }
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
      const saved = editingId == null
        ? await createUserProfile(payload)
        : await updateUserProfile(editingId, payload);
      applyProfile(saved);
      setNotice(saved?.employeeCode
        ? `${editingId == null ? "Đã tạo hồ sơ" : "Đã cập nhật hồ sơ"}. Mã nhân viên ${saved.employeeCode}.`
        : (editingId == null ? "Đã tạo hồ sơ mới." : "Đã cập nhật hồ sơ."));
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

      <section className={view === "table" ? "panel" : "panel panel-fill"}>
        <div className="panel-head is-split">
          <div>
            <h2>{view === "board" ? "Kéo thả" : "Danh sách"}</h2>
            <p>
              {view === "board"
                ? "Kéo tay cầm để sắp xếp. Thêm, sửa hoặc xóa ngay trên từng thẻ."
                : "Bấm một dòng để xem đủ giấy tờ, liên hệ và địa chỉ."}
            </p>
          </div>
          <div className="view-switch" role="tablist" aria-label="Kiểu xem hồ sơ">
            <button type="button" className={view === "table" ? "is-active" : ""} onClick={() => setView("table")}>
              <Icon name="fa-table" />
              Bảng
            </button>
            <button type="button" className={cvOpen ? "is-active" : ""} onClick={() => openCv()}>
              <Icon name="fa-id-card" />
              CV
            </button>
            <button type="button" className={view === "board" ? "is-active" : ""} onClick={() => setView("board")}>
              <Icon name="fa-grip" />
              Kéo thả
            </button>
          </div>
        </div>
        {view === "table" ? (
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
            placeLabel={places.placeLabel}
            placeOf={places.placeOf}
          />
        ) : null}
        {view === "board" ? (
          <ProfileBoard
            profiles={boardProfiles}
            loading={loading}
            failed={Boolean(error)}
            query={query.trim()}
            placeLabel={places.placeLabel}
            onEdit={startEdit}
            onDelete={setPendingDelete}
            onCreate={openCreate}
            onClearQuery={() => setQuery("")}
            onReorder={moveProfile}
          />
        ) : null}
        {view === "board" ? null : (
          <Pager
            page={paged.current}
            pageCount={paged.pageCount}
            total={paged.total}
            start={paged.start}
            onPage={setPage}
          />
        )}
      </section>

      {notice ? (
        <div className="toast" role="status">
          <Icon name="fa-circle-check" />
          <span>{notice}</span>
        </div>
      ) : null}

      {cvOpen ? (
        <ProfileCv
          profiles={boardProfiles}
          profileId={cvProfileId}
          provinces={places.provinces}
          wards={places.wards}
          placesError={places.error}
          saving={saving}
          onSelect={setCvProfileId}
          onProvince={setCvProvince}
          onSave={saveCv}
          onDelete={setPendingDelete}
          onCreate={openCreate}
          onClose={() => setCvOpen(false)}
          blocked={formOpen || Boolean(pendingDelete)}
          positions={positions}
          onPositions={setPositions}
        />
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
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              provinces={places.provinces}
              wards={places.wards}
              placesError={places.error}
              placesLoading={places.loading}
              positions={positions}
              profiles={alignedProfiles}
              onPositions={setPositions}
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
