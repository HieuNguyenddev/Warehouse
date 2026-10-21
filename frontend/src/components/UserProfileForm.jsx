import { useEffect, useRef, useState } from "react";
import { uploadAvatar } from "../api/userProfiles";
import AvatarPhoto from "./AvatarPhoto.jsx";
import Icon from "./Icon.jsx";
import { genderOptions, maritalOptions } from "./profileLabels.js";

function Field({ icon, label, children, hint, warn }) {
  return (
    <label className="field">
      <span className="field-label">
        <Icon name={icon} />
        {label}
      </span>
      {children}
      {hint ? <small className={warn ? "count is-warn" : "count"}>{hint}</small> : null}
    </label>
  );
}

export default function UserProfileForm({
  form,
  users,
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
  provinces = [],
  wards = [],
  placesError = "",
  placesLoading = false,
}) {
  const nameRef = useRef(null);
  const fileRef = useRef(null);
  const isEdit = editingId != null;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const set = (patch) => onChange(patch);

  async function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ảnh tối đa 2 MB.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadNotice("");
    try {
      const result = await uploadAvatar(file);
      set({ avatarUrl: result?.url || "" });
      setUploadNotice("Đã lưu ảnh vào kho.");
    } catch (err) {
      setUploadError(err.message || "Không tải được ảnh.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    nameRef.current?.focus();
  }, [editingId]);

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-id-card"} />
        </span>
        <div>
          <h3 id="profile-form-title">{isEdit ? "Sửa hồ sơ" : "Hồ sơ mới"}</h3>
          <p>
            {isEdit
              ? `Đang chỉnh #${editingId}. Họ tên trên giấy tờ có thể khác tên tài khoản.`
              : "Mỗi người dùng chỉ có một hồ sơ."}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onCancel} disabled={saving} aria-label="Đóng">
          <Icon name="fa-xmark" />
        </button>
      </div>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="cv-upload">
        <AvatarPhoto url={form.avatarUrl} name={form.fullName} className="avatar-photo is-large" />
        <div>
          <strong>Ảnh đại diện</strong>
          <p>JPG, PNG, WEBP hoặc GIF, tối đa 2 MB.</p>
          <div className="cv-upload-actions">
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={saving || uploading}>
              <Icon name={uploading ? "fa-spinner fa-spin" : "fa-upload"} />
              {uploading ? "Đang lưu vào kho…" : "Chọn ảnh"}
            </button>
            {form.avatarUrl ? (
              <button type="button" className="text-btn" onClick={() => { set({ avatarUrl: "" }); setUploadNotice(""); }} disabled={saving || uploading}>
                Gỡ ảnh
              </button>
            ) : null}
          </div>
          {uploadError ? <small className="count is-warn">{uploadError}</small> : null}
          {uploadNotice ? <small className="count">{uploadNotice}</small> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={onPickFile}
          />
        </div>
      </div>

      <section className="form-section">
        <h4>Tài khoản</h4>
        <Field icon="fa-user" label="Người dùng">
          <select
            required
            value={form.userId}
            disabled={isEdit || users.length === 0}
            onChange={(event) => set({ userId: event.target.value })}
          >
            <option value="">{users.length === 0 ? "Không còn tài khoản chưa có hồ sơ" : "Chọn người dùng"}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} (@{user.username})
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="form-section">
        <h4>Định danh</h4>
        <Field icon="fa-id-card" label="Họ tên" hint={`${form.fullName.length}/150`} warn={form.fullName.length > 142}>
          <input
            ref={nameRef}
            required
            maxLength={150}
            value={form.fullName}
            onChange={(event) => set({ fullName: event.target.value })}
            placeholder="Họ tên trên CCCD"
          />
        </Field>
        <div className="field-row">
          <Field icon="fa-cake-candles" label="Ngày sinh">
            <input type="date" value={form.dateOfBirth} onChange={(event) => set({ dateOfBirth: event.target.value })} />
          </Field>
          <Field icon="fa-venus-mars" label="Giới tính">
            <select value={form.gender} onChange={(event) => set({ gender: event.target.value })}>
              {genderOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="field-row">
          <Field icon="fa-flag" label="Quốc tịch" hint={`${form.nationality.length}/50`}>
            <input maxLength={50} value={form.nationality} onChange={(event) => set({ nationality: event.target.value })} placeholder="Việt Nam" />
          </Field>
          <Field icon="fa-people-group" label="Dân tộc" hint={`${form.ethnicity.length}/50`}>
            <input maxLength={50} value={form.ethnicity} onChange={(event) => set({ ethnicity: event.target.value })} placeholder="Kinh" />
          </Field>
        </div>
        <div className="field-row">
          <Field icon="fa-place-of-worship" label="Tôn giáo" hint={`${form.religion.length}/50`}>
            <input maxLength={50} value={form.religion} onChange={(event) => set({ religion: event.target.value })} placeholder="Không" />
          </Field>
          <Field icon="fa-ring" label="Hôn nhân">
            <select value={form.maritalStatus} onChange={(event) => set({ maritalStatus: event.target.value })}>
              {maritalOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field icon="fa-location-dot" label="Nơi sinh" hint={`${form.placeOfBirth.length}/150`}>
          <input maxLength={150} value={form.placeOfBirth} onChange={(event) => set({ placeOfBirth: event.target.value })} />
        </Field>
      </section>

      <section className="form-section">
        <h4>CCCD / CMND</h4>
        <div className="field-row">
          <Field icon="fa-barcode" label="Số giấy tờ" hint="12 số CCCD hoặc 9 số CMND">
            <input maxLength={20} inputMode="numeric" value={form.identityNumber} onChange={(event) => set({ identityNumber: event.target.value })} />
          </Field>
          <Field icon="fa-calendar" label="Ngày cấp">
            <input type="date" value={form.identityIssuedDate} onChange={(event) => set({ identityIssuedDate: event.target.value })} />
          </Field>
        </div>
        <Field icon="fa-building-columns" label="Nơi cấp" hint={`${form.identityIssuedPlace.length}/150`}>
          <input maxLength={150} value={form.identityIssuedPlace} onChange={(event) => set({ identityIssuedPlace: event.target.value })} placeholder="Cục Cảnh sát quản lý hành chính về trật tự xã hội" />
        </Field>
      </section>

      <section className="form-section">
        <h4>Liên hệ và địa chỉ</h4>
        <div className="field-row">
          <Field icon="fa-phone" label="Số điện thoại">
            <input maxLength={20} inputMode="tel" value={form.phoneNumber} onChange={(event) => set({ phoneNumber: event.target.value })} placeholder="0901234567" />
          </Field>
          <Field icon="fa-envelope" label="Email" hint={`${form.email.length}/100`}>
            <input type="email" maxLength={100} value={form.email} onChange={(event) => set({ email: event.target.value })} placeholder="ten@email.com" />
          </Field>
        </div>
        <Field icon="fa-house" label="Nơi ở hiện tại" hint={`${form.address.length}/255`}>
          <input maxLength={255} value={form.address} onChange={(event) => set({ address: event.target.value })} />
        </Field>
        <Field icon="fa-house-chimney" label="Thường trú" hint={`${form.permanentAddress.length}/255`}>
          <input maxLength={255} value={form.permanentAddress} onChange={(event) => set({ permanentAddress: event.target.value })} />
        </Field>
        <div className="field-row">
          <Field icon="fa-map" label="Tỉnh / thành phố">
            <select
              value={form.provinceCode}
              onChange={(event) => set({ provinceCode: event.target.value, wardCode: "" })}
              disabled={placesLoading && provinces.length === 0}
            >
              <option value="">{placesLoading ? "Đang tải danh mục…" : "Chọn tỉnh, thành phố"}</option>
              {form.provinceCode && !provinces.some((item) => item.code === form.provinceCode) ? (
                <option value={form.provinceCode}>{form.provinceCode}</option>
              ) : null}
              {provinces.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field icon="fa-map" label="Xã / phường">
            <select
              value={form.wardCode}
              onChange={(event) => set({ wardCode: event.target.value })}
              disabled={!form.provinceCode}
            >
              <option value="">{form.provinceCode ? "Chọn xã, phường" : "Chọn tỉnh trước"}</option>
              {form.wardCode && !wards.some((item) => item.code === form.wardCode) ? (
                <option value={form.wardCode}>{form.wardCode}</option>
              ) : null}
              {wards.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {placesError ? <small className="count is-warn">{placesError}</small> : null}
      </section>

      <section className="form-section">
        <h4>Bổ sung</h4>
        <div className="field-row">
          <Field icon="fa-user-plus" label="Người liên hệ khẩn cấp">
            <input maxLength={150} value={form.emergencyContactName} onChange={(event) => set({ emergencyContactName: event.target.value })} />
          </Field>
          <Field icon="fa-phone" label="SĐT khẩn cấp">
            <input maxLength={20} inputMode="tel" value={form.emergencyContactPhone} onChange={(event) => set({ emergencyContactPhone: event.target.value })} />
          </Field>
        </div>
        <Field icon="fa-graduation-cap" label="Trình độ">
          <input maxLength={50} value={form.educationLevel} onChange={(event) => set({ educationLevel: event.target.value })} placeholder="Đại học" />
        </Field>
        <Field icon="fa-align-left" label="Ghi chú" hint={`${form.note.length}/500`} warn={form.note.length > 480}>
          <textarea maxLength={500} rows={3} value={form.note} onChange={(event) => set({ note: event.target.value })} />
        </Field>
      </section>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button type="submit" className="primary" disabled={saving || uploading || form.fullName.trim() === "" || form.userId === ""}>
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu hồ sơ" : "Tạo hồ sơ"}
        </button>
      </div>
    </form>
  );
}
