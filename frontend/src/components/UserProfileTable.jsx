import { useCallback, useState } from "react";
import DetailDialog from "./DetailDialog.jsx";
import Icon from "./Icon.jsx";
import { formatDateTime, formatDay, genderOptions, maritalOptions, optionLabel } from "./profileLabels.js";

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function show(value) {
  return value ? value : "—";
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

export default function UserProfileTable({
  profiles,
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

  if (loading && profiles.length === 0 && !query) {
    return <Skeleton />;
  }

  if (!loading && failed && profiles.length === 0) {
    return null;
  }

  if (!loading && profiles.length === 0 && !query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-folder-open" />
        </span>
        <h3>Chưa có hồ sơ</h3>
        <p>Gắn giấy tờ, liên hệ và địa chỉ cho một tài khoản đã có.</p>
        <button type="button" className="primary" onClick={onCreate}>
          <Icon name="fa-plus" />
          Tạo hồ sơ
        </button>
      </div>
    );
  }

  if (profiles.length === 0 && query) {
    return (
      <div className="empty-state">
        <span className="empty-mark">
          <Icon name="fa-magnifying-glass" />
        </span>
        <h3>Không có kết quả</h3>
        <p>Không tìm thấy hồ sơ khớp với “{query}”.</p>
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
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className={editingId === profile.id ? "role-card is-editing is-clickable" : "role-card is-clickable"}
            onClick={() => setSelected(profile)}
          >
            <div className="role-id">
              <span className="avatar">{initials(profile.fullName)}</span>
              <div>
                <strong>{profile.fullName}</strong>
                <span className="meta">@{profile.username} · {optionLabel(genderOptions, profile.gender)}</span>
              </div>
            </div>
            <p className="clamp">{profile.phoneNumber || profile.email || "Chưa có liên hệ"}</p>
          </li>
        ))}
      </ul>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hồ sơ</th>
              <th>Giới tính</th>
              <th>Liên hệ</th>
              <th>CCCD</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr
                key={profile.id}
                className={editingId === profile.id ? "is-editing is-clickable" : "is-clickable"}
                onClick={() => setSelected(profile)}
              >
                <td>
                  <div className="role-id">
                    <span className="avatar">{initials(profile.fullName)}</span>
                    <div>
                      <strong>{profile.fullName}</strong>
                      <span className="meta">@{profile.username}{profile.userDeletedAt ? " · tài khoản đã xóa" : ""}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="role-badge">{optionLabel(genderOptions, profile.gender)}</span>
                </td>
                <td>
                  <div className="cell-stack">
                    <strong>{profile.phoneNumber || "Chưa có SĐT"}</strong>
                    <span>{profile.email || "Chưa có email"}</span>
                  </div>
                </td>
                <td>{profile.identityNumber || <span className="muted">Chưa có</span>}</td>
                <td className="when">
                  {profile.updatedAt ? (
                    <>
                      <Icon name="fa-clock-rotate-left" />
                      {formatDateTime(profile.updatedAt)}
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
          title={selected.fullName}
          subtitle={`@${selected.username}`}
          initials={initials(selected.fullName)}
          onClose={closeDetail}
          fields={[
            { label: "Họ tên", value: selected.fullName },
            { label: "Tài khoản", value: `@${selected.username}` },
            { label: "Tên trên tài khoản", value: show(selected.accountFullName) },
            { label: "Ngày sinh", value: formatDay(selected.dateOfBirth) },
            { label: "Giới tính", value: optionLabel(genderOptions, selected.gender) },
            { label: "Nơi sinh", value: show(selected.placeOfBirth) },
            { label: "Quốc tịch", value: show(selected.nationality) },
            { label: "Dân tộc", value: show(selected.ethnicity) },
            { label: "Tôn giáo", value: show(selected.religion) },
            { label: "Hôn nhân", value: optionLabel(maritalOptions, selected.maritalStatus) },
            { label: "Số CCCD", value: show(selected.identityNumber) },
            { label: "Ngày cấp", value: formatDay(selected.identityIssuedDate) },
            { label: "Nơi cấp", value: show(selected.identityIssuedPlace), wide: true },
            { label: "Số điện thoại", value: show(selected.phoneNumber) },
            { label: "Email", value: show(selected.email) },
            { label: "Nơi ở hiện tại", value: show(selected.address), wide: true },
            { label: "Thường trú", value: show(selected.permanentAddress), wide: true },
            { label: "Mã tỉnh", value: show(selected.provinceCode) },
            { label: "Mã huyện", value: show(selected.districtCode) },
            { label: "Mã xã", value: show(selected.wardCode) },
            { label: "Trình độ", value: show(selected.educationLevel) },
            { label: "Người liên hệ", value: show(selected.emergencyContactName) },
            { label: "SĐT khẩn cấp", value: show(selected.emergencyContactPhone) },
            { label: "Ảnh đại diện", value: show(selected.avatarUrl), wide: true },
            { label: "Ghi chú", value: show(selected.note), wide: true },
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
