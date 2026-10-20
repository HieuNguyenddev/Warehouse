import { useCallback, useEffect, useState } from "react";
import { getRoles } from "./api/roles";
import { clearSession, readSession } from "./api/session";
import { getUsers } from "./api/users";
import Icon from "./components/Icon.jsx";
import LoginPage from "./components/LoginPage.jsx";
import RolesPage from "./components/RolesPage.jsx";
import UsersPage from "./components/UsersPage.jsx";

function readTheme() {
  const stored = localStorage.getItem("warehouse.theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [session, setSession] = useState(() => readSession());
  const [page, setPage] = useState("roles");
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("warehouse.sidebar") === "collapsed",
  );
  const [theme, setTheme] = useState(readTheme);
  const [roleCount, setRoleCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const setRoleTotal = useCallback((count) => setRoleCount(count), []);
  const setUserTotal = useCallback((count) => setUserCount(count), []);
  const openRoles = useCallback(() => {
    setPage("roles");
    setNavOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("warehouse.theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("warehouse.sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  useEffect(() => {
    function onLogout() {
      setSession(null);
    }

    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    let cancelled = false;

    getRoles()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setRoleCount(data.length);
        }
      })
      .catch(() => {});

    getUsers()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setUserCount(data.length);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session]);

  function logout() {
    clearSession();
    setSession(null);
    setNavOpen(false);
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  if (!session) {
    return <LoginPage onSuccess={setSession} theme={theme} onToggleTheme={toggleTheme} />;
  }

  function openPage(next) {
    setPage(next);
    setNavOpen(false);
  }

  const initials = String(session.user.fullName || session.user.username || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app">
      <header className="app-header">
        <button
          type="button"
          className="icon-btn header-menu"
          onClick={() => setNavOpen(true)}
          aria-label="Mở menu"
        >
          <Icon name="fa-bars" />
        </button>
        <div className="brand header-brand">
          <span className="brand-mark">
            <Icon name="fa-cubes" />
          </span>
          <div>
            <strong>Kho Admin</strong>
            <small>minhhieudev</small>
          </div>
        </div>
        <div className="header-user">
          <span className="avatar">{initials || "?"}</span>
          <div>
            <strong>{session.user.fullName}</strong>
            <small>{session.user.roleName}</small>
          </div>
          <button
            type="button"
            className="header-logout"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
          >
            <Icon name={theme === "dark" ? "fa-sun" : "fa-moon"} />
          </button>
          <button type="button" className="header-logout" onClick={logout} aria-label="Đăng xuất">
            <Icon name="fa-right-from-bracket" />
          </button>
        </div>
      </header>

      <div className={collapsed ? "shell is-collapsed" : "shell"}>
        <div
          className={navOpen ? "backdrop is-visible" : "backdrop"}
          onClick={() => setNavOpen(false)}
        />

        <aside className={navOpen ? "sidebar is-open" : "sidebar"}>
          <div className="brand">
            <p className="nav-label">Quản trị</p>
            <button
              type="button"
              className="icon-btn sidebar-close"
              onClick={() => setNavOpen(false)}
              aria-label="Đóng menu"
            >
              <Icon name="fa-xmark" />
            </button>
          </div>

          <nav className="nav">
            <button
              type="button"
              className={page === "roles" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "roles" ? "page" : undefined}
              title={collapsed ? "Vai trò" : undefined}
              onClick={() => openPage("roles")}
            >
              <Icon name="fa-user-shield" />
              <span>Vai trò</span>
              <em>{roleCount}</em>
            </button>
            <button
              type="button"
              className={page === "users" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "users" ? "page" : undefined}
              title={collapsed ? "Người dùng" : undefined}
              onClick={() => openPage("users")}
            >
              <Icon name="fa-users" />
              <span>Người dùng</span>
              <em>{userCount}</em>
            </button>
          </nav>

          <div className="sidebar-user">
            <strong>{session.user.fullName}</strong>
            <small>@{session.user.username}</small>
          </div>

          <button
            type="button"
            className="nav-item sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <Icon name={collapsed ? "fa-angles-right" : "fa-angles-left"} />
            <span>{collapsed ? "Mở rộng" : "Thu gọn"}</span>
          </button>
        </aside>

        {page === "users" ? (
          <UsersPage onCount={setUserTotal} onOpenRoles={openRoles} />
        ) : (
          <RolesPage onCount={setRoleTotal} />
        )}
      </div>
    </div>
  );
}
