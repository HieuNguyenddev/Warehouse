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
  const showQualifications = section !== "experiences";
  const showExperiences = section !== "qualifications";

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
            <div className="record-add">
              <select value={qualificationForm.kind} onChange={(event) => setQualificationForm({ ...qualificationForm, kind: event.target.value })}>
                <option value="1">Bằng cấp</option>
                <option value="2">Chứng chỉ</option>
              </select>
              <input
                required
                maxLength={150}
                value={qualificationForm.name}
                onChange={(event) => setQualificationForm({ ...qualificationForm, name: event.target.value })}
                placeholder="Tên bằng hoặc chứng chỉ"
              />
              <input
                maxLength={150}
                value={qualificationForm.issuer}
                onChange={(event) => setQualificationForm({ ...qualificationForm, issuer: event.target.value })}
                placeholder="Nơi cấp"
              />
              <input type="date" value={qualificationForm.issuedOn} onChange={(event) => setQualificationForm({ ...qualificationForm, issuedOn: event.target.value })} aria-label="Ngày cấp" />
              <input type="date" value={qualificationForm.expiresOn} onChange={(event) => setQualificationForm({ ...qualificationForm, expiresOn: event.target.value })} aria-label="Ngày hết hạn" />
              <div className="record-add-actions">
                <button type="button" className="ghost" disabled={saving || uploading} onClick={() => fileRef.current?.click()}>
                  <Icon name={uploading ? "fa-spinner fa-spin" : "fa-upload"} />
                  {uploading ? "Đang tải…" : qualificationForm.documentName || "PDF hoặc ảnh"}
                </button>
                {qualificationForm.documentUrl ? (
                  <button type="button" className="text-btn" disabled={saving || uploading} onClick={() => setQualificationForm({ ...qualificationForm, documentUrl: "", documentName: "" })}>
                    Gỡ tệp
                  </button>
                ) : null}
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
                  onClick={() => run(() => createQualification({
                    userProfileId: Number(profileId),
                    kind: Number(qualificationForm.kind),
                    name: qualificationForm.name.trim(),
                    issuer: qualificationForm.issuer.trim() || null,
                    issuedOn: qualificationForm.issuedOn || null,
                    expiresOn: qualificationForm.expiresOn || null,
                    documentUrl: qualificationForm.documentUrl || null,
                    documentName: qualificationForm.documentName || null,
                  }))}
                >
                  {saving ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ghost" disabled={disabled || saving} onClick={() => { setError(""); setAdding("qualification"); }}>
              <Icon name="fa-plus" />
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
            <div className="record-add">
              <input
                maxLength={150}
                value={experienceForm.company}
                onChange={(event) => setExperienceForm({ ...experienceForm, company: event.target.value })}
                placeholder="Nơi làm việc"
              />
              <input
                maxLength={120}
                value={experienceForm.jobTitle}
                onChange={(event) => setExperienceForm({ ...experienceForm, jobTitle: event.target.value })}
                placeholder="Chức danh"
              />
              <input type="date" value={experienceForm.startedOn} onChange={(event) => setExperienceForm({ ...experienceForm, startedOn: event.target.value })} aria-label="Ngày bắt đầu" />
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={experienceForm.isCurrent}
                  onChange={(event) => setExperienceForm({ ...experienceForm, isCurrent: event.target.checked, endedOn: event.target.checked ? "" : experienceForm.endedOn })}
                />
                <span>Đang làm việc tại đây</span>
              </label>
              <div className="record-add-actions">
                <button type="button" className="ghost" disabled={saving} onClick={() => setAdding("")}>Hủy</button>
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || saving || experienceForm.company.trim() === "" || experienceForm.jobTitle.trim() === "" || experienceForm.startedOn === ""}
                  onClick={() => run(() => createWorkExperience({
                    userProfileId: Number(profileId),
                    company: experienceForm.company.trim(),
                    jobTitle: experienceForm.jobTitle.trim(),
                    startedOn: experienceForm.startedOn,
                    endedOn: experienceForm.isCurrent ? null : (experienceForm.endedOn || null),
                    isCurrent: experienceForm.isCurrent,
                  }))}
                >
                  {saving ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ghost" disabled={disabled || saving} onClick={() => { setError(""); setAdding("experience"); }}>
              <Icon name="fa-plus" />
              Thêm kinh nghiệm
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
