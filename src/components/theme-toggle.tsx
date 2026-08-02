"use client";

function toggleTheme() {
  const root = document.documentElement;
  const current =
    root.getAttribute("data-theme") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("picota-theme", next);
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar entre modo claro y oscuro"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-dim)] transition-colors hover:border-[var(--pine)] hover:text-[var(--pine)] sm:h-9 sm:w-9"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="icon-light"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="icon-dark"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path
          strokeLinecap="round"
          d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        />
      </svg>
    </button>
  );
}
