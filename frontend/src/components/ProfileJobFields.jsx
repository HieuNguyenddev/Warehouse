import { useState } from "react";
import { createPosition } from "../api/positions";
import Icon from "./Icon.jsx";
import { employeePrefix, previewEmployeeCode } from "./profileLabels.js";

export default function ProfileJobFields({
  positionId,
  employeeCode,
  displayCode,
  profileId,
  positions,
  profiles,
  disabled,
  onPosition,
  onPositions,
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = positions.find((item) => String(item.id) === String(positionId));
  const prefix = employeePrefix(selected?.code);
  const preview = previewEmployeeCode(profiles, prefix, employeeCode, profileId);
  const shownCode = displayCode || preview || employeeCode || "";

  async function addPosition(event) {
    event.preventDefault();
    const positionName = name.trim();
    const positionCode = code.trim().toUpperCase();
    if (!positionName) {
      setError("Nhập tên chức vụ.");
      return;
    }
    if (!employeePrefix(positionCode)) {
      setError("Mã chức vụ là 2 đến 10 chữ cái, ví dụ NVK.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await createPosition({
        name: positionName,
        code: positionCode,
        rank: 0,
        description: null,
      });
      const next = [...positions, created].sort((left, right) => left.name.localeCompare(right.name, "vi"));
      onPositions(next);
      onPosition(String(created.id));
      setName("");
      setCode("");
      setAdding(false);
    } catch (err) {
      setError(err.message || "Không tạo được chức vụ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="job-fields">
      <label className="field">
        <span className="field-label">
          <Icon name="fa-id-badge" />
          Mã nhân viên
        </span>
        <input readOnly value={shownCode || "Chọn chức vụ có mã chữ"} />
        <small className="count">Tự tăng theo mã chức vụ đang chọn. Mã NVK ra NVK001, NVK002. Đổi chức vụ thì lấy số tiếp theo của mã mới.</small>
      </label>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-briefcase" />
          Chức vụ
        </span>
        <select
          value={positionId || ""}
          disabled={disabled || saving}
          onChange={(event) => onPosition(event.target.value)}
        >
          <option value="">Chọn chức vụ</option>
          {positions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{employeePrefix(item.code) ? ` · ${employeePrefix(item.code)}` : ""}
            </option>
          ))}
        </select>
        {selected && !prefix ? (
          <small className="count is-warn">Chức vụ này chưa có mã chữ, ví dụ NVK, nên chưa cấp được mã nhân viên mới.</small>
        ) : null}
      </label>

      {adding ? (
        <div className="job-add">
          <label className="field">
            <span className="field-label">Tên chức vụ</span>
            <input
              maxLength={80}
              value={name}
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhân viên kho"
            />
          </label>
          <label className="field">
            <span className="field-label">Mã</span>
            <input
              maxLength={10}
              value={code}
              disabled={saving}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="NVK"
            />
          </label>
          <div className="job-add-actions">
            <button type="button" className="ghost" disabled={saving} onClick={() => setAdding(false)}>
              Hủy
            </button>
            <button type="button" className="primary" disabled={saving} onClick={addPosition}>
              <Icon name={saving ? "fa-spinner fa-spin" : "fa-plus"} />
              {saving ? "Đang thêm…" : "Thêm chức vụ"}
            </button>
          </div>
          {error ? <small className="count is-warn">{error}</small> : null}
        </div>
      ) : (
        <button type="button" className="ghost" disabled={disabled} onClick={() => { setAdding(true); setError(""); }}>
          <Icon name="fa-plus" />
          Thêm chức vụ
        </button>
      )}
    </div>
  );
}
