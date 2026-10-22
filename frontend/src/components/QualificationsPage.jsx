import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserProfiles } from "../api/userProfiles";
import {
  createQualification,
  deleteQualification,
  getQualifications,
  updateQualification,
} from "../api/qualifications";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import QualificationForm from "./QualificationForm.jsx";
import QualificationTable from "./QualificationTable.jsx";

const emptyForm = {
  userProfileId: "",
  kind: "1",
  name: "",
  major: "",
  grade: "",
  issuer: "",
  credentialNumber: "",
  issuedOn: "",
  expiresOn: "",
  note: "",
  documentUrl: "",
  documentName: "",
};

function dayValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

export default function QualificationsPage({ onCount }) {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyForm);
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

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [qualificationData, profileData] = await Promise.all([getQualifications(), getUserProfiles()]);
      const list = Array.isArray(qualificationData) ? qualificationData : [];
      setItems(list);
      setProfiles(Array.isArray(profileData) ? profileData : []);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách bằng cấp và chứng chỉ.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
      return items;
    }
    return items.filter((item) =>
      [
        item.name,
        item.major,
        item.grade,
        item.issuer,
        item.credentialNumber,
        item.profileName,
        item.employeeCode,
        item.username,
        String(item.kind) === "2" ? "chứng chỉ" : "bằng cấp",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = slicePage(filtered, page);
  const degrees = items.filter((item) => String(item.kind) !== "2").length;
  const certificates = items.filter((item) => String(item.kind) === "2").length;

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

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      userProfileId: item.userProfileId ? String(item.userProfileId) : "",
      kind: String(item.kind || 1),
      name: item.name || "",
      major: item.major || "",
      grade: item.grade || "",
      issuer: item.issuer || "",
      credentialNumber: item.credentialNumber || "",
      issuedOn: dayValue(item.issuedOn),
      expiresOn: dayValue(item.expiresOn),
      note: item.note || "",
      documentUrl: item.documentUrl || "",
      documentName: item.documentName || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.issuedOn && form.expiresOn && form.expiresOn < form.issuedOn) {
      setFormError("Ngày hết hạn phải từ ngày cấp trở đi.");
      return;
    }
    if (!form.userProfileId) {
      setFormError("Chọn hồ sơ nhân sự.");
      return;
    }

    setSaving(true);
    setFormError("");
    const payload = {
      userProfileId: Number(form.userProfileId),
      kind: Number(form.kind),
      name: form.name.trim(),
      major: form.major.trim() || null,
      grade: form.grade.trim() || null,
      issuer: form.issuer.trim() || null,
      credentialNumber: form.credentialNumber.trim() || null,
      issuedOn: form.issuedOn || null,
      expiresOn: form.expiresOn || null,
      note: form.note.trim() || null,
      documentUrl: form.documentUrl || null,
      documentName: form.documentName || null,
    };

    try {
      if (editingId == null) {
        await createQualification(payload);
        setNotice("Đã thêm bằng cấp hoặc chứng chỉ.");
      } else {
        await updateQualification(editingId, payload);
        setNotice("Đã cập nhật bằng cấp hoặc chứng chỉ.");
      }
      setFormOpen(false);
      resetForm();
      await loadItems();
    } catch (err) {
      setFormError(err.message || "Không lưu được.");
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
      await deleteQualification(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa “${pendingDelete.name}”.`);
      setPendingDelete(null);
      await loadItems();
    } catch (err) {
      setError(err.message || "Không xóa được.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Bằng cấp</span></p>
          <h1>Bằng cấp & chứng chỉ</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, nhân sự, nơi cấp hoặc số hiệu"
            aria-label="Tìm bằng cấp hoặc chứng chỉ"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadItems} disabled={loading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={openCreate} disabled={profiles.length === 0 && !loading}>
            <Icon name="fa-plus" />
            Thêm mới
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-certificate" />
          </span>
          <div>
            <p>Tổng số</p>
            <strong>{loading && items.length === 0 ? "—" : items.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-graduation-cap" />
          </span>
          <div>
            <p>Bằng cấp</p>
            <strong>{loading && items.length === 0 ? "—" : degrees}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-award" />
          </span>
          <div>
            <p>Chứng chỉ</p>
            <strong>{loading && items.length === 0 ? "—" : certificates}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadItems}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Mỗi mục gắn với một hồ sơ. Chứng chỉ hết hạn được đánh dấu trên cột hết hạn.</p>
          </div>
        </div>
        <QualificationTable
          items={paged.items}
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
            aria-labelledby="qualification-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <QualificationForm
              form={form}
              profiles={profiles}
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
            aria-labelledby="delete-qualification-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-qualification-title">Xóa mục này?</h3>
            <p>
              <strong>{pendingDelete.name}</strong> của {pendingDelete.profileName} sẽ bị xóa và không thể hoàn tác.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
