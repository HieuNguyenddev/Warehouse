import { useRef, useState } from "react";
import { openStoredFile } from "../api/files";
import { createQualification, deleteQualification, uploadQualificationDocument } from "../api/qualifications";
import { createWorkExperience, deleteWorkExperience } from "../api/workExperiences";
import Icon from "./Icon.jsx";
import { formatDay } from "./profileLabels.js";

const emptyQualification = { kind: "1", name: "", issuer: "", issuedOn: "", expiresOn: "", documentUrl: "", documentName: "" };
const emptyExperience = { company: "", jobTitle: "", startedOn: "", endedOn: "", isCurrent: false };

function sameProfile(item, profileId) {
  return Number(item.userProfileId) === Number(profileId);
}

export default function ProfileHistory({
  profileId,
  section = "both",
  qualifications = [],
  experiences = [],
  disabled = false,
  onChanged,
}) {
  const [qualificationForm, setQualificationForm] = useState(emptyQualification);
  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [adding, setAdding] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const quals = qualifications.filter((item) => sameProfile(item, profileId));
  const jobs = experiences.filter((item) => sameProfile(item, profileId));
  const showQualifications = section === "both" || section === "qualifications" || section === "qualification";
  const showExperiences = section === "both" || section === "experiences" || section === "experience";

  async function run(action) {
    setSaving(true);
    setError("");
    try {
      await action();
      setAdding("");
      setQualificationForm(emptyQualification);
      setExperienceForm(emptyExperience);
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-history">
      {error ? <small className="count is-warn">{error}</small> : null}

      {showQualifications ? (
        <div className="profile-history-block">
          {section === "both" ? <h4>Bằng cấp & chứng chỉ</h4> : null}
          {quals.length === 0 ? <p className="muted">Chưa có bằng cấp hoặc chứng chỉ.</p> : null}
          <ul className="record-list">
            {quals.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {String(item.kind) === "2" ? "Chứng chỉ" : "Bằng cấp"}
                    {item.issuer ? ` · ${item.issuer}` : ""}
                    {item.issuedOn ? ` · ${formatDay(item.issuedOn)}` : ""}
                    {item.documentName ? ` · ${item.documentName}` : ""}
                  </span>
                </div>
                {item.documentUrl ? (
                  <button
                    type="button"
                    className="text-btn"
                    disabled={disabled || saving}
                    onClick={() => openStoredFile(item.documentUrl, item.documentName).catch((err) => setError(err.message))}
                  >
                    Xem tệp
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-btn"
                  disabled={disabled || saving}
                  onClick={() => run(() => deleteQualification(item.id))}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
          {adding === "qualification" ? (
            <div className="record-add-card">
              <div className="record-add-header">
                <strong><Icon name="fa-certificate" /> Thêm bằng cấp hoặc chứng chỉ</strong>
                <button type="button" className="icon-btn" onClick={() => setAdding("")} aria-label="Đóng"><Icon name="fa-xmark" /></button>
              </div>
              <div className="record-grid">
                <label className="record-field">
                  <span className="record-label">Phân loại</span>
                  <select value={qualificationForm.kind} onChange={(event) => setQualificationForm({ ...qualificationForm, kind: event.target.value })}>
                    <option value="1">Bằng cấp</option>
                    <option value="2">Chứng chỉ</option>
                  </select>
                </label>
                <label className="record-field is-wide">
                  <span className="record-label">Tên văn bằng / chứng chỉ <em className="required">*</em></span>
                  <input
                    required
                    maxLength={150}
                    value={qualificationForm.name}
                    onChange={(event) => setQualificationForm({ ...qualificationForm, name: event.target.value })}
                    placeholder="VD: Cử nhân Công nghệ thông tin, Chứng chỉ AWS..."
                  />
                </label>
                <label className="record-field is-wide">
                  <span className="record-label">Nơi cấp</span>
                  <input
                    maxLength={150}
                    value={qualificationForm.issuer}
                    onChange={(event) => setQualificationForm({ ...qualificationForm, issuer: event.target.value })}
                    placeholder="VD: Đại học Bách Khoa, Amazon Web Services..."
                  />
                </label>
                <label className="record-field">
                  <span className="record-label">Ngày cấp</span>
                  <input type="date" value={qualificationForm.issuedOn} onChange={(event) => setQualificationForm({ ...qualificationForm, issuedOn: event.target.value })} />
                </label>
                <label className="record-field">
                  <span className="record-label">Ngày hết hạn</span>
                  <input type="date" value={qualificationForm.expiresOn} onChange={(event) => setQualificationForm({ ...qualificationForm, expiresOn: event.target.value })} />
                </label>
              </div>

              <div className="record-file-box">
                <span className="record-label"><Icon name="fa-paperclip" /> Tài liệu đính kèm (PDF / Ảnh)</span>
                <div className="record-file-row">
                  <button type="button" className="ghost btn-upload" disabled={saving || uploading} onClick={() => fileRef.current?.click()}>
                    <Icon name={uploading ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"} />
                    {uploading ? "Đang tải tệp…" : qualificationForm.documentName ? "Đổi tệp khác" : "Chọn PDF hoặc ảnh"}
                  </button>
                  {qualificationForm.documentName ? (
                    <span className="record-file-name" title={qualificationForm.documentName}>
                      <Icon name="fa-file-circle-check" />
                      {qualificationForm.documentName}
                    </span>
                  ) : (
                    <span className="record-file-hint">Tối đa 8 MB (JPG, PNG, WEBP, PDF)</span>
                  )}
                  {qualificationForm.documentUrl ? (
                    <button type="button" className="text-btn is-danger-text" disabled={saving || uploading} onClick={() => setQualificationForm({ ...qualificationForm, documentUrl: "", documentName: "" })}>
                      Gỡ tệp
                    </button>
                  ) : null}
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  if (file.size > 8 * 1024 * 1024) {
                    setError("Tệp tối đa 8 MB.");
                    return;
                  }
                  setUploading(true);
                  setError("");
                  try {
                    const saved = await uploadQualificationDocument(file);
                    setQualificationForm((current) => ({
                      ...current,
                      documentUrl: saved?.url || "",
                      documentName: saved?.fileName || file.name,
                    }));
                  } catch (err) {
                    setError(err.message || "Không tải được tệp.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />

              <div className="record-add-actions">
                <button type="button" className="ghost" disabled={saving} onClick={() => setAdding("")}>Hủy</button>
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || saving || uploading || qualificationForm.name.trim() === ""}
                  onClick={() => {
                    const idNum = Number(profileId);
                    if (!idNum || Number.isNaN(idNum)) {
                      setError("Chưa xác định được hồ sơ nhân sự (thiếu profileId). Hãy lưu hồ sơ trước.");
                      return;
                    }
                    run(() => createQualification({
                      userProfileId: idNum,
                      kind: Number(qualificationForm.kind),
                      name: qualificationForm.name.trim(),
                      issuer: qualificationForm.issuer.trim() || null,
                      issuedOn: qualificationForm.issuedOn || null,
                      expiresOn: qualificationForm.expiresOn || null,
                      documentUrl: qualificationForm.documentUrl || null,
                      documentName: qualificationForm.documentName || null,
                    }));
                  }}
                >
                  <Icon name={saving ? "fa-spinner fa-spin" : "fa-check"} />
                  {saving ? "Đang lưu…" : "Lưu vào hồ sơ"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ghost btn-add-record" disabled={disabled || saving} onClick={() => { setError(""); setAdding("qualification"); }}>
              <Icon name="fa-circle-plus" />
              Thêm bằng cấp / chứng chỉ
            </button>
          )}
        </div>
      ) : null}

      {showExperiences ? (
        <div className="profile-history-block">
          {section === "both" ? <h4>Kinh nghiệm làm việc</h4> : null}
          {jobs.length === 0 ? <p className="muted">Chưa có kinh nghiệm làm việc.</p> : null}
          <ul className="record-list">
            {jobs.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.jobTitle}</strong>
                  <span>
                    {item.company}
                    {item.isCurrent ? " · Đang làm" : item.endedOn ? ` · đến ${formatDay(item.endedOn)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-btn"
                  disabled={disabled || saving}
                  onClick={() => run(() => deleteWorkExperience(item.id))}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
          {adding === "experience" ? (
            <div className="record-add-card">
              <div className="record-add-header">
                <strong><Icon name="fa-briefcase" /> Thêm kinh nghiệm làm việc</strong>
                <button type="button" className="icon-btn" onClick={() => setAdding("")} aria-label="Đóng"><Icon name="fa-xmark" /></button>
              </div>
              <div className="record-grid">
                <label className="record-field is-wide">
                  <span className="record-label">Nơi làm việc / Công ty <em className="required">*</em></span>
                  <input
                    maxLength={150}
                    value={experienceForm.company}
                    onChange={(event) => setExperienceForm({ ...experienceForm, company: event.target.value })}
                    placeholder="VD: Tập đoàn ABC, Công ty TNHH XYZ..."
                  />
                </label>
                <label className="record-field is-wide">
                  <span className="record-label">Chức danh / Vị trí <em className="required">*</em></span>
                  <input
                    maxLength={120}
                    value={experienceForm.jobTitle}
                    onChange={(event) => setExperienceForm({ ...experienceForm, jobTitle: event.target.value })}
                    placeholder="VD: Kỹ sư phần mềm, Nhân viên kho vận..."
                  />
                </label>
                <label className="record-field">
                  <span className="record-label">Ngày bắt đầu <em className="required">*</em></span>
                  <input type="date" value={experienceForm.startedOn} onChange={(event) => setExperienceForm({ ...experienceForm, startedOn: event.target.value })} />
                </label>
                <label className="record-field">
                  <span className="record-label">Ngày kết thúc</span>
                  <input
                    type="date"
                    disabled={experienceForm.isCurrent}
                    value={experienceForm.endedOn}
                    onChange={(event) => setExperienceForm({ ...experienceForm, endedOn: event.target.value })}
                  />
                </label>
              </div>

              <label className="check-row record-checkbox">
                <input
                  type="checkbox"
                  checked={experienceForm.isCurrent}
                  onChange={(event) => setExperienceForm({ ...experienceForm, isCurrent: event.target.checked, endedOn: event.target.checked ? "" : experienceForm.endedOn })}
                />
                <span>Đang làm việc tại đây (Hiện tại)</span>
              </label>

              <div className="record-add-actions">
                <button type="button" className="ghost" disabled={saving} onClick={() => setAdding("")}>Hủy</button>
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || saving || experienceForm.company.trim() === "" || experienceForm.jobTitle.trim() === "" || experienceForm.startedOn === ""}
                  onClick={() => {
                    const idNum = Number(profileId);
                    if (!idNum || Number.isNaN(idNum)) {
                      setError("Chưa xác định được hồ sơ nhân sự (thiếu profileId). Hãy lưu hồ sơ trước.");
                      return;
                    }
                    run(() => createWorkExperience({
                      userProfileId: idNum,
                      company: experienceForm.company.trim(),
                      jobTitle: experienceForm.jobTitle.trim(),
                      startedOn: experienceForm.startedOn,
                      endedOn: experienceForm.isCurrent ? null : (experienceForm.endedOn || null),
                      isCurrent: experienceForm.isCurrent,
                    }));
                  }}
                >
                  <Icon name={saving ? "fa-spinner fa-spin" : "fa-check"} />
                  {saving ? "Đang lưu…" : "Lưu vào hồ sơ"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ghost btn-add-record" disabled={disabled || saving} onClick={() => { setError(""); setAdding("experience"); }}>
              <Icon name="fa-circle-plus" />
              Thêm kinh nghiệm
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
