import { useCallback, useEffect, useRef, useState } from "react";
import { getFiles } from "./api/files";
import { getPositions } from "./api/positions";
import { getQualifications } from "./api/qualifications";
import { getWorkExperiences } from "./api/workExperiences";
import { getRoles } from "./api/roles";
import { clearSession, readSession } from "./api/session";
import { getUserProfiles } from "./api/userProfiles";
import { getUsers } from "./api/users";
import AvatarPhoto from "./components/AvatarPhoto.jsx";
import ChatPage from "./components/ChatPage.jsx";
import FilesPage from "./components/FilesPage.jsx";
import Icon from "./components/Icon.jsx";
import LoginPage from "./components/LoginPage.jsx";
import PositionsPage from "./components/PositionsPage.jsx";
import QualificationsPage from "./components/QualificationsPage.jsx";
import RolesPage from "./components/RolesPage.jsx";
import UserProfilesPage from "./components/UserProfilesPage.jsx";
import UsersPage from "./components/UsersPage.jsx";
import WorkExperiencesPage from "./components/WorkExperiencesPage.jsx";

function SidebarToggleIcon({ collapsed }) {
  return (
    <svg className="sidebar-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.25" y="4.25" width="17.5" height="15.5" rx="2.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d={collapsed ? "M10 12h5.2M15.2 12l-2.3-2.3M15.2 12l-2.3 2.3" : "M14.2 12H9M9 12l2.3-2.3M9 12l2.3 2.3"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [positionCount, setPositionCount] = useState(0);
  const [qualificationCount, setQualificationCount] = useState(0);
  const [experienceCount, setExperienceCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [profileCount, setProfileCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [accountAvatar, setAccountAvatar] = useState("");
  const accountRef = useRef(null);

  const setRoleTotal = useCallback((count) => setRoleCount(count), []);
  const setPositionTotal = useCallback((count) => setPositionCount(count), []);
  const setQualificationTotal = useCallback((count) => setQualificationCount(count), []);
  const setExperienceTotal = useCallback((count) => setExperienceCount(count), []);
  const setUserTotal = useCallback((count) => setUserCount(count), []);
  const setProfileTotal = useCallback((count) => setProfileCount(count), []);
  const setFileTotal = useCallback((count) => setFileCount(count), []);
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
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function onPointerDown(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function onKey(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    function onLogout() {
      setSession(null);
    }

    function onAvatar(event) {
      if (event.detail?.userId === session?.user?.id) {
        setAccountAvatar(event.detail.avatarUrl || "");
      }
    }

    function onAccounts() {
      getUserProfiles()
        .then((data) => {
          if (Array.isArray(data)) {
            setProfileCount(data.length);
          }
        })
        .catch(() => {});
    }

    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("profile:avatar", onAvatar);
    window.addEventListener("accounts:changed", onAccounts);
    return () => {
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("profile:avatar", onAvatar);
      window.removeEventListener("accounts:changed", onAccounts);
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setAccountAvatar("");
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

    getPositions()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPositionCount(data.length);
        }
      })
      .catch(() => {});

    getQualifications()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setQualificationCount(data.length);
        }
      })
      .catch(() => {});

    getWorkExperiences()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setExperienceCount(data.length);
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

    getUserProfiles()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setProfileCount(data.length);
          const mine = data.find((profile) => profile.userId === session.user.id);
          setAccountAvatar(mine?.avatarUrl || "");
        }
      })
      .catch(() => {});

    getFiles()
      .then((data) => {
        if (!cancelled && Array.isArray(data?.files)) {
          setFileCount(data.files.length);
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
    setMenuOpen(false);
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
        <button
          type="button"
          className="header-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
        <div className="header-user">
          <div className="account" ref={accountRef}>
            <button
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="avatar">
                {accountAvatar ? (
                  <AvatarPhoto url={accountAvatar} name={session.user.fullName} className="avatar-face" />
                ) : (
                  initials || "?"
                )}
                <span
                  className={online ? "presence is-online" : "presence"}
                  title={online ? "Đang trực tuyến" : "Ngoại tuyến"}
                />
              </span>
              <span className="account-label">
                <strong>{session.user.fullName}</strong>
                <small>{session.user.roleName}</small>
              </span>
            </button>
            {menuOpen ? (
              <div className="account-menu" role="menu">
                <div className="account-menu-head">
                  <strong>{session.user.fullName}</strong>
                  <span>@{session.user.username}</span>
                  <span className={online ? "account-status is-online" : "account-status"}>
                    {online ? "Đang trực tuyến" : "Ngoại tuyến"}
                  </span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                    setMenuOpen(false);
                  }}
                >
                  <Icon name={theme === "dark" ? "fa-sun" : "fa-moon"} />
                  {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                </button>
                <button type="button" role="menuitem" className="is-danger" onClick={logout}>
                  <Icon name="fa-right-from-bracket" />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
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
              className={page === "positions" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "positions" ? "page" : undefined}
              title={collapsed ? "Chức vụ" : undefined}
              onClick={() => openPage("positions")}
            >
              <Icon name="fa-briefcase" />
              <span>Chức vụ</span>
              <em>{positionCount}</em>
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
            <button
              type="button"
              className={page === "profiles" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "profiles" ? "page" : undefined}
              title={collapsed ? "Hồ sơ" : undefined}
              onClick={() => openPage("profiles")}
            >
              <Icon name="fa-id-card" />
              <span>Hồ sơ</span>
              <em>{profileCount}</em>
            </button>
            <button
              type="button"
              className={page === "qualifications" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "qualifications" ? "page" : undefined}
              title={collapsed ? "Bằng cấp" : undefined}
              onClick={() => openPage("qualifications")}
            >
              <Icon name="fa-certificate" />
              <span>Bằng cấp</span>
              <em>{qualificationCount}</em>
            </button>
            <button
              type="button"
              className={page === "experiences" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "experiences" ? "page" : undefined}
              title={collapsed ? "Kinh nghiệm" : undefined}
              onClick={() => openPage("experiences")}
            >
              <Icon name="fa-user-clock" />
              <span>Kinh nghiệm</span>
              <em>{experienceCount}</em>
            </button>
            <button
              type="button"
              className={page === "files" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "files" ? "page" : undefined}
              title={collapsed ? "Tệp" : undefined}
              onClick={() => openPage("files")}
            >
              <Icon name="fa-folder-open" />
              <span>Tệp</span>
              <em>{fileCount}</em>
            </button>
            <button
              type="button"
              className={page === "chat" ? "nav-item is-active" : "nav-item"}
              aria-current={page === "chat" ? "page" : undefined}
              title={collapsed ? "Trợ lý" : undefined}
              onClick={() => openPage("chat")}
            >
              <Icon name="fa-comments" />
              <span>Trợ lý</span>
            </button>
          </nav>

          <div className="sidebar-user">
            <strong>{session.user.fullName}</strong>
            <small>@{session.user.username}</small>
          </div>
        </aside>

        {page === "chat" ? (
          <ChatPage />
        ) : page === "users" ? (
          <UsersPage onCount={setUserTotal} onOpenRoles={openRoles} />
        ) : page === "files" ? (
          <FilesPage onCount={setFileTotal} />
        ) : page === "profiles" ? (
          <UserProfilesPage onCount={setProfileTotal} />
        ) : page === "qualifications" ? (
          <QualificationsPage onCount={setQualificationTotal} />
        ) : page === "experiences" ? (
          <WorkExperiencesPage onCount={setExperienceTotal} />
        ) : page === "positions" ? (
          <PositionsPage onCount={setPositionTotal} />
        ) : (
          <RolesPage onCount={setRoleTotal} />
        )}
      </div>
    </div>
  );
}
