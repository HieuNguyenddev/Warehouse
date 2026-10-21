import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function PositionForm({
  form,
  editingId,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}) {
  const nameRef = useRef(null);
  const isEdit = editingId != null;
  const nameLeft = 80 - form.name.length;
  const codeLeft = 20 - form.code.length;
  const descriptionLeft = 250 - form.description.length;
  const rank = Number(form.rank);
  const rankInvalid = form.rank !== "" && (!Number.isInteger(rank) || rank < 0 || rank > 999);

  useEffect(() => {
    nameRef.current?.focus();
  }, [editingId]);

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-briefcase"} />
        </span>
        <div>
          <h3 id="position-form-title">{isEdit ? "Sửa chức vụ" : "Chức vụ mới"}</h3>
          <p>{isEdit ? `Đang chỉnh #${editingId}` : "Tên là bắt buộc. Mã, nếu có, không được trùng."}</p>
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
          <Icon name="fa-tag" />
          Tên chức vụ
        </span>
        <input
          ref={nameRef}
          required
          maxLength={80}
          autoComplete="off"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="Ví dụ: Thủ kho"
        />
        <small className={nameLeft <= 8 ? "count is-warn" : "count"}>{form.name.length}/80</small>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-barcode" />
            Mã
          </span>
          <input
            maxLength={20}
            autoComplete="off"
            value={form.code}
            onChange={(event) => onChange({ ...form, code: event.target.value.toUpperCase() })}
            placeholder="Ví dụ: TK"
          />
          <small className={codeLeft <= 4 ? "count is-warn" : "count"}>{form.code.length}/20</small>
        </label>

        <label className="field">
          <span className="field-label">
            <Icon name="fa-ranking-star" />
            Cấp
          </span>
          <input
            type="number"
            min={0}
            max={999}
            step={1}
            value={form.rank}
            onChange={(event) => onChange({ ...form, rank: event.target.value })}
            placeholder="0"
          />
          <small className={rankInvalid ? "count is-warn" : "count"}>0 là chưa xếp cấp</small>
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-align-left" />
          Mô tả
        </span>
        <textarea
          maxLength={250}
          rows={4}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          placeholder="Chức vụ này phụ trách việc gì?"
        />
        <small className={descriptionLeft <= 20 ? "count is-warn" : "count"}>
          {form.description.length}/250
        </small>
      </label>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button
          type="submit"
          className="primary"
          disabled={saving || form.name.trim() === "" || rankInvalid}
        >
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo chức vụ"}
        </button>
      </div>
    </form>
  );
}
