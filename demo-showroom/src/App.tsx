import { useState } from "react";
import { ClientDemo } from "./demo/ClientDemo";
import { DatePickerDemo } from "./demo/DatePickerDemo";
import { SelectDemo } from "./demo/SelectDemo";
import { ToasterDemo } from "./demo/ToasterDemo";
import { UploaderDemo } from "./demo/UploaderDemo";
import { OverlaysDemo } from "./demo/OverlaysDemo";
import { FieldsDemo } from "./demo/FieldsDemo";
import { ControlsDemo } from "./demo/ControlsDemo";
import { ServerDemo } from "./demo/ServerDemo";
import { SurfacesDemo } from "./demo/SurfacesDemo";
import { FormControlsDemo } from "./demo/FormControlsDemo";
import { DisplayDemo } from "./demo/DisplayDemo";
import { Button } from "../../source/beta-components/button";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "../../source/beta-components/tabs";

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
          <h1 className="text-xl font-semibold">Grampro Kit Developer Demo</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Zero-dependency components for React 19
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {dark ? "Light mode" : "Dark mode"}
        </Button>
      </header>

      <main>
        {/* The Tabs component owns the selection, the roles and the keyboard,
            so there is no tablist wrapper and no tab state here. */}
        <Tabs defaultValue="client">
          <TabList aria-label="Demos">
            {TABS.map(({ id, label }) => (
              <Tab key={id} value={id}>
                {label}
              </Tab>
            ))}
          </TabList>

          {TABS.map(({ id, Panel }) => (
            <TabPanel key={id} value={id} className="pt-4">
              <Panel />
            </TabPanel>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
