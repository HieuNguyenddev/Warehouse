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

export default function UserTable({
  users,
  loading,
  failed,
  editingId,
  passwordId,
  query,
  onEdit,
  onPassword,
  onDelete,
  onCreate,
  onClearQuery,
}) {
  if (loading && users.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && users.length === 0) {
    return null;
  }

  if (!loading && users.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-folder-open" />
        </span>
        <h3>Chưa có người dùng</h3>
        <p>Tạo người dùng và gán một vai trò để bắt đầu.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Thêm người dùng
        </button>
      </div>
    );
  }

  if (users.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>Không tìm thấy người dùng khớp với “{query}”.</p>
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
        {users.map((user) => {
          const active = editingId === user.id || passwordId === user.id;
          return (
            <li key={user.id} className={active ? "role-card is-editing" : "role-card"}>
              <div className="role-id">
                <span className="avatar">{initials(user.fullName || user.username)}</span>
                <div>
                  <strong>{user.fullName}</strong>
                  <span className="meta">@{user.username}</span>
                </div>
              </div>
              <p>
                <span className="role-badge">{user.roleName || "Chưa có vai trò"}</span>
              </p>
              <div className="card-meta">
                <span>
                  <Icon name="fa-calendar-plus" /> {formatDate(user.createdAt)}
                </span>
                <span>
                  <Icon name="fa-clock-rotate-left" /> {user.updatedAt ? formatDate(user.updatedAt) : "Chưa cập nhật"}
                </span>
              </div>
              <div className="row-actions">
                <button type="button" className="ghost compact" onClick={() => onEdit(user)}>
                  <Icon name="fa-pen" /> Sửa
                </button>
                <button type="button" className="ghost compact" onClick={() => onPassword(user)}>
                  <Icon name="fa-key" /> Mật khẩu
                </button>
                <button type="button" className="danger compact" onClick={() => onDelete(user)}>
                  <Icon name="fa-trash" /> Xóa
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Tạo lúc</th>
              <th>Cập nhật</th>
              <th className="col-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const active = editingId === user.id || passwordId === user.id;
              return (
                <tr key={user.id} className={active ? "is-editing" : undefined}>
                  <td>
                    <div className="role-id">
                      <span className="avatar">{initials(user.fullName || user.username)}</span>
                      <div>
                        <strong>{user.fullName}</strong>
                        <span className="meta">@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-badge">{user.roleName || "Chưa có vai trò"}</span>
                  </td>
                  <td className="when">
                    <Icon name="fa-calendar-plus" />
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="when">
                    {user.updatedAt ? (
                      <>
                        <Icon name="fa-clock-rotate-left" />
                        {formatDate(user.updatedAt)}
                      </>
                    ) : (
                      <span className="muted">Chưa cập nhật</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Sửa"
                      onClick={() => onEdit(user)}
                      aria-label={`Sửa ${user.username}`}
                    >
                      <Icon name="fa-pen" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Đổi mật khẩu"
                      onClick={() => onPassword(user)}
                      aria-label={`Đổi mật khẩu ${user.username}`}
                    >
                      <Icon name="fa-key" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn is-danger"
                      title="Xóa"
                      onClick={() => onDelete(user)}
                      aria-label={`Xóa ${user.username}`}
                    >
                      <Icon name="fa-trash" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
