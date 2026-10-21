import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import PasswordField from "./PasswordField.jsx";

export default function UserForm({
  form,
  roles,
  positions = [],
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
  onOpenRoles,
}) {
  const usernameRef = useRef(null);
  const isEdit = editingId != null;
  const usernameLeft = 50 - form.username.length;
  const fullNameLeft = 100 - form.fullName.length;
  const passwordTooShort = !isEdit && form.password.trim().length < 8;
  const missingRole = roles.length === 0 || form.roleId === "";

  useEffect(() => {
    usernameRef.current?.focus();
  }, [editingId]);

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-user-plus"} />
        </span>
        <div>
          <h3 id="user-form-title">{isEdit ? "Sửa người dùng" : "Người dùng mới"}</h3>
          <p>
            {isEdit
              ? `Đang chỉnh #${editingId}. Mật khẩu đổi riêng ở danh sách.`
              : "Tên đăng nhập không được trùng. Người dùng phải thuộc một vai trò."}
          </p>
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

      {roles.length === 0 ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>Chưa có vai trò để gán.</span>
          <button type="button" className="text-btn" onClick={onOpenRoles}>
            Tới vai trò
          </button>
        </div>
      ) : null}

      <label className="field">
        <span className="field-label">
          <Icon name="fa-at" />
          Tên đăng nhập
        </span>
        <input
          ref={usernameRef}
          required
          maxLength={50}
          autoComplete="off"
          value={form.username}
          onChange={(event) => onChange({ ...form, username: event.target.value })}
          placeholder="Ví dụ: hieu.nguyen"
        />
        <small className={usernameLeft <= 8 ? "count is-warn" : "count"}>{form.username.length}/50</small>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-id-card" />
          Họ tên
        </span>
        <input
          required
          maxLength={100}
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => onChange({ ...form, fullName: event.target.value })}
          placeholder="Ví dụ: Nguyễn Minh Hiếu"
        />
        <small className={fullNameLeft <= 12 ? "count is-warn" : "count"}>{form.fullName.length}/100</small>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-user-shield" />
          Vai trò
        </span>
        <select
          required
          value={form.roleId}
          onChange={(event) => onChange({ ...form, roleId: event.target.value })}
          disabled={roles.length === 0}
        >
          <option value="">Chọn vai trò</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-briefcase" />
          Chức vụ
        </span>
        <select
          value={form.positionId}
          onChange={(event) => onChange({ ...form, positionId: event.target.value })}
        >
          <option value="">Không gán chức vụ</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.code ? `${position.name} (${position.code})` : position.name}
            </option>
          ))}
        </select>
      </label>

      {isEdit ? null : (
        <PasswordField
          label="Mật khẩu"
          icon="fa-lock"
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => onChange({ ...form, password: event.target.value })}
          placeholder="Tối thiểu 8 ký tự"
        />
      )}

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button
          type="submit"
          className="primary"
          disabled={
            saving ||
            form.username.trim() === "" ||
            form.fullName.trim() === "" ||
            missingRole ||
            passwordTooShort
          }
        >
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
        </button>
      </div>
    </form>
  );
}
