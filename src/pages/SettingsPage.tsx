import { motion } from "framer-motion";
import { Settings, User, Bell, Monitor, DatabaseBackup } from "lucide-react";
import PageShell from "../components/PageShell";

const sections = [
  { icon: User, title: "User Profile", description: "Manage your account details, role and preferences" },
  { icon: Bell, title: "Notifications", description: "Configure alerts for tasks, shipments and inventory" },
  { icon: Monitor, title: "System Config", description: "App settings, language, timezone and integrations" },
  { icon: DatabaseBackup, title: "Data Export", description: "Export data to CSV, Excel or sync with Dataverse" },
];

export default function SettingsPage() {
  return (
    <PageShell title="Settings" subtitle="App configuration and preferences" icon={Settings}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white rounded-xl border border-sand-200 p-8 text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-lime-100 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-7 h-7 text-green-700" />
          </div>
          <h2 className="text-lg font-semibold text-navy-900 mb-2">Settings coming soon</h2>
          <p className="text-sm text-navy-500">
            Configuration options are being developed. Below is a preview of what will be available.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-xl border border-sand-200 p-5 hover:shadow-md
                         hover:shadow-green-900/5 transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-sand-50 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-navy-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy-900 mb-1">{section.title}</h3>
                  <p className="text-xs text-navy-500 leading-relaxed">{section.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </PageShell>
  );
}
