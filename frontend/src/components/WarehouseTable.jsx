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

function placeLine(warehouse, placeOf) {
  const place = placeOf(warehouse);
  const parts = [warehouse.address, place.ward, place.province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
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

export default function WarehouseTable({
  warehouses,
  loading,
  failed,
  editingId,
  query,
  placeOf,
  onEdit,
  onDelete,
  onCreate,
  onClearQuery,
}) {
  const [selected, setSelected] = useState(null);
  const closeDetail = useCallback(() => setSelected(null), []);

  if (loading && warehouses.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && warehouses.length === 0) {
    return null;
  }

  if (!loading && warehouses.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-warehouse" />
        </span>
        <h3>Chưa có kho hàng</h3>
        <p>Tạo kho đầu tiên để bắt đầu danh sách.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Tạo kho
        </button>
      </div>
    );
  }

  if (warehouses.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>Không tìm thấy kho khớp với “{query}”.</p>
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
        {warehouses.map((warehouse) => {
          const place = placeLine(warehouse, placeOf);
          return (
            <li
              key={warehouse.id}
              className={editingId === warehouse.id ? "role-card is-editing is-clickable" : "role-card is-clickable"}
              onClick={() => setSelected(warehouse)}
            >
              <div className="role-id">
                <span className="avatar">{initials(warehouse.name)}</span>
                <div>
                  <strong>{warehouse.name}</strong>
                  <span className="meta">{warehouse.code || "Chưa có mã"} · {warehouse.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
                </div>
              </div>
              <p className="clamp">{place || warehouse.note || <span className="muted">Chưa có địa chỉ</span>}</p>
            </li>
          );
        })}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kho</th>
              <th>Địa chỉ</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => {
              const place = placeLine(warehouse, placeOf);
              return (
                <tr
                  key={warehouse.id}
                  className={editingId === warehouse.id ? "is-editing is-clickable" : "is-clickable"}
                  onClick={() => setSelected(warehouse)}
                >
                  <td>
                    <div className="role-id">
                      <span className="avatar">{initials(warehouse.name)}</span>
                      <div>
                        <strong>{warehouse.name}</strong>
                        <span className="meta">{warehouse.code || "Chưa có mã"}{warehouse.phone ? ` · ${warehouse.phone}` : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="desc">
                    {place ? <span className="clamp">{place}</span> : <span className="muted">Chưa có địa chỉ</span>}
                  </td>
                  <td>
                    <span className="role-badge">{warehouse.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
                  </td>
                  <td className="when">
                    {warehouse.updatedAt ? (
                      <>
                        <Icon name="fa-clock-rotate-left" />
                        {formatDate(warehouse.updatedAt)}
                      </>
                    ) : (
                      <span className="muted">Chưa cập nhật</span>
                    )}
                  </td>
                </tr>
              );
            })}
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
            { label: "Tên kho", value: selected.name },
            { label: "Mã", value: selected.code || "Chưa có mã" },
            { label: "Điện thoại", value: selected.phone || "Chưa có" },
            { label: "Trạng thái", value: selected.isActive ? "Đang hoạt động" : "Ngừng hoạt động" },
            { label: "Địa chỉ", value: placeLine(selected, placeOf) || "Chưa có địa chỉ", wide: true },
            { label: "Ghi chú", value: selected.note || "Chưa có ghi chú", wide: true },
            { label: "Tạo lúc", value: formatDate(selected.createdAt) },
            { label: "Cập nhật", value: selected.updatedAt ? formatDate(selected.updatedAt) : "Chưa cập nhật" },
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
