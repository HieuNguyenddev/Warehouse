import Icon from "./Icon.jsx";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  const day = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day} · ${time}`;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Skeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

export default function RoleTable({
  roles,
  loading,
  failed,
  editingId,
  query,
  onEdit,
  onDelete,
  onCreate,
  onClearQuery,
}) {
  if (loading && roles.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && roles.length === 0) {
    return null;
  }

  if (!loading && roles.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-folder-open" />
        </span>
        <h3>Chưa có vai trò</h3>
        <p>Tạo vai trò đầu tiên để bắt đầu phân quyền.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Tạo vai trò
        </button>
      </div>
    );
  }

  if (roles.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>
          Không tìm thấy vai trò khớp với “{query}”.
        </p>
        <button type="button" className="ghost" onClick={onClearQuery}>
          <Icon name="fa-eraser" />
          Xóa tìm kiếm
        </button>
      </div>
    );
  }

  return (
    <>
    <ul className="role-cards">
      {roles.map((role) => (
        <li key={role.id} className={editingId === role.id ? "role-card is-editing" : "role-card"}>
          <div className="role-id">
            <span className="avatar">{initials(role.name)}</span>
            <div>
              <strong>{role.name}</strong>
              <span className="meta">#{role.id}</span>
            </div>
          </div>
          <p>{role.description || <span className="muted">Chưa có mô tả</span>}</p>
          <div className="card-meta">
            <span><Icon name="fa-calendar-plus" /> {formatDate(role.createdAt)}</span>
            <span>
              <Icon name="fa-clock-rotate-left" /> {role.updatedAt ? formatDate(role.updatedAt) : "Chưa cập nhật"}
            </span>
          </div>
          <div className="row-actions">
            <button type="button" className="ghost compact" onClick={() => onEdit(role)}>
              <Icon name="fa-pen" /> Sửa
            </button>
            <button type="button" className="danger compact" onClick={() => onDelete(role)}>
              <Icon name="fa-trash" /> Xóa
            </button>
          </div>
        </li>
      ))}
    </ul>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Vai trò</th>
            <th>Mô tả</th>
            <th>Tạo lúc</th>
            <th>Cập nhật</th>
            <th className="col-actions">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className={editingId === role.id ? "is-editing" : undefined}>
              <td>
                <div className="role-id">
                  <span className="avatar">{initials(role.name)}</span>
                  <div>
                    <strong>{role.name}</strong>
                    <span className="meta">#{role.id}</span>
                  </div>
                </div>
              </td>
              <td className="desc">{role.description || <span className="muted">Chưa có mô tả</span>}</td>
              <td className="when">
                <Icon name="fa-calendar-plus" />
                {formatDate(role.createdAt)}
              </td>
              <td className="when">
                {role.updatedAt ? (
                  <>
                    <Icon name="fa-clock-rotate-left" />
                    {formatDate(role.updatedAt)}
                  </>
                ) : (
                  <span className="muted">Chưa cập nhật</span>
                )}
              </td>
              <td className="row-actions">
                <button type="button" className="icon-btn" title="Sửa" onClick={() => onEdit(role)} aria-label={`Sửa ${role.name}`}>
                  <Icon name="fa-pen" />
                </button>
                <button
                  type="button"
                  className="icon-btn is-danger"
                  title="Xóa"
                  onClick={() => onDelete(role)}
                  aria-label={`Xóa ${role.name}`}
                >
                  <Icon name="fa-trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
