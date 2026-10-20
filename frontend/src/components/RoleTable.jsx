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
  const [selected, setSelected] = useState(null);
  const closeDetail = useCallback(() => setSelected(null), []);

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
        <li
          key={role.id}
          className={editingId === role.id ? "role-card is-editing is-clickable" : "role-card is-clickable"}
          onClick={() => setSelected(role)}
        >
          <div className="role-id">
            <span className="avatar">{initials(role.name)}</span>
            <div>
              <strong>{role.name}</strong>
              <span className="meta">#{role.id}</span>
            </div>
          </div>
          <p className="clamp">{role.description || <span className="muted">Chưa có mô tả</span>}</p>
          <div className="card-meta">
            <span><Icon name="fa-calendar-plus" /> {formatDate(role.createdAt)}</span>
            <span>
              <Icon name="fa-clock-rotate-left" /> {role.updatedAt ? formatDate(role.updatedAt) : "Chưa cập nhật"}
            </span>
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
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr
              key={role.id}
              className={editingId === role.id ? "is-editing is-clickable" : "is-clickable"}
              onClick={() => setSelected(role)}
            >
              <td>
                <div className="role-id">
                  <span className="avatar">{initials(role.name)}</span>
                  <div>
                    <strong>{role.name}</strong>
                    <span className="meta">#{role.id}</span>
                  </div>
                </div>
              </td>
              <td className="desc">
                {role.description ? (
                  <span className="clamp">{role.description}</span>
                ) : (
                  <span className="muted">Chưa có mô tả</span>
                )}
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {selected ? (
      <DetailDialog
        title={selected.name}
        subtitle={`Mã #${selected.id}`}
        initials={initials(selected.name)}
        onClose={closeDetail}
        fields={[
          { label: "Tên vai trò", value: selected.name },
          { label: "Mã", value: `#${selected.id}` },
          { label: "Tạo lúc", value: formatDate(selected.createdAt) },
          { label: "Cập nhật", value: selected.updatedAt ? formatDate(selected.updatedAt) : "Chưa cập nhật" },
          { label: "Mô tả", value: selected.description || "Chưa có mô tả", wide: true },
        ]}
        actions={[
          {
            label: "Sửa",
            icon: "fa-pen",
            onClick: () => {
              closeDetail();
              onEdit(selected);
            },
          },
          {
            label: "Xóa",
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
