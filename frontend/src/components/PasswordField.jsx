import { useState } from "react";
import Icon from "./Icon.jsx";

export default function PasswordField({
  label,
  icon,
  value,
  onChange,
  autoComplete,
  minLength,
  maxLength = 100,
  required = true,
  placeholder,
  inputRef,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field">
      <span className="field-label">
        <Icon name={icon} />
        {label}
      </span>
      <span className="secret">
        <input
          ref={inputRef}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
        <button
          type="button"
          className="icon-btn secret-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          <Icon name={visible ? "fa-eye-slash" : "fa-eye"} />
        </button>
      </span>
    </label>
  );
}
