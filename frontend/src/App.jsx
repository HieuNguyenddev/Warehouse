import { useCallback, useEffect, useState } from "react";
import { getRoles } from "./api/roles";
import { clearSession, readSession } from "./api/session";
import { getUsers } from "./api/users";
import Icon from "./components/Icon.jsx";
import LoginPage from "./components/LoginPage.jsx";
import RolesPage from "./components/RolesPage.jsx";
import UsersPage from "./components/UsersPage.jsx";

export default function App() {
  const [session, setSession] = useState(() => readSession());
  const [page, setPage] = useState("roles");
  const [navOpen, setNavOpen] = useState(false);
  const [roleCount, setRoleCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const setRoleTotal = useCallback((count) => setRoleCount(count), []);
  const setUserTotal = useCallback((count) => setUserCount(count), []);
  const openRoles = useCallback(() => {
    setPage("roles");
    setNavOpen(false);
  }, []);

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

  if (!session) {
    return <LoginPage onSuccess={setSession} />;
  }

  function openPage(next) {
    setPage(next);
    setNavOpen(false);
  }

  return (
    <div className="app">
      <div
        className={navOpen ? "backdrop is-visible" : "backdrop"}
        onClick={() => setNavOpen(false)}
      />

      <aside className={navOpen ? "sidebar is-open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="fa-shield-halved" />
          </span>
          <div>
            <strong>Admin</strong>
            <small>minhhieudev</small>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setNavOpen(false)}
            aria-label="Đóng menu"
          >
            <Icon name="fa-xmark" />
          </button>
        </div>

        <p className="nav-label">Điều hướng</p>
        <nav className="nav">
          <button
            type="button"
            className={page === "roles" ? "nav-item is-active" : "nav-item"}
            aria-current={page === "roles" ? "page" : undefined}
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
            onClick={() => openPage("users")}
          >
            <Icon name="fa-users" />
            <span>Người dùng</span>
            <em>{userCount}</em>
          </button>
        </nav>

        <div className="sidebar-user">
          <strong>{session.user.fullName}</strong>
          <small>
            @{session.user.username} · {session.user.roleName}
          </small>
          <button type="button" className="nav-item" onClick={logout}>
            <Icon name="fa-right-from-bracket" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {page === "users" ? (
        <UsersPage onCount={setUserTotal} onOpenRoles={openRoles} onOpenNav={() => setNavOpen(true)} />
      ) : (
        <RolesPage onCount={setRoleTotal} onOpenNav={() => setNavOpen(true)} />
      )}
    </div>
  );
}
