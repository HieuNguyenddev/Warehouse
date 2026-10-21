import { useEffect } from "react";
import AvatarPhoto from "./AvatarPhoto.jsx";
import Icon from "./Icon.jsx";

export default function DetailDialog({ title, subtitle, initials, avatarUrl, fields, actions, onClose }) {
  useEffect(() => {
    const alreadyLocked = document.body.classList.contains("is-locked");
    document.body.classList.add("is-locked");

    function onKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      if (!alreadyLocked) {
        document.body.classList.remove("is-locked");
      }
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          {avatarUrl ? (
            <AvatarPhoto url={avatarUrl} name={title} className="avatar detail-avatar" />
          ) : (
            <span className="avatar detail-avatar">{initials}</span>
          )}
          <div>
            <h3 id="detail-title">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="fa-xmark" />
          </button>
        </div>
        <dl className="detail-grid">
          {fields.map((field) => (
            <div key={field.label} className={field.wide ? "is-wide" : undefined}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
        {actions.length > 0 ? (
          <div className="detail-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={action.tone ? `action-pill is-${action.tone}` : "action-pill"}
                onClick={action.onClick}
              >
                <Icon name={action.icon} />
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
