import { useEffect, useState, lazy, Suspense } from "react";

import { Tab, TabList, TabPanel, Tabs } from "@/components/tabs";

const DOCS = "https://gramprokit.vercel.app";
const REPO = "https://github.com/anandhuremanan/headless-gbs-components";

/** Where index.html stores an explicit choice. Absent means "follow the device". */
const THEME_KEY = "gbs-theme";

const ClientDemo = lazy(() =>
  import("./demo/ClientDemo").then((module) => ({
    default: module.ClientDemo,
  })),
);

const ServerDemo = lazy(() =>
  import("./demo/ServerDemo").then((module) => ({
    default: module.ServerDemo,
  })),
);

const SelectDemo = lazy(() =>
  import("./demo/SelectDemo").then((module) => ({
    default: module.SelectDemo,
  })),
);

const DatePickerDemo = lazy(() =>
  import("./demo/DatePickerDemo").then((module) => ({
    default: module.DatePickerDemo,
  })),
);

const ToasterDemo = lazy(() =>
  import("./demo/ToasterDemo").then((module) => ({
    default: module.ToasterDemo,
  })),
);

const UploaderDemo = lazy(() =>
  import("./demo/UploaderDemo").then((module) => ({
    default: module.UploaderDemo,
  })),
);

const OverlaysDemo = lazy(() =>
  import("./demo/OverlaysDemo").then((module) => ({
    default: module.OverlaysDemo,
  })),
);

const FieldsDemo = lazy(() =>
  import("./demo/FieldsDemo").then((module) => ({
    default: module.FieldsDemo,
  })),
);

const ControlsDemo = lazy(() =>
  import("./demo/ControlsDemo").then((module) => ({
    default: module.ControlsDemo,
  })),
);

const SurfacesDemo = lazy(() =>
  import("./demo/SurfacesDemo").then((module) => ({
    default: module.SurfacesDemo,
  })),
);

const FormControlsDemo = lazy(() =>
  import("./demo/FormControlsDemo").then((module) => ({
    default: module.FormControlsDemo,
  })),
);

const DisplayDemo = lazy(() =>
  import("./demo/DisplayDemo").then((module) => ({
    default: module.DisplayDemo,
  })),
);

/**
 * Each demo, in the order they appear along the tab strip. `docs` points back
 * at the page on the documentation site that covers the same components.
 */
const TABS = [
  {
    id: "client",
    label: "Client · 100k rows",
    docs: "/datagrid",
    Panel: ClientDemo,
  },
  {
    id: "server",
    label: "Data Grid Server mode",
    docs: "/datagrid",
    Panel: ServerDemo,
  },
  {
    id: "select",
    label: "Select & MultiSelect",
    docs: "/combobox",
    Panel: SelectDemo,
  },
  {
    id: "dates",
    label: "Date pickers",
    docs: "/datepicker",
    Panel: DatePickerDemo,
  },
  { id: "toasts", label: "Toasts", docs: "/toaster", Panel: ToasterDemo },
  {
    id: "uploads",
    label: "Uploads",
    docs: "/fileuploader",
    Panel: UploaderDemo,
  },
  {
    id: "overlays",
    label: "Modal & Dialog",
    docs: "/modal",
    Panel: OverlaysDemo,
  },
  { id: "fields", label: "Inputs", docs: "/input", Panel: FieldsDemo },
  { id: "controls", label: "Controls", docs: "/tabs", Panel: ControlsDemo },
  {
    id: "surfaces",
    label: "Menus & surfaces",
    docs: "/menu",
    Panel: SurfacesDemo,
  },
  {
    id: "form-controls",
    label: "Switch, radio & number",
    docs: "/switch",
    Panel: FormControlsDemo,
  },
  {
    id: "display",
    label: "Alerts, badges & more",
    docs: "/alert",
    Panel: DisplayDemo,
  },
] as const;

const TOP_LINKS = [
  { label: "Components", href: `${DOCS}/theming` },
  { label: "Playground", href: `${DOCS}/playground` },
  { label: "1.x Docs", href: `${DOCS}/1.x.x-legacy/docs/getting-started` },
  { label: "Report a bug", href: `${REPO}/issues` },
];

type Theme = "light" | "dark";

/** The visitor's own choice, or null while they are still following the device. */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    /* Private mode, or storage blocked. Treat it as no choice. */
    return null;
  }
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Keep following the device for as long as the visitor has not picked a side.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      if (storedTheme() === null) setTheme(query.matches ? "dark" : "light");
    };

    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Private mode, or storage blocked. The choice just will not persist. */
    }

    setTheme(next);
  };

  return (
    <>
      <header className="v2-header">
        <div className="v2-container flex h-14 items-center gap-2">
          <a className="v2-brand" href={DOCS}>
            <img src="/favicon.svg" alt="" width="20" height="20" />
            Developer Demo
          </a>

          <span className="v2-pill">2.0.0-beta</span>

          <nav
            aria-label="Main"
            className="ml-4 hidden items-center gap-1 text-sm md:flex"
          >
            {TOP_LINKS.map(({ label, href }) => (
              <a key={label} className="v2-top-link" href={href}>
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <a
              className="v2-icon-btn"
              href={REPO}
              aria-label="Source on GitHub"
              rel="noreferrer"
            >
              <GitHubIcon />
            </a>

            <button
              type="button"
              className="v2-icon-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="v2-container py-10">
        <p className="v2-eyebrow">Developer demo</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Every component, running live
        </h1>

        <p className="v2-lead mt-3">
          Read the API on the <a href={`${DOCS}/theming`}>docs site</a>, or try
          a palette in the <a href={`${DOCS}/playground`}>theming playground</a>
          .
        </p>

        <div className="mt-8">
          <Tabs defaultValue="client">
            <TabList aria-label="Demos">
              {TABS.map(({ id, label }) => (
                <Tab key={id} value={id}>
                  {label}
                </Tab>
              ))}
            </TabList>

            {TABS.map(({ id, label, docs, Panel }) => (
              <TabPanel key={id} value={id} className="pt-4">
                <section className="v2-card">
                  <header>
                    <h2>
                      <span className="v2-dot" aria-hidden="true" />
                      {label}
                    </h2>

                    <a className="v2-doclink" href={`${DOCS}${docs}`}>
                      Docs ↗
                    </a>
                  </header>

                  <div className="v2-stage">
                    <Suspense fallback={<div className="v2-skeleton" />}>
                      <Panel />
                    </Suspense>
                  </div>
                </section>
              </TabPanel>
            ))}
          </Tabs>
        </div>

        <footer className="v2-footer flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            GramproKit 2.0.0-beta · zero-dependency components for React 19
          </span>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-5 gap-y-2 md:ml-auto"
          >
            {TOP_LINKS.map(({ label, href }) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </nav>
        </footer>
      </main>
    </>
  );
}

export default App;
