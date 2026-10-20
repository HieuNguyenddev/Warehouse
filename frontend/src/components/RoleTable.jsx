function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RoleTable({
  roles,
  loading,
  editingId,
  onEdit,
  onDelete,
}) {
  if (loading && roles.length === 0) {
    return <p className="empty">Đang tải dữ liệu…</p>;
  }

  if (!loading && roles.length === 0) {
    return <p className="empty">Chưa có vai trò. Tạo vai trò đầu tiên ở form bên trên.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Mô tả</th>
            <th>Tạo lúc</th>
            <th>Cập nhật</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className={editingId === role.id ? "is-editing" : undefined}>
              <td className="mono">{role.id}</td>
              <td>{role.name}</td>
              <td>{role.description || "—"}</td>
              <td>{formatDate(role.createdAt)}</td>
              <td>{formatDate(role.updatedAt)}</td>
              <td className="row-actions">
                <button type="button" className="ghost compact" onClick={() => onEdit(role)}>
                  Sửa
                </button>
                <button
                  type="button"
                  className="danger compact"
                  onClick={() => onDelete(role)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
