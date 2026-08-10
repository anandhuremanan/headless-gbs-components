import { useState, useEffect } from "react";
import { allDemos } from "./demos/allDemos";

function App() {
  // Load initial demo from query string if present
  const [selectedDemo, setSelectedDemo] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get("demo");
    if (demoParam && allDemos[demoParam]) {
      return demoParam;
    }
    return "Button";
  });

  // Update query string on selection change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("demo", selectedDemo);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedDemo]);

  const DemoComponent = allDemos[selectedDemo] || (() => <div>Demo not found</div>);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar List */}
      <aside className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-900 flex flex-col h-auto md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">
              GBS Scaffold
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
              Headless Components
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar max-h-[50vh] md:max-h-none">
          {Object.keys(allDemos).map((demoName) => {
            const isSelected = selectedDemo === demoName;
            return (
              <button
                key={demoName}
                onClick={() => setSelectedDemo(demoName)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs uppercase tracking-wider font-semibold transition cursor-pointer ${
                  isSelected
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {demoName}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="mb-8 pb-4 border-b border-zinc-900">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Component Testing Suite
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">
            {selectedDemo} Preview
          </h2>
        </header>

        <section className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 md:p-8 shadow-sm min-h-[400px]">
          <DemoComponent />
        </section>
      </main>
    </div>
  );
}

export default App;
