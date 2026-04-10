import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import LoadingScreen from "./components/LoadingScreen";
import DashboardPage from "./pages/DashboardPage";
import PlantCarePage from "./pages/PlantCarePage";
import PackingPage from "./pages/PackingPage";
import ManagementPage from "./pages/ManagementPage";

export type PageId = "home" | "packing" | "plant-care" | "management";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const isMobile = useIsMobile();

  // Close sidebar on mobile when navigating
  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <DashboardPage />;
      case "packing":
        return <PackingPage />;
      case "plant-care":
        return <PlantCarePage />;
      case "management":
        return <ManagementPage />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
        <div className={`flex h-screen overflow-hidden ${darkMode ? "dark" : ""}`}>
          {/* Mobile sidebar overlay */}
          {isMobile && (
            <>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm z-40"
                  />
                )}
              </AnimatePresence>
              <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <Sidebar
                  currentPage={currentPage}
                  onNavigate={handleNavigate}
                  open={true}
                  onToggle={() => setSidebarOpen(false)}
                  darkMode={darkMode}
                  onToggleDark={() => setDarkMode(!darkMode)}
                />
              </div>
            </>
          )}

          {/* Desktop sidebar */}
          {!isMobile && (
            <Sidebar
              currentPage={currentPage}
              onNavigate={handleNavigate}
              open={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(!darkMode)}
            />
          )}

          <main className="flex-1 overflow-hidden bg-navy-900 p-2 pl-0 md:pl-0 relative">
            {/* Mobile header with menu button */}
            {isMobile && (
              <div className="absolute top-4 left-4 z-30">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2.5 rounded-xl bg-navy-800 text-lime-400 shadow-lg cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className={`h-full overflow-auto rounded-2xl main-content ${
              darkMode ? "bg-navy-900" : "bg-surface"
            } ${isMobile ? "rounded-none p-0" : ""}`}>
              <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
