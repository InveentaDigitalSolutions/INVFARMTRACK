import { motion } from "framer-motion";
import { ClipboardCheck, Clock } from "lucide-react";
import PageShell from "../components/PageShell";

export default function InspectionPage() {
  return (
    <PageShell
      title="Inspection"
      subtitle="Evaluate and assess shipment condition"
      icon={ClipboardCheck}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-sand-200"
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 mb-5">
          <Clock className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-sm text-green-500 max-w-sm text-center leading-relaxed">
          The Inspection module is under development. It will allow you to
          evaluate and assess shipment conditions before dispatch.
        </p>
      </motion.div>
    </PageShell>
  );
}
