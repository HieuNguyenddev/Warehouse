import { useCallback, useState } from "react";
import DetailDialog from "./DetailDialog.jsx";
import Icon from "./Icon.jsx";
import { formatDateTime, formatDay } from "./profileLabels.js";

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function period(item) {
  const start = formatDay(item.startedOn);
  if (item.isCurrent) {
    return `${start} – nay`;
  }
  return item.endedOn ? `${start} – ${formatDay(item.endedOn)}` : `${start} – chưa rõ`;
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

export default function WorkExperienceTable({
  items,
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

  if (loading && items.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && items.length === 0) {
    return null;
  }

  if (!loading && items.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-user-clock" />
        </span>
        <h3>Chưa có kinh nghiệm làm việc</h3>
        <p>Ghi nơi đã làm hoặc nơi đang làm của nhân sự.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Thêm mới
        </button>
      </div>
    );
  }

  if (items.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>Không tìm thấy kinh nghiệm khớp với “{query}”.</p>
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
        {items.map((item) => (
          <li
            key={item.id}
            className={editingId === item.id ? "role-card is-editing is-clickable" : "role-card is-clickable"}
            onClick={() => setSelected(item)}
          >
            <div className="role-id">
              <span className="avatar">{initials(item.profileName)}</span>
              <div>
                <strong>{item.jobTitle}</strong>
                <span className="meta">{item.company} · {item.profileName}</span>
              </div>
            </div>
            <p className="clamp">{period(item)}</p>
          </li>
        ))}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhân sự</th>
              <th>Nơi làm việc</th>
              <th>Chức danh</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={editingId === item.id ? "is-editing is-clickable" : "is-clickable"}
                onClick={() => setSelected(item)}
              >
                <td>
                  <div className="role-id">
                    <span className="avatar">{initials(item.profileName)}</span>
                    <div>
                      <strong>{item.profileName}</strong>
                      <span className="meta">{item.employeeCode || "Chưa có mã"} · @{item.username}</span>
                    </div>
                  </div>
                </td>
                <td>{item.company}</td>
                <td>{item.jobTitle}</td>
                <td className="when">{period(item)}</td>
                <td>
                  {item.isCurrent ? (
                    <span className="status-pill is-active">Đang làm</span>
                  ) : (
                    <span className="status-pill is-locked">Đã nghỉ</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <DetailDialog
          title={selected.jobTitle}
          subtitle={`${selected.company} · ${selected.employeeCode || "Chưa có mã"} · ${selected.profileName}`}
          initials={initials(selected.profileName)}
          onClose={closeDetail}
          fields={[
            { label: "Nhân sự", value: selected.profileName },
            { label: "Mã nhân viên", value: selected.employeeCode || "Chưa có mã" },
            { label: "Tài khoản", value: selected.username ? `@${selected.username}` : "—" },
            { label: "Nơi làm việc", value: selected.company },
            { label: "Chức danh", value: selected.jobTitle },
            { label: "Thời gian", value: period(selected) },
            { label: "Trạng thái", value: selected.isCurrent ? "Đang làm" : "Đã nghỉ" },
            { label: "Mô tả", value: selected.description || "Chưa có", wide: true },
            { label: "Tạo lúc", value: formatDateTime(selected.createdAt) },
            { label: "Cập nhật", value: selected.updatedAt ? formatDateTime(selected.updatedAt) : "Chưa cập nhật" },
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
