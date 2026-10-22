import { useEffect, useRef, useState } from "react";
import { getChatModels, sendChat } from "../api/chat";
import Icon from "./Icon.jsx";

const STORAGE_KEY = "warehouse.chat";

function readSaved() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    const messages = Array.isArray(parsed?.messages)
      ? parsed.messages.filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
      : [];
    return {
      messages,
      model: typeof parsed?.model === "string" ? parsed.model : "",
    };
  } catch {
    return { messages: [], model: "" };
  }
}

export default function ChatPage() {
  const saved = useRef(readSaved());
  const [messages, setMessages] = useState(saved.current.messages);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState(saved.current.model);
  const [configured, setConfigured] = useState(true);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getChatModels()
      .then((data) => {
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data?.models) ? data.models : [];
        setModels(list);
        setConfigured(Boolean(data?.configured));
        setNotice(typeof data?.notice === "string" ? data.notice : "");
        setModel((current) => {
          if (current && list.some((item) => item.id === current)) {
            return current;
          }
          if (data?.defaultModel && list.some((item) => item.id === data.defaultModel)) {
            return data.defaultModel;
          }
          return list[0]?.id || "";
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Không tải được danh sách mô hình.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, model }));
  }, [messages, model]);

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, sending]);

  async function submit(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || !model) {
      return;
    }

    const next = [...messages, { role: "user", content }].slice(-20);
    setMessages(next);
    setDraft("");
    setSending(true);
    setError("");
    try {
      const data = await sendChat({
        model: model || null,
        messages: next.map((item) => ({ role: item.role, content: item.content })),
      });
      setMessages((current) => [...current, { role: "assistant", content: data?.reply || "" }].slice(-20));
      if (data?.model) {
        setModel(data.model);
      }
    } catch (err) {
      setError(err.message || "Không gửi được câu hỏi.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  return (
    <section className="workspace">
      <div className="panel panel-fill chat-panel">
        <header className="panel-head is-split">
          <div>
            <h2>Trợ lý</h2>
            <p>Câu trả lời do Ollama trên máy này soạn.</p>
          </div>
          <div className="chat-tools">
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={models.length === 0}
              aria-label="Mô hình"
            >
              {models.length === 0 ? <option value="">Chưa có mô hình Ollama</option> : null}
              {models.map((item) => (
                <option key={item.id} value={item.id}>{item.id}</option>
              ))}
            </select>
            <button type="button" className="ghost" onClick={clearChat} disabled={messages.length === 0 || sending}>
              <Icon name="fa-trash" />
              Xóa hội thoại
            </button>
          </div>
        </header>

        {!configured ? (
          <div className="banner is-error" role="status">
            <Icon name="fa-triangle-exclamation" />
            <span>Chưa cấu hình Ollama. Đặt OLLAMA_URL trong backend/.env, rồi khởi động lại API.</span>
          </div>
        ) : null}
        {configured && notice ? (
          <div className="banner is-error" role="status">
            <Icon name="fa-triangle-exclamation" />
            <span>{notice}</span>
          </div>
        ) : null}
        {error ? (
          <div className="banner is-error" role="alert">
            <Icon name="fa-triangle-exclamation" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="chat-log" ref={logRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Icon name="fa-comments" />
              <p>Hỏi cách dùng vai trò, hồ sơ, bằng cấp hoặc kinh nghiệm.</p>
            </div>
          ) : messages.map((item, index) => (
            <article key={`${item.role}-${index}`} className={item.role === "user" ? "chat-bubble is-user" : "chat-bubble"}>
              <strong>{item.role === "user" ? "Bạn" : "Trợ lý"}</strong>
              <p>{item.content}</p>
            </article>
          ))}
          {sending ? (
            <article className="chat-bubble">
              <strong>Trợ lý</strong>
              <p>Đang soạn câu trả lời…</p>
            </article>
          ) : null}
        </div>

        <form className="chat-composer" onSubmit={submit}>
          <textarea
            rows={3}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nhập câu hỏi. Enter để gửi, Shift+Enter để xuống dòng."
            disabled={sending || !configured}
          />
          <button type="submit" className="primary" disabled={sending || !configured || !model || draft.trim() === ""}>
            <Icon name={sending ? "fa-spinner fa-spin" : "fa-paper-plane"} />
            {sending ? "Đang gửi…" : "Gửi"}
          </button>
        </form>
      </div>
    </section>
  );
}
