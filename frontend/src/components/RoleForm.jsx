export default function RoleForm({
  form,
  editingId,
  saving,
  onChange,
  onSubmit,
  onCancel,
}) {
  const isEdit = editingId != null;

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="panel-head">
        <h3>{isEdit ? `Sửa vai trò #${editingId}` : "Thêm vai trò"}</h3>
        <p>Tên tối đa 50 ký tự. Mô tả tối đa 250 ký tự.</p>
      </div>

      <label className="field">
        <span>Tên vai trò</span>
        <input
          required
          maxLength={50}
          value={form.name}
          onChange={(event) =>
            onChange({ ...form, name: event.target.value })
          }
          placeholder="Admin"
        />
      </label>

      <label className="field">
        <span>Mô tả</span>
        <textarea
          maxLength={250}
          rows={3}
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          placeholder="Quản trị hệ thống"
        />
      </label>

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Đang lưu…" : isEdit ? "Cập nhật" : "Tạo mới"}
        </button>
        {isEdit ? (
          <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
            Hủy
          </button>
        ) : null}
      </div>
    </form>
  );
}
