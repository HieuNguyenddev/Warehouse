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

function rankLabel(rank) {
  return rank ? `Cấp ${rank}` : "Chưa xếp cấp";
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

export default function PositionTable({
  positions,
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

  if (loading && positions.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && positions.length === 0) {
    return null;
  }

  if (!loading && positions.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-folder-open" />
        </span>
        <h3>Chưa có chức vụ</h3>
        <p>Tạo chức vụ đầu tiên, ví dụ Thủ kho hoặc Nhân viên kho.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Tạo chức vụ
        </button>
      </div>
    );
  }

  if (positions.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>Không tìm thấy chức vụ khớp với “{query}”.</p>
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
        {positions.map((position) => (
          <li
            key={position.id}
            className={editingId === position.id ? "role-card is-editing is-clickable" : "role-card is-clickable"}
            onClick={() => setSelected(position)}
          >
            <div className="role-id">
              <span className="avatar">{initials(position.name)}</span>
              <div>
                <strong>{position.name}</strong>
                <span className="meta">{position.code || "Chưa có mã"} · {rankLabel(position.rank)}</span>
              </div>
            </div>
            <p className="clamp">{position.description || <span className="muted">Chưa có mô tả</span>}</p>
          </li>
        ))}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chức vụ</th>
              <th>Cấp</th>
              <th>Mô tả</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr
                key={position.id}
                className={editingId === position.id ? "is-editing is-clickable" : "is-clickable"}
                onClick={() => setSelected(position)}
              >
                <td>
                  <div className="role-id">
                    <span className="avatar">{initials(position.name)}</span>
                    <div>
                      <strong>{position.name}</strong>
                      <span className="meta">{position.code || "Chưa có mã"}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="role-badge">{rankLabel(position.rank)}</span>
                </td>
                <td className="desc">
                  {position.description ? (
                    <span className="clamp">{position.description}</span>
                  ) : (
                    <span className="muted">Chưa có mô tả</span>
                  )}
                </td>
                <td className="when">
                  {position.updatedAt ? (
                    <>
                      <Icon name="fa-clock-rotate-left" />
                      {formatDate(position.updatedAt)}
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
          subtitle={selected.code ? `Mã ${selected.code}` : `Mã #${selected.id}`}
          initials={initials(selected.name)}
          onClose={closeDetail}
          fields={[
            { label: "Tên chức vụ", value: selected.name },
            { label: "Mã", value: selected.code || "Chưa có mã" },
            { label: "Cấp", value: rankLabel(selected.rank) },
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
