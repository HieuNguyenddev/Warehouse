import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export default function WarehouseForm({
  form,
  editingId,
  saving,
  error,
  provinces,
  wards,
  placesLoading,
  onChange,
  onSubmit,
  onCancel,
}) {
  const nameRef = useRef(null);
  const isEdit = editingId != null;
  const nameLeft = 80 - form.name.length;
  const codeLeft = 20 - form.code.length;
  const phoneLeft = 20 - form.phone.length;
  const addressLeft = 200 - form.address.length;
  const noteLeft = 250 - form.note.length;

  useEffect(() => {
    nameRef.current?.focus();
  }, [editingId]);

  function setProvince(value) {
    onChange({ ...form, provinceCode: value, wardCode: "" });
  }

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div className="modal-head">
        <span className="modal-mark">
          <Icon name={isEdit ? "fa-pen-to-square" : "fa-warehouse"} />
        </span>
        <div>
          <h3 id="warehouse-form-title">{isEdit ? "Sửa kho hàng" : "Kho hàng mới"}</h3>
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
          Tên kho
        </span>
        <input
          ref={nameRef}
          required
          maxLength={80}
          autoComplete="off"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="Ví dụ: Kho trung tâm Hà Nội"
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
            placeholder="Ví dụ: HN-01"
          />
          <small className={codeLeft <= 4 ? "count is-warn" : "count"}>{form.code.length}/20</small>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-phone" />
            Điện thoại
          </span>
          <input
            maxLength={20}
            autoComplete="off"
            value={form.phone}
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
            placeholder="Ví dụ: 0901234567"
          />
          <small className={phoneLeft <= 4 ? "count is-warn" : "count"}>{form.phone.length}/20</small>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">
            <Icon name="fa-map" />
            Tỉnh / thành phố
          </span>
          <select
            value={form.provinceCode}
            disabled={placesLoading && provinces.length === 0}
            onChange={(event) => setProvince(event.target.value)}
          >
            <option value="">{placesLoading && provinces.length === 0 ? "Đang tải danh mục…" : "Chọn tỉnh, thành phố"}</option>
            {provinces.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="fa-map-pin" />
            Xã / phường
          </span>
          <select
            value={form.wardCode}
            disabled={!form.provinceCode}
            onChange={(event) => onChange({ ...form, wardCode: event.target.value })}
          >
            <option value="">{form.provinceCode ? "Chọn xã, phường" : "Chọn tỉnh trước"}</option>
            {wards.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">
          <Icon name="fa-location-dot" />
          Địa chỉ
        </span>
        <input
          maxLength={200}
          autoComplete="off"
          value={form.address}
          onChange={(event) => onChange({ ...form, address: event.target.value })}
          placeholder="Số nhà, đường"
        />
        <small className={addressLeft <= 20 ? "count is-warn" : "count"}>{form.address.length}/200</small>
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
          onChange={(event) => onChange({ ...form, note: event.target.value })}
          placeholder="Ghi chú vận hành của kho"
        />
        <small className={noteLeft <= 20 ? "count is-warn" : "count"}>{form.note.length}/250</small>
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
        />
        <span>Đang hoạt động</span>
      </label>

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <Icon name="fa-xmark" />
          Hủy
        </button>
        <button type="submit" className="primary" disabled={saving || form.name.trim() === ""}>
          <Icon name={saving ? "fa-spinner fa-spin" : isEdit ? "fa-check" : "fa-plus"} />
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo kho"}
        </button>
      </div>
    </form>
  );
}
