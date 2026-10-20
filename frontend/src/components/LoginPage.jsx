import { useState } from "react";
import { login } from "../api/auth";
import { saveSession } from "../api/session";
import Icon from "./Icon.jsx";
import PasswordField from "./PasswordField.jsx";

export default function LoginPage({ onSuccess, theme, onToggleTheme }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const data = await login({
        username: username.trim(),
        password: password.trim(),
      });
      if (data?.user?.roleName !== "Admin") {
        setError("Tài khoản này không có quyền quản trị.");
        return;
      }

      const session = {
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      };
      saveSession(session);
      onSuccess(session);
    } catch (err) {
      setError(err.message || "Không đăng nhập được.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <button
        type="button"
        className="icon-btn login-theme"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
        title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
      >
        <Icon name={theme === "dark" ? "fa-sun" : "fa-moon"} />
      </button>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="brand-mark">
            <Icon name="fa-shield-halved" />
          </span>
          <div>
            <strong>Admin</strong>
            <small>Đăng nhập để quản trị vai trò và người dùng</small>
          </div>
        </div>

        {error ? (
          <div className="banner is-error" role="alert">
            <Icon name="fa-triangle-exclamation" />
            <span>{error}</span>
          </div>
        ) : null}

        <label className="field">
          <span className="field-label">
            <Icon name="fa-at" />
            Tên đăng nhập
          </span>
          <input
            required
            autoFocus
            autoComplete="username"
            maxLength={50}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Tên đăng nhập"
          />
        </label>

        <PasswordField
          label="Mật khẩu"
          icon="fa-lock"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mật khẩu"
        />

        <button
          type="submit"
          className="primary"
          disabled={submitting || username.trim() === "" || password.trim() === ""}
        >
          <Icon name={submitting ? "fa-spinner fa-spin" : "fa-right-to-bracket"} />
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
