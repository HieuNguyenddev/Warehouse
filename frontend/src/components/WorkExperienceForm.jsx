import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function WorkExperienceForm({
  form,
  profiles,
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}) {
  const companyRef = useRef(null);
  const isEdit = editingId != null;
  const current = form.isCurrent === true || form.isCurrent === "true";
  const datesInvalid = Boolean(!current && form.startedOn && form.endedOn && form.endedOn < form.startedOn);

  useEffect(() => {
    companyRef.current?.focus();
  }, [editingId]);

  function set(patch) {
    onChange({ ...form, ...patch });
  }

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-user-clock"} />
        </span>
        <div>
          <h3 id="experience-form-title">{isEdit ? "Sửa kinh nghiệm" : "Kinh nghiệm làm việc mới"}</h3>
          <p>Ghi nơi đã làm hoặc nơi đang làm của một hồ sơ nhân sự.</p>
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

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-building" />
            Nơi làm việc
          </span>
          <input
            ref={companyRef}
            required
            maxLength={150}
            autoComplete="off"
            value={form.company}
            onChange={(event) => set({ company: event.target.value })}
            placeholder="Tên công ty hoặc đơn vị"
          />
          <small className={form.company.length >= 140 ? "count is-warn" : "count"}>{form.company.length}/150</small>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-briefcase" />
            Chức danh
          </span>
          <input
            required
            maxLength={120}
            autoComplete="off"
            value={form.jobTitle}
            onChange={(event) => set({ jobTitle: event.target.value })}
            placeholder="Ví dụ: Nhân viên kho"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-calendar" />
            Ngày bắt đầu
          </span>
          <input required type="date" value={form.startedOn} onChange={(event) => set({ startedOn: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-calendar-xmark" />
            Ngày kết thúc
          </span>
          <input
            type="date"
            value={current ? "" : form.endedOn}
            disabled={current}
            onChange={(event) => set({ endedOn: event.target.value })}
          />
          <small className={datesInvalid ? "count is-warn" : "count"}>
            {datesInvalid ? "Kết thúc phải từ ngày bắt đầu trở đi" : "Bỏ trống nếu chưa rõ ngày nghỉ"}
          </small>
        </label>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={current}
          onChange={(event) => set({ isCurrent: event.target.checked, endedOn: event.target.checked ? "" : form.endedOn })}
        />
        <span>Đang làm việc tại đây</span>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-align-left" />
          Mô tả công việc
        </span>
        <textarea
          maxLength={500}
          rows={4}
          value={form.description}
          onChange={(event) => set({ description: event.target.value })}
          placeholder="Công việc chính đã đảm nhận"
        />
        <small className={form.description.length >= 470 ? "count is-warn" : "count"}>{form.description.length}/500</small>
      </label>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button
          type="submit"
          className="primary"
          disabled={saving || form.company.trim() === "" || form.jobTitle.trim() === "" || form.userProfileId === "" || form.startedOn === "" || datesInvalid || profiles.length === 0}
        >
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}
