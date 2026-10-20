import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function RoleForm({
  form,
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}) {
  const nameRef = useRef(null);
  const isEdit = editingId != null;
  const nameLeft = 50 - form.name.length;
  const descriptionLeft = 250 - form.description.length;

  useEffect(() => {
    nameRef.current?.focus();
  }, [editingId]);

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-user-plus"} />
        </span>
        <div>
          <h3 id="role-form-title">{isEdit ? "Sửa vai trò" : "Vai trò mới"}</h3>
          <p>{isEdit ? `Đang chỉnh #${editingId}` : "Tên là bắt buộc và không được trùng."}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onCancel} disabled={saving} aria-label="Đóng">
          <Icon name="fa-xmark" />
        </button>
      </div>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      ) : null}

      <label className="field">
        <span className="field-label">
          <Icon name="fa-tag" />
          Tên vai trò
        </span>
        <input
          ref={nameRef}
          required
          maxLength={50}
          autoComplete="off"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="Ví dụ: Quản trị viên"
        />
        <small className={nameLeft <= 8 ? "count is-warn" : "count"}>{form.name.length}/50</small>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-align-left" />
          Mô tả
        </span>
        <textarea
          maxLength={250}
          rows={4}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          placeholder="Vai trò này được dùng để làm gì?"
        />
        <small className={descriptionLeft <= 20 ? "count is-warn" : "count"}>
          {form.description.length}/250
        </small>
      </label>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button type="submit" className="primary" disabled={saving || form.name.trim() === ""}>
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo vai trò"}
        </button>
      </div>
    </form>
  );
}
