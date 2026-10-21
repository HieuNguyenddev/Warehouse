import { useCallback, useEffect, useMemo, useState } from "react";
import { createPosition, deletePosition, getPositions, updatePosition } from "../api/positions";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import PositionForm from "./PositionForm.jsx";
import PositionTable from "./PositionTable.jsx";

const emptyForm = { name: "", code: "", rank: "0", description: "" };

export default function PositionsPage({ onCount }) {
  const [positions, setPositions] = useState([]);
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

  const loadPositions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPositions();
      const list = Array.isArray(data) ? data : [];
      setPositions(list);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách chức vụ.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

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
      return positions;
    }
    return positions.filter((position) =>
      `${position.name || ""} ${position.code || ""} ${position.description || ""} cấp ${position.rank || 0}`
        .toLowerCase()
        .includes(needle),
    );
  }, [positions, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = slicePage(filtered, page);
  const ranked = positions.filter((position) => position.rank > 0).length;

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

  function startEdit(position) {
    setEditingId(position.id);
    setForm({
      name: position.name || "",
      code: position.code || "",
      rank: String(position.rank ?? 0),
      description: position.description || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const rank = form.rank === "" ? 0 : Number(form.rank);
    if (!Number.isInteger(rank) || rank < 0 || rank > 999) {
      setFormError("Cấp từ 0 đến 999.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      rank,
      description: form.description.trim() || null,
    };

    try {
      if (editingId == null) {
        await createPosition(payload);
        setNotice("Đã tạo chức vụ mới.");
      } else {
        await updatePosition(editingId, payload);
        setNotice("Đã cập nhật chức vụ.");
      }
      setFormOpen(false);
      resetForm();
      await loadPositions();
    } catch (err) {
      setFormError(err.message || "Không lưu được chức vụ.");
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
      await deletePosition(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa “${pendingDelete.name}”.`);
      setPendingDelete(null);
      await loadPositions();
    } catch (err) {
      setError(err.message || "Không xóa được chức vụ.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Chức vụ</span></p>
          <h1>Chức vụ</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, mã hoặc mô tả"
            aria-label="Tìm chức vụ"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadPositions} disabled={loading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={openCreate}>
            <Icon name="fa-plus" />
            Tạo chức vụ
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-briefcase" />
          </span>
          <div>
            <p>Tổng chức vụ</p>
            <strong>{loading && positions.length === 0 ? "—" : positions.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-ranking-star" />
          </span>
          <div>
            <p>Đã xếp cấp</p>
            <strong>{loading && positions.length === 0 ? "—" : ranked}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && positions.length === 0 ? "—" : filtered.length}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadPositions}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Bấm một dòng để xem đầy đủ. Danh sách xếp theo cấp, cấp 0 nằm cuối.</p>
          </div>
        </div>
        <PositionTable
          positions={paged.items}
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
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="position-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <PositionForm
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
            aria-labelledby="delete-position-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-position-title">Xóa chức vụ này?</h3>
            <p>
              <strong>{pendingDelete.name}</strong> sẽ bị xóa và không thể hoàn tác. Chức vụ đang có người dùng thì không xóa được.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa chức vụ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
