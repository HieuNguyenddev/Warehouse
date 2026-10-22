import { useCallback, useEffect, useMemo, useState } from "react";
import { getProvinces, getWards } from "../api/locations";
import { createWarehouse, deleteWarehouse, getWarehouses, updateWarehouse } from "../api/warehouses";
import Icon from "./Icon.jsx";
import Pager, { slicePage } from "./Pager.jsx";
import WarehouseForm from "./WarehouseForm.jsx";
import WarehouseTable from "./WarehouseTable.jsx";

const emptyForm = {
  name: "",
  code: "",
  phone: "",
  address: "",
  provinceCode: "",
  wardCode: "",
  note: "",
  isActive: true,
};

export default function WarehousesPage({ onCount }) {
  const [warehouses, setWarehouses] = useState([]);
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
  const [provinces, setProvinces] = useState([]);
  const [wardsByProvince, setWardsByProvince] = useState({});
  const [placesLoading, setPlacesLoading] = useState(true);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWarehouses();
      const list = Array.isArray(data) ? data : [];
      setWarehouses(list);
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách kho hàng.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    let cancelled = false;
    getProvinces()
      .then((data) => {
        if (!cancelled) {
          setProvinces(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProvinces([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPlacesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provinceCodes = useMemo(() => {
    const codes = new Set();
    warehouses.forEach((warehouse) => {
      if (warehouse.provinceCode) {
        codes.add(String(warehouse.provinceCode));
      }
    });
    if (form.provinceCode) {
      codes.add(String(form.provinceCode));
    }
    return [...codes];
  }, [warehouses, form.provinceCode]);

  useEffect(() => {
    const missing = provinceCodes.filter((code) => !wardsByProvince[code]);
    if (missing.length === 0) {
      return undefined;
    }

    let cancelled = false;
    missing.forEach((code) => {
      getWards(code)
        .then((data) => {
          if (!cancelled) {
            setWardsByProvince((current) => ({ ...current, [code]: Array.isArray(data) ? data : [] }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setWardsByProvince((current) => ({ ...current, [code]: [] }));
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [provinceCodes, wardsByProvince]);

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

  function placeOf(warehouse) {
    const province = provinces.find((item) => String(item.code) === String(warehouse.provinceCode || ""));
    const wards = wardsByProvince[String(warehouse.provinceCode || "")] || [];
    const ward = wards.find((item) => String(item.code) === String(warehouse.wardCode || ""));
    return {
      province: province?.name || "",
      ward: ward?.name || "",
    };
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return warehouses;
    }
    return warehouses.filter((warehouse) => {
      const place = placeOf(warehouse);
      return `${warehouse.name || ""} ${warehouse.code || ""} ${warehouse.phone || ""} ${warehouse.address || ""} ${place.province} ${place.ward} ${warehouse.note || ""} ${warehouse.isActive ? "đang hoạt động" : "ngừng hoạt động"}`
        .toLowerCase()
        .includes(needle);
    });
  }, [warehouses, query, provinces, wardsByProvince]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = slicePage(filtered, page);
  const activeCount = warehouses.filter((warehouse) => warehouse.isActive).length;
  const formWards = wardsByProvince[String(form.provinceCode || "")] || [];

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

  function startEdit(warehouse) {
    setEditingId(warehouse.id);
    setForm({
      name: warehouse.name || "",
      code: warehouse.code || "",
      phone: warehouse.phone || "",
      address: warehouse.address || "",
      provinceCode: warehouse.provinceCode || "",
      wardCode: warehouse.wardCode || "",
      note: warehouse.note || "",
      isActive: warehouse.isActive !== false,
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
      code: form.code.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      provinceCode: form.provinceCode || null,
      wardCode: form.provinceCode ? form.wardCode || null : null,
      note: form.note.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (editingId == null) {
        await createWarehouse(payload);
        setNotice("Đã tạo kho hàng mới.");
      } else {
        await updateWarehouse(editingId, payload);
        setNotice("Đã cập nhật kho hàng.");
      }
      setFormOpen(false);
      resetForm();
      await loadWarehouses();
    } catch (err) {
      setFormError(err.message || "Không lưu được kho hàng.");
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
      await deleteWarehouse(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        closeForm();
      }
      setNotice(`Đã xóa “${pendingDelete.name}”.`);
      setPendingDelete(null);
      await loadWarehouses();
    } catch (err) {
      setError(err.message || "Không xóa được kho hàng.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Kho hàng</span></p>
          <h1>Kho hàng</h1>
        </div>
        <label className="search">
          <Icon name="fa-magnifying-glass" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, mã, địa chỉ hoặc điện thoại"
            aria-label="Tìm kho hàng"
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Xóa từ khóa">
              <Icon name="fa-xmark" />
            </button>
          ) : null}
        </label>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadWarehouses} disabled={loading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={openCreate}>
            <Icon name="fa-plus" />
            Tạo kho
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Tóm tắt">
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-warehouse" />
          </span>
          <div>
            <p>Tổng kho</p>
            <strong>{loading && warehouses.length === 0 ? "—" : warehouses.length}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-circle-check" />
          </span>
          <div>
            <p>Đang hoạt động</p>
            <strong>{loading && warehouses.length === 0 ? "—" : activeCount}</strong>
          </div>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Icon name="fa-filter" />
          </span>
          <div>
            <p>Đang hiển thị</p>
            <strong>{loading && warehouses.length === 0 ? "—" : filtered.length}</strong>
          </div>
        </article>
      </section>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" className="text-btn" onClick={loadWarehouses}>
            Thử lại
          </button>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách</h2>
            <p>Bấm một dòng để xem đầy đủ. Kho đang hoạt động được xếp trước.</p>
          </div>
        </div>
        <WarehouseTable
          warehouses={paged.items}
          loading={loading}
          failed={Boolean(error)}
          editingId={editingId}
          query={query.trim()}
          placeOf={placeOf}
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
            aria-labelledby="warehouse-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <WarehouseForm
              form={form}
              editingId={editingId}
              saving={saving}
              error={formError}
              provinces={provinces}
              wards={formWards}
              placesLoading={placesLoading}
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
            aria-labelledby="delete-warehouse-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="danger-mark">
              <Icon name="fa-trash" />
            </span>
            <h3 id="delete-warehouse-title">Xóa kho hàng này?</h3>
            <p>
              <strong>{pendingDelete.name}</strong> sẽ bị xóa và không thể hoàn tác.
            </p>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                <Icon name="fa-arrow-left" />
                Giữ lại
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                <Icon name={deleting ? "fa-spinner fa-spin" : "fa-trash"} />
                {deleting ? "Đang xóa…" : "Xóa kho"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
