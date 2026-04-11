import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import LoadingScreen from "./components/LoadingScreen";
import DashboardPage from "./pages/DashboardPage";
import ProductionPage from "./pages/ProductionPage";
import InventoryPage from "./pages/InventoryPage";
import InfrastructurePage from "./pages/InfrastructurePage";
import SalesPage from "./pages/SalesPage";
import FinancePage from "./pages/FinancePage";
import AvailabilityPage from "./pages/AvailabilityPage";
import SuppliersPage from "./pages/SuppliersPage";
import LaborPage from "./pages/LaborPage";
import SettingsPage from "./pages/SettingsPage";

export type PageId =
  | "dashboard"
  | "production"
  | "inventory"
  | "infrastructure"
  | "availability"
  | "sales"
  | "finance"
  | "suppliers"
  | "labor"
  | "settings";

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
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const isMobile = useIsMobile();

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "production":
        return <ProductionPage />;
      case "inventory":
        return <InventoryPage />;
      case "infrastructure":
        return <InfrastructurePage />;
      case "availability":
        return <AvailabilityPage />;
      case "sales":
        return <SalesPage />;
      case "finance":
        return <FinancePage />;
      case "suppliers":
        return <SuppliersPage />;
      case "labor":
        return <LaborPage />;
      case "settings":
        return <SettingsPage />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
        <div className={`flex h-screen overflow-hidden ${darkMode ? "dark" : ""}`}>
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

          <main className="flex-1 overflow-hidden bg-navy-900 p-2 pl-0 relative">
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
            } ${isMobile ? "rounded-none" : ""}`}>
              <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
