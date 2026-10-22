import { useEffect, useRef, useState } from "react";
import { uploadQualificationDocument } from "../api/qualifications";
import { openStoredFile } from "../api/files";
import Icon from "./Icon.jsx";

const kinds = [
  { value: "1", label: "Bằng cấp" },
  { value: "2", label: "Chứng chỉ" },
];

export default function QualificationForm({
  form,
  profiles,
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}) {
  const nameRef = useRef(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const isEdit = editingId != null;
  const nameLeft = 150 - form.name.length;
  const datesInvalid = Boolean(form.issuedOn && form.expiresOn && form.expiresOn < form.issuedOn);

  useEffect(() => {
    nameRef.current?.focus();
  }, [editingId]);

  function set(patch) {
    onChange({ ...form, ...patch });
  }

  async function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Tệp tối đa 8 MB.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const saved = await uploadQualificationDocument(file);
      set({ documentUrl: saved?.url || "", documentName: saved?.fileName || file.name });
    } catch (err) {
      setUploadError(err.message || "Không tải được tệp.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-certificate"} />
        </span>
        <div>
          <h3 id="qualification-form-title">{isEdit ? "Sửa bằng cấp / chứng chỉ" : "Bằng cấp hoặc chứng chỉ mới"}</h3>
          <p>Gắn với một hồ sơ nhân sự. Số hiệu, nếu có, không được trùng.</p>
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

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-id-card" />
            Hồ sơ
          </span>
          <select required value={form.userProfileId} onChange={(event) => set({ userProfileId: event.target.value })}>
            <option value="">Chọn hồ sơ</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.employeeCode ? `${profile.employeeCode} · ` : ""}
                {profile.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-certificate" />
            Loại
          </span>
          <select value={form.kind} onChange={(event) => set({ kind: event.target.value })}>
            {kinds.map((kind) => (
              <option key={kind.value} value={kind.value}>{kind.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-tag" />
          Tên
        </span>
        <input
          ref={nameRef}
          required
          maxLength={150}
          autoComplete="off"
          value={form.name}
          onChange={(event) => set({ name: event.target.value })}
          placeholder="Ví dụ: Cử nhân Công nghệ thông tin"
        />
        <small className={nameLeft <= 12 ? "count is-warn" : "count"}>{form.name.length}/150</small>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-book" />
            Chuyên ngành
          </span>
          <input
            maxLength={120}
            autoComplete="off"
            value={form.major}
            onChange={(event) => set({ major: event.target.value })}
            placeholder="Ví dụ: Kế toán"
          />
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-award" />
            Xếp loại
          </span>
          <input
            maxLength={40}
            autoComplete="off"
            value={form.grade}
            onChange={(event) => set({ grade: event.target.value })}
            placeholder="Giỏi, Khá, Đạt"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-building" />
            Nơi cấp
          </span>
          <input
            maxLength={150}
            autoComplete="off"
            value={form.issuer}
            onChange={(event) => set({ issuer: event.target.value })}
            placeholder="Trường hoặc tổ chức cấp"
          />
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-hashtag" />
            Số hiệu
          </span>
          <input
            maxLength={50}
            autoComplete="off"
            value={form.credentialNumber}
            onChange={(event) => set({ credentialNumber: event.target.value })}
            placeholder="Số văn bằng hoặc chứng chỉ"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-calendar" />
            Ngày cấp
          </span>
          <input type="date" value={form.issuedOn} onChange={(event) => set({ issuedOn: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-calendar-xmark" />
            Ngày hết hạn
          </span>
          <input type="date" value={form.expiresOn} onChange={(event) => set({ expiresOn: event.target.value })} />
          <small className={datesInvalid ? "count is-warn" : "count"}>
            {datesInvalid ? "Hết hạn phải từ ngày cấp trở đi" : "Để trống nếu không hết hạn"}
          </small>
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-paperclip" />
          Tệp đính kèm
        </span>
        <div className="record-add-actions">
          <button type="button" className="ghost" disabled={saving || uploading} onClick={() => fileRef.current?.click()}>
            <Icon name={uploading ? "fa-spinner fa-spin" : "fa-upload"} />
            {uploading ? "Đang tải…" : form.documentName ? "Đổi tệp" : "Chọn PDF hoặc ảnh"}
          </button>
          {form.documentUrl ? (
            <button
              type="button"
              className="ghost"
              disabled={saving || uploading}
              onClick={() => openStoredFile(form.documentUrl, form.documentName).catch((err) => setUploadError(err.message))}
            >
              <Icon name="fa-eye" />
              Xem
            </button>
          ) : null}
          {form.documentUrl ? (
            <button type="button" className="text-btn" disabled={saving || uploading} onClick={() => set({ documentUrl: "", documentName: "" })}>
              Gỡ tệp
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
          hidden
          onChange={onPickFile}
        />
        <small className={uploadError ? "count is-warn" : "count"}>
          {uploadError || form.documentName || "JPG, PNG, WEBP, GIF hoặc PDF, tối đa 8 MB."}
        </small>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-align-left" />
          Ghi chú
        </span>
        <textarea
          maxLength={250}
          rows={3}
          value={form.note}
          onChange={(event) => set({ note: event.target.value })}
          placeholder="Thông tin thêm, nếu có"
        />
        <small className={form.note.length >= 230 ? "count is-warn" : "count"}>{form.note.length}/250</small>
      </label>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button
          type="submit"
          className="primary"
          disabled={saving || uploading || form.name.trim() === "" || form.userProfileId === "" || datesInvalid || profiles.length === 0}
        >
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}
