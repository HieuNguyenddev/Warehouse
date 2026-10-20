import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import PasswordField from "./PasswordField.jsx";

export default function PasswordForm({ user, form, saving, error, onChange, onSubmit, onCancel }) {
  const currentRef = useRef(null);
  const mismatch = form.confirmPassword !== "" && form.newPassword !== form.confirmPassword;
  const tooShort = form.newPassword.trim().length < 8;

  useEffect(() => {
    currentRef.current?.focus();
  }, [user.id]);

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name="fa-key" />
        </span>
        <div>
          <h3 id="password-form-title">Đổi mật khẩu</h3>
          <p>
            {user.fullName} · {user.username}
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

      <PasswordField
        inputRef={currentRef}
        label="Mật khẩu hiện tại"
        icon="fa-lock"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={(event) => onChange({ ...form, currentPassword: event.target.value })}
        placeholder="Nhập mật khẩu đang dùng"
      />

      <PasswordField
        label="Mật khẩu mới"
        icon="fa-key"
        minLength={8}
        autoComplete="new-password"
        value={form.newPassword}
        onChange={(event) => onChange({ ...form, newPassword: event.target.value })}
        placeholder="Tối thiểu 8 ký tự"
      />

      <PasswordField
        label="Nhập lại mật khẩu mới"
        icon="fa-check"
        minLength={8}
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={(event) => onChange({ ...form, confirmPassword: event.target.value })}
        placeholder="Gõ lại mật khẩu mới"
      />
      {mismatch ? <small className="count is-warn">Mật khẩu nhập lại không khớp.</small> : null}

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
            form.currentPassword.trim() === "" ||
            tooShort ||
            form.newPassword !== form.confirmPassword
          }
        >
          <Icon name={saving ? "fa-spinner fa-spin" : "fa-key"} />
          {saving ? "Đang đổi…" : "Đổi mật khẩu"}
        </button>
      </div>
    </form>
  );
}
