import { useCallback, useState } from "react";
import DetailDialog from "./DetailDialog.jsx";
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

function accountStatus(user) {
  if (user.deletedAt) {
    return { label: "Đã xóa", tone: "deleted" };
  }
  if (user.isLocked) {
    return { label: "Đã khóa", tone: "locked" };
  }
  return { label: "Hoạt động", tone: "active" };
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
  onLock,
  lockingId,
  onCreate,
  onClearQuery,
}) {
  const [selected, setSelected] = useState(null);
  const closeDetail = useCallback(() => setSelected(null), []);

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
            <li
              key={user.id}
              className={active ? "role-card is-editing is-clickable" : "role-card is-clickable"}
              onClick={() => setSelected(user)}
            >
              <div className="role-id">
                <span className="avatar">{initials(user.fullName || user.username)}</span>
                <div>
                  <strong>{user.fullName}</strong>
                  <span className="meta">@{user.username}</span>
                </div>
              </div>
              <p>
                <span className="role-badge">{user.roleName || "Chưa có vai trò"}</span>{" "}
                <span className={`status-pill is-${accountStatus(user).tone}`}>{accountStatus(user).label}</span>
              </p>
              <div className="card-meta">
                <span>
                  <Icon name="fa-right-to-bracket" /> {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Chưa đăng nhập"}
                  {user.lastLoginIp ? ` · ${user.lastLoginIp}` : ""}
                </span>
                <span>
                  <Icon name="fa-calendar-plus" /> {formatDate(user.createdAt)}
                </span>
                <span>
                  <Icon name="fa-clock-rotate-left" /> {user.updatedAt ? formatDate(user.updatedAt) : "Chưa cập nhật"}
                </span>
                {user.deletedAt ? (
                  <span>
                    <Icon name="fa-trash" /> {formatDate(user.deletedAt)}
                  </span>
                ) : null}
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
              <th>Trạng thái</th>
              <th>Sai</th>
              <th>Đăng nhập cuối</th>
              <th>IP</th>
              <th>Tạo lúc</th>
              <th>Cập nhật</th>
              <th>Xóa mềm</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const active = editingId === user.id || passwordId === user.id;
              return (
                <tr
                  key={user.id}
                  className={[
                    "is-clickable",
                    active ? "is-editing" : "",
                    user.deletedAt ? "is-deleted" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelected(user)}
                >
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
                  <td>
                    <span className={`status-pill is-${accountStatus(user).tone}`}>{accountStatus(user).label}</span>
                  </td>
                  <td>{user.failedLoginCount || 0}</td>
                  <td className="when">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="muted">Chưa đăng nhập</span>}
                  </td>
                  <td className="ip">{user.lastLoginIp || <span className="muted">—</span>}</td>
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
                  <td className="when">
                    {user.deletedAt ? formatDate(user.deletedAt) : <span className="muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected ? (
        <DetailDialog
          title={selected.fullName}
          subtitle={`@${selected.username}`}
          initials={initials(selected.fullName || selected.username)}
          onClose={closeDetail}
          fields={[
            { label: "Họ tên", value: selected.fullName || "—" },
            { label: "Tên đăng nhập", value: selected.username || "—" },
            { label: "Vai trò", value: selected.roleName || "Chưa có vai trò" },
            { label: "Trạng thái", value: accountStatus(selected).label },
            { label: "Số lần đăng nhập sai", value: String(selected.failedLoginCount || 0) },
            { label: "Lần đăng nhập cuối", value: selected.lastLoginAt ? formatDate(selected.lastLoginAt) : "Chưa đăng nhập" },
            { label: "IP đăng nhập", value: selected.lastLoginIp || "—" },
            { label: "Ngày tạo", value: formatDate(selected.createdAt) },
            { label: "Ngày cập nhật", value: selected.updatedAt ? formatDate(selected.updatedAt) : "Chưa cập nhật" },
            { label: "Xóa mềm", value: selected.deletedAt ? formatDate(selected.deletedAt) : "Chưa xóa" },
          ]}
          actions={selected.deletedAt ? [] : [
            {
              label: "Sửa",
              icon: "fa-pen",
              onClick: () => {
                closeDetail();
                onEdit(selected);
              },
            },
            {
              label: "Đổi mật khẩu",
              icon: "fa-key",
              tone: "key",
              onClick: () => {
                closeDetail();
                onPassword(selected);
              },
            },
            {
              label: lockingId === selected.id ? "Đang lưu…" : selected.isLocked ? "Mở khóa" : "Khóa tài khoản",
              icon: selected.isLocked ? "fa-lock-open" : "fa-lock",
              onClick: () => {
                if (lockingId === selected.id) {
                  return;
                }
                closeDetail();
                onLock(selected);
              },
            },
            {
              label: "Xóa mềm",
              icon: "fa-trash",
              tone: "danger",
              onClick: () => {
                closeDetail();
                onDelete(selected);
              },
            },
          ]}
        />
      ) : null}
    </>
  );
}
