import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Scale, Beaker, Microscope, Leaf } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "weight", label: "Weight Tracking" },
  { id: "balance", label: "Nutrient Balance" },
  { id: "soil", label: "Soil Analysis" },
  { id: "foliar", label: "Foliar Analysis" },
];

// --- Weight Tracking ---
const initWeight = [
  { date: "2026-04-09", packingBox: "BOX-1520", awb: "176-84329871", avgLeafWeight: 1.05, netWeight: 7.2, grossWeight: 8.1, dryMatterPct: 25, notes: "Hawaiian, export grade" },
  { date: "2026-04-09", packingBox: "BOX-1521", awb: "176-84329871", avgLeafWeight: 0.95, netWeight: 6.8, grossWeight: 7.7, dryMatterPct: 24, notes: "Marble Queen" },
  { date: "2026-04-07", packingBox: "BOX-1518", awb: "176-84329865", avgLeafWeight: 1.12, netWeight: 7.5, grossWeight: 8.4, dryMatterPct: 26, notes: "Hawaiian, large leaves" },
  { date: "2026-04-07", packingBox: "BOX-1519", awb: "176-84329865", avgLeafWeight: 0.88, netWeight: 6.5, grossWeight: 7.4, dryMatterPct: 23, notes: "Jade" },
  { date: "2026-04-05", packingBox: "BOX-1515", awb: "176-84329860", avgLeafWeight: 1.01, netWeight: 7.0, grossWeight: 7.9, dryMatterPct: 25, notes: "N'Joy mix" },
  { date: "2026-04-05", packingBox: "BOX-1516", awb: "176-84329860", avgLeafWeight: 0.92, netWeight: 6.9, grossWeight: 7.8, dryMatterPct: 24, notes: "Neon" },
];

// --- Nutrient Balance ---
const initBalance = [
  { week: 14, bed: "SHN-C1-B5", nApplied: 1.2, pApplied: 0.8, kApplied: 1.0, caApplied: 0.5, nExtracted: 0.9, pExtracted: 0.6, kExtracted: 0.7, caExtracted: 0.3, dryMatterPct: 25 },
  { week: 14, bed: "SHN-C2-B16", nApplied: 1.5, pApplied: 1.0, kApplied: 1.2, caApplied: 0.6, nExtracted: 1.1, pExtracted: 0.7, kExtracted: 0.9, caExtracted: 0.4, dryMatterPct: 26 },
  { week: 13, bed: "SHS-C1-B42", nApplied: 1.0, pApplied: 0.6, kApplied: 0.8, caApplied: 0.4, nExtracted: 1.2, pExtracted: 0.5, kExtracted: 1.0, caExtracted: 0.3, dryMatterPct: 24 },
  { week: 13, bed: "SHN-C1-B5", nApplied: 1.3, pApplied: 0.9, kApplied: 1.1, caApplied: 0.7, nExtracted: 0.8, pExtracted: 0.4, kExtracted: 0.6, caExtracted: 0.2, dryMatterPct: 25 },
  { week: 12, bed: "SHE-C1-B103", nApplied: 0.8, pApplied: 0.5, kApplied: 0.7, caApplied: 0.3, nExtracted: 1.0, pExtracted: 0.6, kExtracted: 0.9, caExtracted: 0.4, dryMatterPct: 23 },
  { week: 12, bed: "SHS-C1-B42", nApplied: 1.1, pApplied: 0.7, kApplied: 0.9, caApplied: 0.5, nExtracted: 0.7, pExtracted: 0.3, kExtracted: 0.5, caExtracted: 0.2, dryMatterPct: 25 },
  { week: 11, bed: "SHN-C3-B22", nApplied: 1.4, pApplied: 1.1, kApplied: 1.3, caApplied: 0.8, nExtracted: 1.0, pExtracted: 0.8, kExtracted: 1.1, caExtracted: 0.5, dryMatterPct: 26 },
  { week: 11, bed: "SHE-C1-B103", nApplied: 0.9, pApplied: 0.6, kApplied: 0.8, caApplied: 0.4, nExtracted: 1.1, pExtracted: 0.7, kExtracted: 1.0, caExtracted: 0.6, dryMatterPct: 24 },
];

// --- Soil Analysis ---
const initSoil = [
  {
    sampleDate: "2023-10-23", reportDate: "2023-11-05", lab: "Zamorano (LSZ)", labCode: "23-S-3674", reportNumber: "2023-329.b", crop: "Epipremnum sp.", bed: "SHN-C1-B5",
    texture: "Franco Arcillo Arenoso", sand: 62, silt: 16, clay: 22,
    ph: 5.03, organicCarbon: 3.35, organicMatter: 5.78, nTotal: 0.29, al: 1, alSaturation: 17, ce: 0.11, cl: 11, cic: 14,
    ca: 797, mg: 105, k: 197, na: 0, cice: 6.43,
    caSat: 61.97, mgSat: 13.50, kSat: 7.85,
    caMg: 5, mgK: 2, caK: 8, caMgK: 10,
    cu: 2.1, fe: 112, mn: 41, zn: 2.4, b: 4.6, s: 14, p: 36,
  },
];

// --- Foliar Analysis ---
const initFoliar = [
  { sampleDate: "2026-03-15", reportDate: "2026-03-28", lab: "Zamorano (LSZ)", labCode: "26-F-0412", crop: "Epipremnum sp.", bed: "SHN-C1-B5", n: 2.85, p: 0.32, k: 3.10, ca: 1.45, mg: 0.38, fe: 125, zn: 32, mn: 85, cu: 6.2, b: 28, s: 0.21 },
  { sampleDate: "2026-01-20", reportDate: "2026-02-05", lab: "Zamorano (LSZ)", labCode: "26-F-0198", crop: "Epipremnum sp.", bed: "SHS-C1-B42", n: 2.62, p: 0.28, k: 2.90, ca: 1.30, mg: 0.35, fe: 110, zn: 28, mn: 78, cu: 5.8, b: 25, s: 0.19 },
];

// --- Form Definitions ---
const weightFields = [
  { title: "Weight Record", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "packingBox", label: "Box ID", type: "text" as const, required: true },
    { key: "awb", label: "AWB", type: "text" as const },
    { key: "avgLeafWeight", label: "Avg Leaf Weight", type: "number" as const, suffix: "g", min: 0 },
    { key: "netWeight", label: "Net Weight", type: "number" as const, suffix: "kg", min: 0 },
    { key: "grossWeight", label: "Gross Weight", type: "number" as const, suffix: "kg", min: 0 },
    { key: "dryMatterPct", label: "Dry Matter", type: "number" as const, suffix: "%", min: 0, max: 100 },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const balanceFields = [
  { title: "Nutrient Balance Entry", columns: 2 as const, fields: [
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "dryMatterPct", label: "Dry Matter %", type: "number" as const, suffix: "%", min: 0, max: 100 },
  ]},
  { title: "Applied (kg)", columns: 4 as const, fields: [
    { key: "nApplied", label: "N Applied", type: "number" as const, min: 0 },
    { key: "pApplied", label: "P Applied", type: "number" as const, min: 0 },
    { key: "kApplied", label: "K Applied", type: "number" as const, min: 0 },
    { key: "caApplied", label: "Ca Applied", type: "number" as const, min: 0 },
  ]},
  { title: "Extracted (kg)", columns: 4 as const, fields: [
    { key: "nExtracted", label: "N Extracted", type: "number" as const, min: 0 },
    { key: "pExtracted", label: "P Extracted", type: "number" as const, min: 0 },
    { key: "kExtracted", label: "K Extracted", type: "number" as const, min: 0 },
    { key: "caExtracted", label: "Ca Extracted", type: "number" as const, min: 0 },
  ]},
];

const soilFields = [
  { title: "Sample Info", columns: 2 as const, fields: [
    { key: "sampleDate", label: "Sample Date", type: "date" as const, required: true },
    { key: "reportDate", label: "Report Date", type: "date" as const },
    { key: "lab", label: "Lab", type: "text" as const },
    { key: "labCode", label: "Lab Code", type: "text" as const },
    { key: "reportNumber", label: "Report Number", type: "text" as const },
    { key: "crop", label: "Crop", type: "text" as const },
    { key: "bed", label: "Bed", type: "bedselector" as const, span: 2 as const, multiSelect: false },
  ]},
  { title: "Physical", columns: 3 as const, fields: [
    { key: "texture", label: "Texture", type: "text" as const },
    { key: "sand", label: "Sand %", type: "number" as const, suffix: "%" },
    { key: "silt", label: "Silt %", type: "number" as const, suffix: "%" },
    { key: "clay", label: "Clay %", type: "number" as const, suffix: "%" },
  ]},
  { title: "Chemical \u2014 Basic", columns: 3 as const, fields: [
    { key: "ph", label: "pH", type: "number" as const },
    { key: "organicCarbon", label: "Organic Carbon %", type: "number" as const, suffix: "%" },
    { key: "organicMatter", label: "Organic Matter %", type: "number" as const, suffix: "%" },
    { key: "nTotal", label: "N Total %", type: "number" as const, suffix: "%" },
    { key: "al", label: "Al (cmol)", type: "number" as const, suffix: "cmol" },
    { key: "alSaturation", label: "Al Saturation %", type: "number" as const, suffix: "%" },
    { key: "ce", label: "CE (dS/m)", type: "number" as const, suffix: "dS/m" },
    { key: "cl", label: "Cl (mg)", type: "number" as const, suffix: "mg" },
    { key: "cic", label: "CIC (cmol)", type: "number" as const, suffix: "cmol" },
  ]},
  { title: "Exchange Complex (mg/kg)", columns: 4 as const, fields: [
    { key: "ca", label: "Ca", type: "number" as const },
    { key: "mg", label: "Mg", type: "number" as const },
    { key: "k", label: "K", type: "number" as const },
    { key: "na", label: "Na", type: "number" as const },
    { key: "cice", label: "CICE", type: "number" as const },
  ]},
  { title: "Base Saturation (%)", columns: 4 as const, fields: [
    { key: "caSat", label: "Ca Sat %", type: "number" as const, suffix: "%" },
    { key: "mgSat", label: "Mg Sat %", type: "number" as const, suffix: "%" },
    { key: "kSat", label: "K Sat %", type: "number" as const, suffix: "%" },
  ]},
  { title: "Ionic Relations", columns: 4 as const, fields: [
    { key: "caMg", label: "Ca/Mg", type: "number" as const },
    { key: "mgK", label: "Mg/K", type: "number" as const },
    { key: "caK", label: "Ca/K", type: "number" as const },
    { key: "caMgK", label: "Ca+Mg/K", type: "number" as const },
  ]},
  { title: "Minor Elements (mg/kg)", columns: 4 as const, fields: [
    { key: "cu", label: "Cu", type: "number" as const },
    { key: "fe", label: "Fe", type: "number" as const },
    { key: "mn", label: "Mn", type: "number" as const },
    { key: "zn", label: "Zn", type: "number" as const },
    { key: "b", label: "B", type: "number" as const },
    { key: "s", label: "S", type: "number" as const },
    { key: "p", label: "P", type: "number" as const },
  ]},
];

const foliarFields = [
  { title: "Sample Info", columns: 2 as const, fields: [
    { key: "sampleDate", label: "Sample Date", type: "date" as const, required: true },
    { key: "reportDate", label: "Report Date", type: "date" as const },
    { key: "lab", label: "Lab", type: "text" as const },
    { key: "labCode", label: "Lab Code", type: "text" as const },
    { key: "crop", label: "Crop", type: "text" as const },
    { key: "bed", label: "Bed", type: "bedselector" as const, span: 2 as const, multiSelect: false },
  ]},
  { title: "Macronutrients (%)", columns: 3 as const, fields: [
    { key: "n", label: "N %", type: "number" as const },
    { key: "p", label: "P %", type: "number" as const },
    { key: "k", label: "K %", type: "number" as const },
    { key: "ca", label: "Ca %", type: "number" as const },
    { key: "mg", label: "Mg %", type: "number" as const },
  ]},
  { title: "Micronutrients (ppm)", columns: 3 as const, fields: [
    { key: "fe", label: "Fe", type: "number" as const },
    { key: "zn", label: "Zn", type: "number" as const },
    { key: "mn", label: "Mn", type: "number" as const },
    { key: "cu", label: "Cu", type: "number" as const },
    { key: "b", label: "B", type: "number" as const },
    { key: "s", label: "S", type: "number" as const },
  ]},
];

export default function NutritionPage() {
  const [tab, setTab] = useState("weight");

  const [weight, setWeight] = useState(initWeight);
  const [balance, setBalance] = useState(initBalance);
  const [soil, setSoil] = useState(initSoil);
  const [foliar, setFoliar] = useState(initFoliar);

  const weightForm = useFormModal(initWeight[0]);
  const balanceForm = useFormModal(initBalance[0]);
  const soilForm = useFormModal(initSoil[0]);
  const foliarForm = useFormModal(initFoliar[0]);
  const confirm = useConfirmDialog();

  const save = (data: any[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data]; u[form.editIndex] = values; setData(u);
    } else { setData([...data, values]); }
    form.close();
  };
  const del = (data: any[], setData: (d: any) => void) => {
    if (confirm.pending) setData(data.filter((_, i) => i !== confirm.pending!.index));
  };

  // Nutrient balance totals
  const totalN = balance.reduce((s, r) => s + r.nApplied - r.nExtracted, 0);
  const totalP = balance.reduce((s, r) => s + r.pApplied - r.pExtracted, 0);
  const totalK = balance.reduce((s, r) => s + r.kApplied - r.kExtracted, 0);
  const totalCa = balance.reduce((s, r) => s + r.caApplied - r.caExtracted, 0);

  const renderTab = () => {
    switch (tab) {
      case "weight":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Boxes Weighed" value={weight.length} icon={Scale} color="blue" />
              <StatCard label="Avg Leaf Weight" value={`${(weight.reduce((s, r) => s + r.avgLeafWeight, 0) / weight.length).toFixed(2)} g`} icon={Leaf} color="green" />
              <StatCard label="Total Fresh Matter" value={`${weight.reduce((s, r) => s + r.netWeight, 0).toFixed(1)} kg`} icon={Scale} color="amber" />
              <StatCard label="Avg Dry Matter %" value={`${(weight.reduce((s, r) => s + r.dryMatterPct, 0) / weight.length).toFixed(1)}%`} icon={FlaskConical} color="green" />
            </motion.div>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "packingBox", label: "Box ID" },
                { key: "awb", label: "AWB" },
                { key: "avgLeafWeight", label: "Avg Leaf (g)" },
                { key: "netWeight", label: "Net (kg)" },
                { key: "grossWeight", label: "Gross (kg)" },
                { key: "dryMatterPct", label: "DM %", render: (r) => `${r.dryMatterPct}%` },
                { key: "notes", label: "Notes" },
              ]}
              data={weight}
              onAdd={weightForm.openCreate}
              onEdit={(row, i) => weightForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Weight"
              searchPlaceholder="Search weight records..."
            />
            <FormModal open={weightForm.open} onClose={weightForm.close} title={weightForm.isEdit ? "Edit Weight Record" : "Log Weight"} groups={weightFields} values={weightForm.values} onChange={weightForm.onChange} isEdit={weightForm.isEdit} onSubmit={(v) => save(weight, setWeight, weightForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Delete this weight record?" onConfirm={() => del(weight, setWeight)} />
          </>
        );
      case "balance":
        return (
          <>
            {/* Nutrient Balance Summary Cards */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "N Balance", applied: balance.reduce((s, r) => s + r.nApplied, 0), extracted: balance.reduce((s, r) => s + r.nExtracted, 0), bal: totalN },
                { label: "P Balance", applied: balance.reduce((s, r) => s + r.pApplied, 0), extracted: balance.reduce((s, r) => s + r.pExtracted, 0), bal: totalP },
                { label: "K Balance", applied: balance.reduce((s, r) => s + r.kApplied, 0), extracted: balance.reduce((s, r) => s + r.kExtracted, 0), bal: totalK },
                { label: "Ca Balance", applied: balance.reduce((s, r) => s + r.caApplied, 0), extracted: balance.reduce((s, r) => s + r.caExtracted, 0), bal: totalCa },
              ].map((n) => (
                <div key={n.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50 mb-1">{n.label}</div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-2xl font-bold ${n.bal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {n.bal >= 0 ? "+" : ""}{n.bal.toFixed(1)} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Applied: {n.applied.toFixed(1)} kg</span>
                    <span>Extracted: {n.extracted.toFixed(1)} kg</span>
                  </div>
                </div>
              ))}
            </motion.div>
            <DataTable
              columns={[
                { key: "week", label: "Week" },
                { key: "bed", label: "Bed" },
                { key: "nApplied", label: "N App" },
                { key: "pApplied", label: "P App" },
                { key: "kApplied", label: "K App" },
                { key: "caApplied", label: "Ca App" },
                { key: "nExtracted", label: "N Ext" },
                { key: "pExtracted", label: "P Ext" },
                { key: "kExtracted", label: "K Ext" },
                { key: "caExtracted", label: "Ca Ext" },
                { key: "dryMatterPct", label: "DM %", render: (r) => `${r.dryMatterPct}%` },
              ]}
              data={balance}
              onAdd={balanceForm.openCreate}
              onEdit={(row, i) => balanceForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Balance Entry"
              searchPlaceholder="Search balance..."
            />
            <FormModal open={balanceForm.open} onClose={balanceForm.close} title={balanceForm.isEdit ? "Edit Nutrient Balance" : "Add Nutrient Balance"} groups={balanceFields} values={balanceForm.values} onChange={balanceForm.onChange} isEdit={balanceForm.isEdit} onSubmit={(v) => save(balance, setBalance, balanceForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Entry" message="Delete this nutrient balance entry?" onConfirm={() => del(balance, setBalance)} />
          </>
        );
      case "soil":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Analyses Count" value={soil.length} icon={Microscope} color="blue" />
              <StatCard label="Latest pH" value={soil.length > 0 ? soil[0].ph : "—"} icon={Beaker} color="amber" />
              <StatCard label="Latest Organic Matter %" value={soil.length > 0 ? `${soil[0].organicMatter}%` : "—"} icon={Leaf} color="green" />
              <StatCard label="Latest CIC" value={soil.length > 0 ? soil[0].cic : "—"} icon={FlaskConical} color="blue" />
            </motion.div>
            <DataTable
              columns={[
                { key: "sampleDate", label: "Date" },
                { key: "lab", label: "Lab" },
                { key: "labCode", label: "Sample Code" },
                { key: "texture", label: "Texture" },
                { key: "ph", label: "pH" },
                { key: "organicMatter", label: "M.O. %", render: (r) => `${r.organicMatter}%` },
                { key: "nTotal", label: "N %", render: (r) => `${r.nTotal}%` },
                { key: "ca", label: "Ca" },
                { key: "mg", label: "Mg" },
                { key: "k", label: "K" },
                { key: "p", label: "P (mg/kg)" },
                { key: "cic", label: "CIC" },
              ]}
              data={soil}
              onAdd={soilForm.openCreate}
              onEdit={(row, i) => soilForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Soil Analysis"
              searchPlaceholder="Search soil analyses..."
            />
            <FormModal open={soilForm.open} onClose={soilForm.close} title={soilForm.isEdit ? "Edit Soil Analysis" : "Add Soil Analysis"} subtitle="Zamorano lab report format" groups={soilFields} values={soilForm.values} onChange={soilForm.onChange} isEdit={soilForm.isEdit} onSubmit={(v) => save(soil, setSoil, soilForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Analysis" message="Delete this soil analysis record?" onConfirm={() => del(soil, setSoil)} />
          </>
        );
      case "foliar":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Analyses Count" value={foliar.length} icon={Microscope} color="blue" />
              <StatCard label="Latest N %" value={foliar.length > 0 ? `${foliar[0].n}%` : "—"} icon={Leaf} color="green" />
              <StatCard label="Latest K %" value={foliar.length > 0 ? `${foliar[0].k}%` : "—"} icon={FlaskConical} color="amber" />
              <StatCard label="Latest Lab" value={foliar.length > 0 ? foliar[0].lab : "—"} icon={Beaker} color="blue" />
            </motion.div>
            <DataTable
              columns={[
                { key: "sampleDate", label: "Date" },
                { key: "lab", label: "Lab" },
                { key: "crop", label: "Crop" },
                { key: "n", label: "N %", render: (r) => `${r.n}%` },
                { key: "p", label: "P %", render: (r) => `${r.p}%` },
                { key: "k", label: "K %", render: (r) => `${r.k}%` },
                { key: "ca", label: "Ca %", render: (r) => `${r.ca}%` },
                { key: "mg", label: "Mg %", render: (r) => `${r.mg}%` },
                { key: "fe", label: "Fe ppm" },
                { key: "zn", label: "Zn ppm" },
              ]}
              data={foliar}
              onAdd={foliarForm.openCreate}
              onEdit={(row, i) => foliarForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Foliar Analysis"
              searchPlaceholder="Search foliar analyses..."
            />
            <FormModal open={foliarForm.open} onClose={foliarForm.close} title={foliarForm.isEdit ? "Edit Foliar Analysis" : "Add Foliar Analysis"} groups={foliarFields} values={foliarForm.values} onChange={foliarForm.onChange} isEdit={foliarForm.isEdit} onSubmit={(v) => save(foliar, setFoliar, foliarForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Analysis" message="Delete this foliar analysis record?" onConfirm={() => del(foliar, setFoliar)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Nutrition" subtitle="Weight tracking, nutrient balance, soil and foliar analysis" icon={FlaskConical}>
      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
