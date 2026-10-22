import { useCallback, useState } from "react";
import { openStoredFile } from "../api/files";
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

function kindLabel(kind) {
  return String(kind) === "2" ? "Chứng chỉ" : "Bằng cấp";
}

function expiryState(value) {
  if (!value) {
    return "";
  }
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < start) {
    return "expired";
  }
  const soon = new Date(start);
  soon.setDate(soon.getDate() + 30);
  return date <= soon ? "soon" : "valid";
}

function Expiry({ value }) {
  const state = expiryState(value);
  if (!value) {
    return <span className="muted">Không hết hạn</span>;
  }
  if (state === "expired") {
    return <span className="status-pill is-deleted">Hết hạn {formatDay(value)}</span>;
  }
  if (state === "soon") {
    return <span className="status-pill is-locked">Sắp hết hạn {formatDay(value)}</span>;
  }
  return <span className="status-pill is-active">{formatDay(value)}</span>;
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

export default function QualificationTable({
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
          <Icon name="fa-certificate" />
        </span>
        <h3>Chưa có bằng cấp hoặc chứng chỉ</h3>
        <p>Ghi bằng tốt nghiệp, chứng chỉ nghề hoặc giấy phép còn hạn của nhân sự.</p>
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
        <p>Không tìm thấy mục khớp với “{query}”.</p>
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
                <strong>{item.name}</strong>
                <span className="meta">
                  {kindLabel(item.kind)} · {item.employeeCode || "Chưa có mã"} · {item.profileName}
                </span>
              </div>
            </div>
            <p className="clamp">{item.issuer || <span className="muted">Chưa có nơi cấp</span>}</p>
          </li>
        ))}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhân sự</th>
              <th>Loại</th>
              <th>Tên</th>
              <th>Nơi cấp</th>
              <th>Ngày cấp</th>
              <th>Hết hạn</th>
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
                <td>
                  <span className="role-badge">{kindLabel(item.kind)}</span>
                </td>
                <td>
                  <div className="cell-stack">
                    <strong>{item.name}</strong>
                    <span>
                      {item.major || item.credentialNumber || "Chưa có chuyên ngành"}
                      {item.documentName ? ` · ${item.documentName}` : ""}
                    </span>
                  </div>
                </td>
                <td>{item.issuer || <span className="muted">Chưa có</span>}</td>
                <td>{item.issuedOn ? formatDay(item.issuedOn) : <span className="muted">Chưa có</span>}</td>
                <td><Expiry value={item.expiresOn} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <DetailDialog
          title={selected.name}
          subtitle={`${kindLabel(selected.kind)} · ${selected.employeeCode || "Chưa có mã"} · ${selected.profileName}`}
          initials={initials(selected.profileName)}
          onClose={closeDetail}
          fields={[
            { label: "Nhân sự", value: selected.profileName },
            { label: "Mã nhân viên", value: selected.employeeCode || "Chưa có mã" },
            { label: "Tài khoản", value: selected.username ? `@${selected.username}` : "—" },
            { label: "Loại", value: kindLabel(selected.kind) },
            { label: "Chuyên ngành", value: selected.major || "Chưa có" },
            { label: "Xếp loại", value: selected.grade || "Chưa có" },
            { label: "Nơi cấp", value: selected.issuer || "Chưa có" },
            { label: "Số hiệu", value: selected.credentialNumber || "Chưa có" },
            { label: "Ngày cấp", value: selected.issuedOn ? formatDay(selected.issuedOn) : "Chưa có" },
            { label: "Ngày hết hạn", value: selected.expiresOn ? formatDay(selected.expiresOn) : "Không hết hạn" },
            { label: "Tệp đính kèm", value: selected.documentName || "Chưa có", wide: true },
            { label: "Ghi chú", value: selected.note || "Chưa có", wide: true },
            { label: "Tạo lúc", value: formatDateTime(selected.createdAt) },
            { label: "Cập nhật", value: selected.updatedAt ? formatDateTime(selected.updatedAt) : "Chưa cập nhật" },
          ]}
          actions={[
            ...(selected.documentUrl
              ? [{
                label: "Xem tệp",
                icon: "fa-file",
                onClick: () => {
                  openStoredFile(selected.documentUrl, selected.documentName).catch(() => {});
                },
              }]
              : []),
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
