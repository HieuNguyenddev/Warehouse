import { useEffect, useRef, useState } from "react";
import { uploadAvatar } from "../api/userProfiles";
import AvatarPhoto from "./AvatarPhoto.jsx";
import Icon from "./Icon.jsx";
import { genderOptions, maritalOptions, optionLabel, profileToForm } from "./profileLabels.js";

const LAYOUT_KEY = "warehouse.cvLayout";

const FIELD_META = {
  phoneNumber: { label: "Điện thoại", maxLength: 20, inputMode: "tel" },
  email: { label: "Email", kind: "email", maxLength: 100 },
  address: { label: "Địa chỉ", maxLength: 255 },
  permanentAddress: { label: "Thường trú", maxLength: 255 },
  provinceCode: { label: "Tỉnh / thành phố", kind: "province" },
  wardCode: { label: "Xã / phường", kind: "ward" },
  dateOfBirth: { label: "Ngày sinh", kind: "date" },
  gender: { label: "Giới tính", kind: "gender" },
  placeOfBirth: { label: "Nơi sinh", maxLength: 150 },
  nationality: { label: "Quốc tịch", maxLength: 50 },
  ethnicity: { label: "Dân tộc", maxLength: 50 },
  religion: { label: "Tôn giáo", maxLength: 50 },
  maritalStatus: { label: "Hôn nhân", kind: "marital" },
  educationLevel: { label: "Trình độ", maxLength: 50 },
  identityNumber: { label: "CCCD / CMND", maxLength: 20 },
  identityIssuedDate: { label: "Ngày cấp", kind: "date" },
  identityIssuedPlace: { label: "Nơi cấp", maxLength: 150 },
  emergencyContactName: { label: "Người liên hệ", maxLength: 150 },
  emergencyContactPhone: { label: "SĐT khẩn cấp", maxLength: 20, inputMode: "tel" },
  note: { label: "Ghi chú", kind: "textarea", maxLength: 500 },
};

const DEFAULT_LAYOUT = [
  { id: "contact", title: "Liên hệ", fields: ["phoneNumber", "email", "address", "permanentAddress", "provinceCode", "wardCode"] },
  { id: "person", title: "Nhân thân", fields: ["dateOfBirth", "gender", "placeOfBirth", "nationality", "ethnicity", "religion", "maritalStatus", "educationLevel"] },
  { id: "papers", title: "Giấy tờ", fields: ["identityNumber", "identityIssuedDate", "identityIssuedPlace"] },
  { id: "extra", title: "Khẩn cấp", fields: ["emergencyContactName", "emergencyContactPhone", "note"] },
];

function cloneLayout(layout) {
  return layout.map((block) => ({ ...block, fields: [...block.fields] }));
}

function normalizeLayout(parsed) {
  const defaults = cloneLayout(DEFAULT_LAYOUT);
  if (!Array.isArray(parsed)) {
    return defaults;
  }

  const allowed = new Set(Object.keys(FIELD_META));
  const seen = new Set();
  const blocks = defaults.map((block) => {
    const saved = parsed.find((item) => item && item.id === block.id);
    const fields = Array.isArray(saved?.fields)
      ? saved.fields.filter((key) => allowed.has(key) && !seen.has(key) && seen.add(key))
      : [];
    return { ...block, fields };
  });

  defaults.forEach((block) => {
    const target = blocks.find((item) => item.id === block.id);
    block.fields.forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        target.fields.push(key);
      }
    });
  });

  return blocks;
}

function readLayout() {
  try {
    return normalizeLayout(JSON.parse(window.localStorage.getItem(LAYOUT_KEY) || "null"));
  } catch {
    return cloneLayout(DEFAULT_LAYOUT);
  }
}

function FieldControl({ meta, value, provinces, wards, disabled, onChange }) {
  if (meta.kind === "gender" || meta.kind === "marital") {
    const options = meta.kind === "gender" ? genderOptions : maritalOptions;
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (meta.kind === "province") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Chọn tỉnh, thành phố</option>
        {value && !provinces.some((item) => item.code === value) ? <option value={value}>{value}</option> : null}
        {provinces.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
    );
  }

  if (meta.kind === "ward") {
    return (
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{disabled ? "Chọn tỉnh trước" : "Chọn xã, phường"}</option>
        {value && !wards.some((item) => item.code === value) ? <option value={value}>{value}</option> : null}
        {wards.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
    );
  }

  if (meta.kind === "textarea") {
    return (
      <textarea
        rows={3}
        maxLength={meta.maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      type={meta.kind === "date" ? "date" : meta.kind === "email" ? "email" : "text"}
      inputMode={meta.inputMode}
      maxLength={meta.maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function ProfileCv({
  profiles,
  profileId,
  provinces,
  wards,
  placesError,
  saving,
  onSelect,
  onProvince,
  onSave,
  onDelete,
  onCreate,
  onClose,
  blocked,
}) {
  const [activeId, setActiveId] = useState(profileId);
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState("");
  const [layout, setLayout] = useState(readLayout);
  const [overKey, setOverKey] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const dragRef = useRef(null);
  const fileRef = useRef(null);
  const hydratedId = useRef(null);
  const active = profiles.find((profile) => profile.id === activeId) || null;
  const dirty = draft ? JSON.stringify(draft) !== baseline : false;

  useEffect(() => {
    const profile = profiles.find((item) => item.id === activeId) || profiles[0] || null;
    if (!profile) {
      setDraft(null);
      setBaseline("");
      return;
    }
    if (hydratedId.current === profile.id) {
      return;
    }
    hydratedId.current = profile.id;
    const next = profileToForm(profile);
    setActiveId(profile.id);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setError("");
  }, [activeId, profiles]);

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    onProvince(draft?.provinceCode || "");
  }, [draft?.provinceCode, onProvince]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !blocked) {
        requestClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function patch(next) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function choose(profile) {
    if (profile.id === activeId) {
      return;
    }
    if (dirty && !window.confirm("Thay đổi chưa lưu. Chuyển sang hồ sơ khác?")) {
      return;
    }
    hydratedId.current = null;
    setActiveId(profile.id);
    onSelect(profile.id);
  }

  function requestClose() {
    if (saving) {
      return;
    }
    if (dirty && !window.confirm("Đóng và bỏ thay đổi chưa lưu?")) {
      return;
    }
    onClose();
  }

  async function save() {
    if (!active || !draft || draft.fullName.trim() === "") {
      setError("Họ tên không được để trống.");
      return;
    }
    setError("");
    try {
      await onSave(active.id, draft);
      setBaseline(JSON.stringify(draft));
    } catch (err) {
      setError(err.message || "Không lưu được hồ sơ.");
    }
  }

  async function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Ảnh tối đa 2 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const result = await uploadAvatar(file);
      patch({ avatarUrl: result?.url || "" });
      setError("");
    } catch (err) {
      setError(err.message || "Không tải được ảnh.");
    } finally {
      setUploading(false);
    }
  }

  function moveField(fromKey, toKey) {
    if (!fromKey || fromKey === toKey) {
      return;
    }
    setLayout((current) => {
      const next = current.map((block) => ({ ...block, fields: block.fields.filter((key) => key !== fromKey) }));
      const target = next.find((block) => block.fields.includes(toKey));
      if (!target) {
        return current;
      }
      target.fields.splice(target.fields.indexOf(toKey), 0, fromKey);
      return next;
    });
  }

  function moveFieldToBlock(fromKey, blockId) {
    setLayout((current) => {
      const next = current.map((block) => ({ ...block, fields: block.fields.filter((key) => key !== fromKey) }));
      const target = next.find((block) => block.id === blockId);
      if (!target || target.fields.includes(fromKey)) {
        return current;
      }
      target.fields.push(fromKey);
      return next;
    });
  }

  function moveBlock(fromId, toId) {
    if (!fromId || fromId === toId) {
      return;
    }
    setLayout((current) => {
      const next = [...current];
      const fromIndex = next.findIndex((block) => block.id === fromId);
      const toIndex = next.findIndex((block) => block.id === toId);
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  return (
    <div className="cv-screen" role="dialog" aria-modal="true" aria-labelledby="cv-screen-title">
      <header className="cv-screen-bar">
        <button type="button" className="ghost" onClick={requestClose} disabled={saving}>
          <Icon name="fa-xmark" />
          Đóng
        </button>
        <div>
          <strong id="cv-screen-title">CV toàn màn hình</strong>
          <p>Kéo mục hoặc từng trường để sắp xếp. Sửa trực tiếp rồi bấm Lưu.</p>
        </div>
        <div className="cv-screen-actions">
          {active ? (
            <button type="button" className="danger" onClick={() => onDelete(active)} disabled={saving}>
              <Icon name="fa-trash" />
              Xóa
            </button>
          ) : null}
          <button type="button" className="primary" onClick={save} disabled={!active || saving || uploading || !dirty}>
            <Icon name={saving ? "fa-spinner fa-spin" : "fa-check"} />
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </header>

      {profiles.length === 0 || !draft ? (
        <div className="cv-empty">
          <p>Chưa có hồ sơ để mở.</p>
          <button type="button" className="primary" onClick={onCreate}>
            <Icon name="fa-plus" />
            Tạo hồ sơ
          </button>
        </div>
      ) : (
        <div className="cv-screen-body">
          <aside className="cv-list" aria-label="Danh sách hồ sơ">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={profile.id === active?.id ? "cv-person is-active" : "cv-person"}
                onClick={() => choose(profile)}
              >
                <AvatarPhoto url={profile.avatarUrl} name={profile.fullName} />
                <span>
                  <strong>{profile.fullName}</strong>
                  <small>{profile.phoneNumber || profile.username}</small>
                </span>
              </button>
            ))}
          </aside>

          <div className="cv-screen-sheet">
            {error || placesError ? (
              <div className="banner is-error" role="alert">
                <Icon name="fa-triangle-exclamation" />
                <span>{error || placesError}</span>
              </div>
            ) : null}

            <div className="cv-paper">
              <header className="cv-head">
                <div className="cv-photo-edit">
                  <AvatarPhoto url={draft.avatarUrl} name={draft.fullName} className="avatar-photo is-large" />
                  <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={uploading || saving}>
                    <Icon name={uploading ? "fa-spinner fa-spin" : "fa-upload"} />
                    {uploading ? "Đang lưu…" : "Ảnh"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onPickFile} />
                </div>
                <div>
                  <p className="cv-kicker">Hồ sơ nhân sự</p>
                  <input
                    className="cv-name"
                    maxLength={150}
                    value={draft.fullName}
                    onChange={(event) => patch({ fullName: event.target.value })}
                    aria-label="Họ tên"
                  />
                  <p className="cv-account">
                    {active?.username}
                    {active?.accountFullName ? ` · ${active.accountFullName}` : ""}
                  </p>
                  <div className="cv-chips">
                    <span>{optionLabel(genderOptions, draft.gender)}</span>
                    <span>{optionLabel(maritalOptions, draft.maritalStatus)}</span>
                  </div>
                </div>
              </header>

              <div className="cv-grid">
                {layout.map((block) => (
                  <section
                    key={block.id}
                    className={overKey === `block:${block.id}` ? "cv-block is-over" : "cv-block"}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setOverKey(`block:${block.id}`);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const drag = dragRef.current;
                      setOverKey("");
                      if (!drag) {
                        return;
                      }
                      if (drag.type === "field") {
                        moveFieldToBlock(drag.id, block.id);
                      }
                      if (drag.type === "block") {
                        moveBlock(drag.id, block.id);
                      }
                      dragRef.current = null;
                    }}
                  >
                    <h3>
                      <span
                        className="drag-handle"
                        draggable
                        aria-label={`Kéo mục ${block.title}`}
                        onDragStart={() => {
                          dragRef.current = { type: "block", id: block.id };
                        }}
                        onDragEnd={() => {
                          dragRef.current = null;
                          setOverKey("");
                        }}
                      >
                        <Icon name="fa-grip-vertical" />
                      </span>
                      {block.title}
                    </h3>
                    {block.fields.map((key) => {
                      const meta = FIELD_META[key];
                      return (
                        <label
                          key={key}
                          className={overKey === `field:${key}` ? "cv-edit-row is-over" : "cv-edit-row"}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setOverKey(`field:${key}`);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const drag = dragRef.current;
                            setOverKey("");
                            if (drag?.type === "field") {
                              moveField(drag.id, key);
                            }
                            dragRef.current = null;
                          }}
                        >
                          <span
                            className="drag-handle"
                            draggable
                            aria-label={`Kéo trường ${meta.label}`}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              dragRef.current = { type: "field", id: key };
                            }}
                            onDragEnd={() => {
                              dragRef.current = null;
                              setOverKey("");
                            }}
                          >
                            <Icon name="fa-grip-vertical" />
                          </span>
                          <span>{meta.label}</span>
                          <FieldControl
                            meta={meta}
                            value={draft[key] || ""}
                            provinces={provinces}
                            wards={key === "wardCode" && !draft.provinceCode ? [] : wards}
                            disabled={key === "wardCode" && !draft.provinceCode}
                            onChange={(value) => {
                              if (key === "provinceCode") {
                                patch({ provinceCode: value, wardCode: "" });
                                return;
                              }
                              patch({ [key]: value });
                            }}
                          />
                        </label>
                      );
                    })}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
