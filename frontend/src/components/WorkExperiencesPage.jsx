import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserProfiles } from "../api/userProfiles";
import {
  createWorkExperience,
  deleteWorkExperience,
  getWorkExperiences,
  updateWorkExperience,
} from "../api/workExperiences";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import WorkExperienceForm from "./WorkExperienceForm.jsx";
import WorkExperienceTable from "./WorkExperienceTable.jsx";

const emptyForm = {
  userProfileId: "",
  company: "",
  jobTitle: "",
  startedOn: "",
  endedOn: "",
  isCurrent: false,
  description: "",
};

function dayValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

export default function WorkExperiencesPage({ onCount }) {
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
      const [experienceData, profileData] = await Promise.all([getWorkExperiences(), getUserProfiles()]);
      const list = Array.isArray(experienceData) ? experienceData : [];
      setItems(list);
      setProfiles(Array.isArray(profileData) ? profileData : []);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách kinh nghiệm làm việc.");
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
        item.company,
        item.jobTitle,
        item.description,
        item.profileName,
        item.employeeCode,
        item.username,
        item.isCurrent ? "đang làm" : "đã nghỉ",
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
  const currentJobs = items.filter((item) => item.isCurrent).length;

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
      company: item.company || "",
      jobTitle: item.jobTitle || "",
      startedOn: dayValue(item.startedOn),
      endedOn: dayValue(item.endedOn),
      isCurrent: Boolean(item.isCurrent),
      description: item.description || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const isCurrent = form.isCurrent === true;
    if (!form.userProfileId) {
      setFormError("Chọn hồ sơ nhân sự.");
      return;
    }
    if (!form.startedOn) {
      setFormError("Chọn ngày bắt đầu.");
      return;
    }
    if (!isCurrent && form.endedOn && form.endedOn < form.startedOn) {
      setFormError("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
      return;
    }

    setSaving(true);
    setFormError("");
    const payload = {
      userProfileId: Number(form.userProfileId),
      company: form.company.trim(),
      jobTitle: form.jobTitle.trim(),
      startedOn: form.startedOn,
      endedOn: isCurrent ? null : (form.endedOn || null),
      isCurrent,
      description: form.description.trim() || null,
    };

    try {
      if (editingId == null) {
        await createWorkExperience(payload);
        setNotice("Đã thêm kinh nghiệm làm việc.");
      } else {
        await updateWorkExperience(editingId, payload);
        setNotice("Đã cập nhật kinh nghiệm làm việc.");
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
      await deleteWorkExperience(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa kinh nghiệm tại “${pendingDelete.company}”.`);
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
          <p className="crumb">Trang chủ / <span>Kinh nghiệm</span></p>
          <h1>Kinh nghiệm làm việc</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo nơi làm, chức danh hoặc nhân sự"
            aria-label="Tìm kinh nghiệm làm việc"
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
            <Icon name="fa-user-clock" />
          </span>
          <div>
            <p>Tổng số</p>
            <strong>{loading && items.length === 0 ? "—" : items.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-briefcase" />
          </span>
          <div>
            <p>Đang làm</p>
            <strong>{loading && items.length === 0 ? "—" : currentJobs}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && items.length === 0 ? "—" : filtered.length}</strong>
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
            <p>Việc đang làm xếp trước. Ngày kết thúc để trống khi chưa rõ ngày nghỉ.</p>
          </div>
        </div>
        <WorkExperienceTable
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
            aria-labelledby="experience-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <WorkExperienceForm
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
            aria-labelledby="delete-experience-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-experience-title">Xóa kinh nghiệm này?</h3>
            <p>
              <strong>{pendingDelete.jobTitle}</strong> tại {pendingDelete.company} của {pendingDelete.profileName} sẽ bị xóa và không thể hoàn tác.
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
