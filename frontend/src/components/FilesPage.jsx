import { useCallback, useEffect, useRef, useState } from "react";
import { deleteStoredFile, downloadFile, getFiles, uploadFile } from "../api/files";
import Icon from "./Icon.jsx";

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(value) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function FilesPage({ onCount }) {
  const [files, setFiles] = useState([]);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFiles();
      const list = Array.isArray(data?.files) ? data.files : [];
      setFiles(list);
      setProvider(data?.provider || "");
      onCount(list.length);
    } catch (err) {
      setError(err.message || "Không tải được danh sách tệp.");
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function onPick(event) {
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
      await uploadFile(file);
      setNotice(`Đã lưu “${file.name}”.`);
      await loadFiles();
    } catch (err) {
      setError(err.message || "Không lưu được tệp.");
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(file) {
    setError("");
    try {
      await downloadFile(file.name, file.fileName);
    } catch (err) {
      setError(err.message || "Không tải được tệp.");
    }
  }

  async function onDelete(file) {
    if (!window.confirm(`Xóa tệp “${file.fileName}”?`)) {
      return;
    }
    setError("");
    try {
      await deleteStoredFile(file.name);
      setNotice(`Đã xóa “${file.fileName}”.`);
      await loadFiles();
    } catch (err) {
      setError(err.message || "Không xóa được tệp.");
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="titles">
          <p className="crumb">Trang chủ / <span>Tệp</span></p>
          <h1>Kho tệp</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadFiles} disabled={loading || uploading}>
            <Icon name={loading ? "fa-spinner fa-spin" : "fa-rotate"} />
            Làm mới
          </button>
          <button type="button" className="primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Icon name={uploading ? "fa-spinner fa-spin" : "fa-upload"} />
            {uploading ? "Đang lưu…" : "Tải tệp lên"}
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.docx,.xlsx"
            onChange={onPick}
          />
        </div>
      </header>

      {error ? (
        <div className="banner is-error" role="alert">
          <Icon name="fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="panel panel-fill">
        <div className="panel-head">
          <div>
            <h2>Hình ảnh và tệp</h2>
            <p>
              {provider
                ? `Đang lưu trên ${provider}. Ảnh JPG, PNG, WEBP, GIF và tệp PDF, TXT, DOCX, XLSX, tối đa 8 MB.`
                : "Ảnh JPG, PNG, WEBP, GIF và tệp PDF, TXT, DOCX, XLSX, tối đa 8 MB."}
            </p>
          </div>
        </div>
        {loading && files.length === 0 ? <p className="cv-empty">Đang tải danh sách…</p> : null}
        {!loading && files.length === 0 ? (
          <div className="empty-state">
            <span className="empty-mark">
              <Icon name="fa-folder-open" />
            </span>
            <h3>Chưa có tệp</h3>
            <p>Tải ảnh hoặc tài liệu từ máy tính. Ảnh đại diện của hồ sơ cũng nằm trong cùng kho.</p>
          </div>
        ) : null}
        {files.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tệp</th>
                  <th>Kích thước</th>
                  <th>Lúc lưu</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.name}>
                    <td>
                      <div className="role-id">
                        <span className="avatar">
                          <Icon name={String(file.contentType || "").startsWith("image/") ? "fa-image" : "fa-file"} />
                        </span>
                        <div>
                          <strong>{file.fileName}</strong>
                          <span className="meta">{file.contentType}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatSize(file.size)}</td>
                    <td className="when">{formatWhen(file.lastModified)}</td>
                    <td>
                      <div className="board-card-actions">
                        <button type="button" className="ghost" onClick={() => onDownload(file)}>
                          <Icon name="fa-download" />
                          Tải về
                        </button>
                        <button type="button" className="danger" onClick={() => onDelete(file)}>
                          <Icon name="fa-trash" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {notice ? (
        <div className="toast" role="status">
          <Icon name="fa-circle-check" />
          <span>{notice}</span>
        </div>
      ) : null}
    </div>
  );
}
