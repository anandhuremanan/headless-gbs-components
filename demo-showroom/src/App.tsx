import { useState, lazy, Suspense } from "react";

import { Button } from "@/components/button";
import { Tab, TabList, TabPanel, Tabs } from "@/components/tabs";

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

/** Each demo, in the order they appear along the tab strip. */
const TABS = [
  { id: "client", label: "Client · 100k rows", Panel: ClientDemo },
  { id: "server", label: "Data Grid Server mode", Panel: ServerDemo },
  { id: "select", label: "Select & MultiSelect", Panel: SelectDemo },
  { id: "dates", label: "Date pickers", Panel: DatePickerDemo },
  { id: "toasts", label: "Toasts", Panel: ToasterDemo },
  { id: "uploads", label: "Uploads", Panel: UploaderDemo },
  { id: "overlays", label: "Modal & Dialog", Panel: OverlaysDemo },
  { id: "fields", label: "Inputs", Panel: FieldsDemo },
  { id: "controls", label: "Controls", Panel: ControlsDemo },
  { id: "surfaces", label: "Menus & surfaces", Panel: SurfacesDemo },
  {
    id: "form-controls",
    label: "Switch, radio & number",
    Panel: FormControlsDemo,
  },
  { id: "display", label: "Alerts, badges & more", Panel: DisplayDemo },
] as const;

function App() {
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Grampro Kit Developer Demo{" "}
            <span className="text-xs text-white px-1 rounded-sm font-extralight bg-linear-to-r from-[#29abe2] via-[#6366f1] via-60% to-[#a855f7]">
              version 2.0.0 beta
            </span>
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Zero-dependency components for React 19
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {dark ? "Light mode" : "Dark mode"}
        </Button>
      </header>

      <main>
        <Tabs defaultValue="client">
          <TabList aria-label="Demos">
            {TABS.map(({ id, label }) => (
              <Tab key={id} value={id}>
                {label}
              </Tab>
            ))}
          </TabList>

          <div className="w-full flex text-xs justify-end text-gray-500">Scroll For More Components »»</div>
          {TABS.map(({ id, Panel, label }) => (
            <TabPanel key={id} value={id} className="pt-4">
              <Suspense fallback={<div>Loading {label}...</div>}>
                <Panel />
              </Suspense>
            </TabPanel>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
