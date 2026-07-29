import { useState } from "react";
import { allDemos } from "./demos/allDemos";

function App() {
  const [selectedDemo, setSelectedDemo] = useState<string>("Button");

  const DemoComponent = allDemos[selectedDemo] || (() => <div>Demo not found</div>);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar List */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-auto md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              GBS Scaffold
            </h1>
            <p className="text-xs text-slate-400">Headless Components Suite</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar max-h-[50vh] md:max-h-none">
          {Object.keys(allDemos).map((demoName) => {
            const isSelected = selectedDemo === demoName;
            return (
              <button
                key={demoName}
                onClick={() => setSelectedDemo(demoName)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
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
        <header className="mb-8 pb-4 border-b border-slate-800">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">
            Component Testing Suite
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {selectedDemo} Preview
          </h2>
        </header>

        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl min-h-[400px]">
          <DemoComponent />
        </section>
      </main>
    </div>
  );
}

export default App;
