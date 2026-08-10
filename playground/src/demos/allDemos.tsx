import React, { useState } from "react";
import { Button } from "../../component-lib/button";
import { Card } from "../../component-lib/card";
import { Checkbox } from "../../component-lib/checkbox";
import { DarkMode } from "../../component-lib/darkmode";
import { Input } from "../../component-lib/input";
import { TextArea } from "../../component-lib/textarea";
import MaterialInput from "../../component-lib/materialinput";
import { Select } from "../../component-lib/select";
import { MultiSelect } from "../../component-lib/multiselect";
import { DatePicker } from "../../component-lib/datepicker";
import { Dialog } from "../../component-lib/dialog";
import { Modal } from "../../component-lib/modal";
import { Spinner } from "../../component-lib/spinner";
import { Toaster } from "../../component-lib/toast";
import { useToast } from "../../component-lib/toast/useToast";
import { Tabs } from "../../component-lib/tabs";
import { FileUploader } from "../../component-lib/uploader";
import FormRenderer from "../../component-lib/formrenderer";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
} from "../../component-lib/contextmenu";
import Navbar from "../../component-lib/navbar";
import { DataGrid } from "../../component-lib/datagrid";
import { Breadcrumb } from "../../component-lib/breadcrumb";
import { BarChart } from "../../component-lib/bargraph";
import { useChunkedUpload } from "../../component-lib/useuploader/useUploader";
import { Sidebar } from "../../component-lib/sidebar";

// -------------------------------------------------------------
// 1. Button Demo
// -------------------------------------------------------------
export const ButtonDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">Button Component</h3>
    <div className="flex flex-wrap gap-4">
      <Button onClick={() => alert("Primary button clicked!")}>
        Primary Button
      </Button>
      <Button buttonClass="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200">
        Indigo Custom Button
      </Button>
      <Button buttonClass="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-lg">
        Danger Button
      </Button>
      <Button
        disabled
        buttonClass="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
      >
        Disabled Button
      </Button>
    </div>
  </div>
);

// -------------------------------------------------------------
// 2. Card Demo
// -------------------------------------------------------------
export const CardDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">Card Component</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card cardClass="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-300">
        <h4 className="text-lg font-semibold text-white mb-2">
          Workspace Analytics
        </h4>
        <p className="text-sm">
          Track code updates, pull requests, and component installation scripts
          in real-time.
        </p>
      </Card>
      <Card cardClass="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-2xl text-slate-300">
        <h4 className="text-lg font-semibold text-indigo-400 mb-2">
          Premium Features
        </h4>
        <p className="text-sm">
          Unlock state synchronization, context menu mapping, and
          high-performance tables.
        </p>
      </Card>
    </div>
  </div>
);

// -------------------------------------------------------------
// 3. Checkbox Demo
// -------------------------------------------------------------
export const CheckboxDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-2">Checkbox Component</h3>
      <div className="flex items-center gap-3">
        <Checkbox
          id="terms"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <label
          htmlFor="terms"
          className="text-sm text-slate-300 cursor-pointer"
        >
          I accept all terms and conditions
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Checked state value:{" "}
        <code className="text-indigo-400">{checked.toString()}</code>
      </p>
    </div>
  );
};

// -------------------------------------------------------------
// 4. DarkMode Demo
// -------------------------------------------------------------
export const DarkModeDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">DarkMode Toggle</h3>
    <p className="text-sm text-slate-400">
      Click the toggle button below to switch the application theme dynamically
      between Light and Dark mode.
    </p>
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl w-fit flex items-center justify-center">
      <DarkMode />
    </div>
  </div>
);

// -------------------------------------------------------------
// 5. Input Demo
// -------------------------------------------------------------
export const InputDemo = () => {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-4 max-w-sm">
      <h3 className="text-xl font-bold text-white mb-2">Input Component</h3>
      <Input
        placeholder="Enter your email address..."
        value={val}
        onChange={(e: any) => setVal(e.target.value)}
      />
      {val && (
        <p className="text-xs text-slate-400">
          User Input: <code className="text-indigo-400">{val}</code>
        </p>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 6. TextArea Demo
// -------------------------------------------------------------
export const TextAreaDemo = () => {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-xl font-bold text-white mb-2">TextArea Component</h3>
      <TextArea
        placeholder="Write a message or comments..."
        value={val}
        onChange={(e: any) => setVal(e.target.value)}
        rows={4}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 7. MaterialInput Demo
// -------------------------------------------------------------
export const MaterialInputDemo = () => {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-4 max-w-sm">
      <h3 className="text-xl font-bold text-white mb-2">
        MaterialInput Component
      </h3>
      <div className="pt-2">
        <MaterialInput
          label="Username"
          placeholder=" "
          value={val}
          onChange={(e: any) => setVal(e.target.value)}
        />
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 8. Select & MultiSelect Demo
// -------------------------------------------------------------
const FRAMEWORKS = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid" },
];

export const SelectDemo = () => {
  const [selected, setSelected] = useState<string | undefined>("react");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([
    "react",
    "svelte",
  ]);

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Select Dropdown</h3>
        <Select
          items={FRAMEWORKS}
          selectedItem={selected}
          onSelect={setSelected}
        />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          MultiSelect Dropdown
        </h3>
        <MultiSelect
          items={FRAMEWORKS}
          selectedItems={selectedMulti}
          onSelect={setSelectedMulti}
        />
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 9. DatePicker Demo
// -------------------------------------------------------------
export const DatePickerDemo = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return (
    <div className="space-y-4 max-w-xs">
      <h3 className="text-xl font-bold text-white mb-2">DatePicker</h3>
      <DatePicker
        selectedDateValue={date}
        onDateChange={(newDate) => setDate(newDate || undefined)}
      />
      <p className="text-xs text-slate-500">
        Selected Date: {date ? date.toLocaleDateString("en-GB") : "none"}
      </p>
    </div>
  );
};

// -------------------------------------------------------------
// 10. Dialog & Modal Demo
// -------------------------------------------------------------
export const DialogAndModalDemo = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Dialog Component</h3>
        <Button onClick={() => setShowDialog(true)}>Trigger Dialog</Button>
        <Dialog
          showDialog={showDialog}
          dialogMessage="Confirm action? This operation is permanent."
          onDialogActionOneClick={() => {
            alert("Confirmed!");
            setShowDialog(false);
          }}
          onDialogActionTwoClick={() => setShowDialog(false)}
        />
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-xl font-bold text-white mb-2">Modal Component</h3>
        <Button onClick={() => setShowModal(true)}>Trigger Modal</Button>
        <Modal showModal={showModal} setShowModal={setShowModal}>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full relative mx-auto text-slate-200">
            <h4 className="text-lg font-bold text-white mb-2">
              Interactive Modal Panel
            </h4>
            <p className="text-sm mb-4">
              Headless React Modal rendered inside document.body overlay
              context.
            </p>
            <Button onClick={() => setShowModal(false)}>Close Modal</Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 11. Spinner Demo
// -------------------------------------------------------------
export const SpinnerDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">Spinner Component</h3>
    <div className="flex gap-6 items-center">
      <Spinner />
      <span className="text-sm text-slate-400 animate-pulse">
        Loading workspace files...
      </span>
    </div>
  </div>
);

// -------------------------------------------------------------
// 12. Toast Demo
// -------------------------------------------------------------
export const ToastDemo = () => {
  const { toast } = useToast();
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-2">Toast Notifications</h3>
      <Toaster position="top-right" />
      <div className="flex gap-4">
        <Button
          onClick={() =>
            toast({
              title: "Operation Complete",
              description: "All pages were synced successfully.",
              type: "success",
            })
          }
        >
          Success Toast
        </Button>
        <Button
          onClick={() =>
            toast({
              title: "Sync Interrupted",
              description: "Failed to upload chunked packages.",
              type: "error",
            })
          }
        >
          Error Toast
        </Button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 13. Tabs Demo
// -------------------------------------------------------------
export const TabsDemo = () => {
  const tabsList = [
    { id: "tab1", label: "Workspace" },
    { id: "tab2", label: "Configuration" },
    { id: "tab3", label: "Team Settings", disabled: true },
  ];

  return (
    <div className="space-y-4 max-w-xl">
      <h3 className="text-xl font-bold text-white mb-2">Tabs Component</h3>
      <Tabs
        tabs={tabsList}
        renderContent={(id) => (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-slate-300">
            {id === "tab1" && (
              <p>Displaying local Git workspace and linked files.</p>
            )}
            {id === "tab2" && (
              <p>Access compile settings and tailwind v4 loaders.</p>
            )}
          </div>
        )}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 14. File Uploader Demo
// -------------------------------------------------------------
export const UploaderDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">File Uploader</h3>
    <FileUploader
      multiple={true}
      showImagePreview={true}
      inputFileSize={5}
      fileCount={3}
      onChange={(files) => console.log("Files:", files)}
    />
  </div>
);

// -------------------------------------------------------------
// 15. FormRenderer Demo
// -------------------------------------------------------------
export const FormRendererDemo = () => {
  const schema = [
    {
      name: "name",
      label: "User Name",
      component: "input",
      type: "text",
      required: true,
      placeholder: "Guest",
    },
    {
      name: "comments",
      label: "User Bio",
      component: "textarea",
      placeholder: "Bio description...",
    },
    { component: "button", button_type: "submit", value: "Submit Form" },
  ];

  return (
    <div className="space-y-4 max-w-sm">
      <h3 className="text-xl font-bold text-white mb-2">FormRenderer</h3>
      <FormRenderer
        schema={schema as any}
        onSubmit={(fd) => {
          alert(`Form submitted! Name: ${fd.get("name")}`);
        }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 16. ContextMenu Demo
// -------------------------------------------------------------
export const ContextMenuDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">ContextMenu</h3>
    <p className="text-sm text-slate-400">
      Right-click anywhere inside the preview browser panel to reveal the custom
      context menu layout.
    </p>
    <ContextMenu>
      <ContextMenuItem onClick={() => alert("Open clicked")}>
        Open Workspace
      </ContextMenuItem>
      <ContextMenuItem onClick={() => alert("Edit clicked")}>
        Edit Code
      </ContextMenuItem>
      <ContextMenuDivider />
      <ContextMenuItem onClick={() => alert("Delete clicked")} disabled>
        Delete File
      </ContextMenuItem>
    </ContextMenu>
  </div>
);

// -------------------------------------------------------------
// 17. Navbar Demo
// -------------------------------------------------------------
export const NavbarDemo = () => {
  const brand = { name: "GBS Scaffold", href: "#" };
  const items = [
    { id: "1", label: "Home", href: "#" },
    { id: "2", label: "Docs", href: "#" },
    {
      id: "3",
      label: "Support",
      href: "#",
      children: [
        { id: "3-1", label: "Help Center", href: "#" },
        { id: "3-2", label: "Contact API", href: "#" },
      ],
    },
  ];

  return (
    <div className="space-y-4 w-full">
      <h3 className="text-xl font-bold text-white mb-2">Navbar Component</h3>
      <Navbar brand={brand} items={items} showAuthButtons showSearchBar />
    </div>
  );
};

// -------------------------------------------------------------
// 18. DataGrid Demo
// -------------------------------------------------------------
export const DataGridDemo = () => {
  const mockData = [
    { id: 1, name: "Vite build loader", status: "Active", size: "12 KB" },
    { id: 2, name: "Tailwind processor", status: "Idle", size: "48 KB" },
    { id: 3, name: "Portal wrapper", status: "Active", size: "9 KB" },
  ];

  const columns = [
    { field: "id", headerText: "ID", width: 10 },
    { field: "name", headerText: "Asset Name", width: 40 },
    { field: "status", headerText: "Status", width: 25 },
    { field: "size", headerText: "Size", width: 25 },
  ];

  return (
    <div className="space-y-4 w-full overflow-x-auto">
      <h3 className="text-xl font-bold text-white mb-2">DataGrid</h3>
      <DataGrid
        dataSource={mockData}
        columns={columns}
        pageSettings={{ pageNumber: 1 }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 19. Breadcrumb Demo
// -------------------------------------------------------------
export const BreadcrumbDemo = () => (
  <div className="space-y-4">
    <h3 className="text-xl font-bold text-white mb-2">Breadcrumb</h3>
    <Breadcrumb showHome={true} homeLabel="Playground" />
  </div>
);

// -------------------------------------------------------------
// 20. BarChart (Bargraph) Demo
// -------------------------------------------------------------
export const BargraphDemo = () => {
  const data = [
    { label: "React", value: 85 },
    { label: "Vue", value: 45 },
    { label: "Svelte", value: 65 },
    { label: "Angular", value: 30 },
  ];
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-xl font-bold text-white mb-2">BarChart Graph</h3>
      <BarChart data={data} title="Framework Performance Index" />
    </div>
  );
};

// -------------------------------------------------------------
// 21. Hooks: usePaginatedData & useChunkedUpload
// -------------------------------------------------------------
export const HooksDemo = () => {
  const { isUploading, uploadStatus, uploadProgress } = useChunkedUpload();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          usePaginatedData Hook
        </h3>
        <p className="text-sm text-slate-400">
          Provides pagination, search filters, and export routines for async
          data pools.
        </p>
      </div>
      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-xl font-bold text-white mb-2">
          useChunkedUpload Hook
        </h3>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
          <div>
            Uploading state:{" "}
            <code className="text-indigo-400">{isUploading.toString()}</code>
          </div>
          <div>
            Status message:{" "}
            <code className="text-indigo-400">{uploadStatus || "Ready"}</code>
          </div>
          <div>
            Progress tracking:{" "}
            <code className="text-indigo-400">
              {JSON.stringify(uploadProgress)}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 22. Sidebar Demo
// -------------------------------------------------------------
export const SideBarDemo = () => {
  const mockMenu = {
    logo: { name: "Scaffold Admin", logoUrl: "" },
    sections: [
      {
        title: "Navigation",
        items: [
          { id: "s1", name: "Dashboard", icon: "dashboard" },
          { id: "s2", name: "Components", icon: "components" },
        ],
      },
    ],
    footer: [{ id: "sf1", name: "Help", icon: "help" }],
    profile: { name: "Anandhu", email: "anandhu@grampro.com", avatarUrl: "" },
  };

  const mockIconMap = {
    dashboard: () => <span>🏠</span>,
    components: () => <span>📦</span>,
    help: () => <span>❓</span>,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-2">Sidebar</h3>
      <div className="border border-slate-800 rounded-xl overflow-hidden h-[400px] flex">
        <Sidebar menuData={mockMenu} iconMap={mockIconMap} />
        <div className="flex-1 p-6 bg-slate-950 text-slate-400 text-sm">
          Sidebar is mounted on the left viewport column in the container.
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Centralized demos mapping
// -------------------------------------------------------------
export const allDemos: Record<string, React.FC> = {
  Button: ButtonDemo,
  Card: CardDemo,
  Checkbox: CheckboxDemo,
  DarkMode: DarkModeDemo,
  Input: InputDemo,
  TextArea: TextAreaDemo,
  MaterialInput: MaterialInputDemo,
  Select: SelectDemo,
  DatePicker: DatePickerDemo,
  DialogAndModal: DialogAndModalDemo,
  Spinner: SpinnerDemo,
  Toast: ToastDemo,
  Tabs: TabsDemo,
  Uploader: UploaderDemo,
  FormRenderer: FormRendererDemo,
  ContextMenu: ContextMenuDemo,
  Navbar: NavbarDemo,
  DataGrid: DataGridDemo,
  Breadcrumb: BreadcrumbDemo,
  Bargraph: BargraphDemo,
  SideBar: SideBarDemo,
  Hooks: HooksDemo,
};
