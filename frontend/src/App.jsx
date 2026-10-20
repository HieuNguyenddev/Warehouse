import { useCallback, useEffect, useState } from "react";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "./api/roles";
import RoleForm from "./components/RoleForm.jsx";
import RoleTable from "./components/RoleTable.jsx";

const emptyForm = { name: "", description: "" };

export default function App() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không tải được danh sách vai trò.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(role) {
    setEditingId(role.id);
    setForm({
      name: role.name || "",
      description: role.description || "",
    });
    setNotice("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

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
      resetForm();
      await loadRoles();
    } catch (err) {
      setError(err.message || "Không lưu được vai trò.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    const ok = window.confirm(`Xóa vai trò "${role.name}"?`);
    if (!ok) {
      return;
    }

    setError("");
    setNotice("");
    try {
      await deleteRole(role.id);
      if (editingId === role.id) {
        resetForm();
      }
      setNotice("Đã xóa vai trò.");
      await loadRoles();
    } catch (err) {
      setError(err.message || "Không xóa được vai trò.");
    }
  }

  return (
    <div className="shell">
      <aside className="rail">
        <p className="brand">minhhieudev</p>
        <h1>Role Admin</h1>
        <p className="lede">
          Quản lý vai trò qua API đã deploy tại{" "}
          <code>api.minhhieudev.id.vn</code>.
        </p>
        <nav className="nav">
          <span className="nav-item is-active">Vai trò</span>
        </nav>
      </aside>

      <main className="stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quản trị</p>
            <h2>Danh sách vai trò</h2>
          </div>
          <button type="button" className="ghost" onClick={loadRoles} disabled={loading}>
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
        </header>

        {error ? <div className="banner is-error">{error}</div> : null}
        {notice ? <div className="banner is-ok">{notice}</div> : null}

        <section className="panel">
          <RoleForm
            form={form}
            editingId={editingId}
            saving={saving}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </section>

        <section className="panel">
          <RoleTable
            roles={roles}
            loading={loading}
            editingId={editingId}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </section>
      </main>
    </div>
  );
}
