import { useState } from "react";
import AvatarPhoto from "./AvatarPhoto.jsx";
import Icon from "./Icon.jsx";

export default function ProfileBoard({
  profiles,
  loading,
  failed,
  query,
  placeLabel,
  onEdit,
  onDelete,
  onCreate,
  onClearQuery,
  onReorder,
}) {
  const [overId, setOverId] = useState(null);

  if (loading && profiles.length === 0) {
    return <p className="cv-empty">Đang tải hồ sơ…</p>;
  }

  if (failed && profiles.length === 0) {
    return <p className="cv-empty">Chưa tải được danh sách.</p>;
  }

  if (profiles.length === 0) {
    return (
      <div className="cv-empty">
        <p>{query ? "Không có hồ sơ khớp từ khóa." : "Chưa có hồ sơ nào."}</p>
        {query ? (
          <button type="button" className="ghost" onClick={onClearQuery}>
            Xóa từ khóa
          </button>
        ) : (
          <button type="button" className="primary" onClick={onCreate}>
            <Icon name="fa-plus" />
            Tạo hồ sơ
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="board">
      {profiles.map((profile) => {
        const place = placeLabel(profile);
        return (
          <article
            key={profile.id}
            className={overId === profile.id ? "board-card is-over" : "board-card"}
            onDragOver={(event) => {
              event.preventDefault();
              setOverId(profile.id);
            }}
            onDragLeave={() => setOverId((current) => (current === profile.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const fromId = Number(event.dataTransfer.getData("text/plain"));
              setOverId(null);
              if (fromId && fromId !== profile.id) {
                onReorder(fromId, profile.id);
              }
            }}
          >
            <div className="board-card-top">
              <span
                className="drag-handle"
                draggable
                title="Kéo để sắp xếp"
                aria-label={`Kéo hồ sơ ${profile.fullName}`}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(profile.id));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setOverId(null)}
              >
                <Icon name="fa-grip-vertical" />
              </span>
              <AvatarPhoto url={profile.avatarUrl} name={profile.fullName} />
              <div>
                <strong>{profile.fullName}</strong>
                <small>@{profile.username}</small>
              </div>
            </div>
            <p>{profile.phoneNumber || profile.email || "Chưa có liên hệ"}</p>
            <p>{place || "Chưa chọn tỉnh, xã"}</p>
            <div className="board-card-actions">
              <button type="button" className="ghost" onClick={() => onEdit(profile)}>
                <Icon name="fa-pen-to-square" />
                Sửa
              </button>
              <button type="button" className="danger" onClick={() => onDelete(profile)}>
                <Icon name="fa-trash" />
                Xóa
              </button>
            </div>
          </article>
        );
      })}
      <button type="button" className="board-add" onClick={onCreate}>
        <Icon name="fa-plus" />
        Thêm hồ sơ
      </button>
    </div>
  );
}
