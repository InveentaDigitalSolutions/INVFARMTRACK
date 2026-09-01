import { useState, useMemo } from "react";
import { expandBeds } from "../services/expandBeds";
import { motion } from "framer-motion";
import { FlaskConical, Scale, Beaker, Microscope, Leaf } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog, withoutPending, withEdited } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import MetricTile from "../components/MetricTile";
import { nutritionSummary } from "../services/nutritionInsight";
import type { BalanceRow, FoliarRow, SoilRow, WeightRow } from "../services/rowTypes.generated";

const tabs = [
  { id: "weight", label: "Weight Tracking" },
  { id: "balance", label: "Nutrient Balance" },
  { id: "soil", label: "Soil Analysis" },
  { id: "foliar", label: "Foliar Analysis" },
];

// --- Weight Tracking ---
const initWeight: WeightRow[] = [];

// --- Nutrient Balance ---
const initBalance: BalanceRow[] = [];

// --- Soil Analysis ---
const initSoil: SoilRow[] = [];

// --- Foliar Analysis ---
const initFoliar: FoliarRow[] = [];

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
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
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
    { key: "bed", label: "Beds", type: "bedselector" as const, span: 2 as const, multiSelect: true },
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
    { key: "bed", label: "Beds", type: "bedselector" as const, span: 2 as const, multiSelect: true },
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
  const [tab, setTab] = useState(tabs[0].id);

  const [weight, setWeight] = useRecords("weight", initWeight);
  const [balance, setBalance] = useRecords("balance", initBalance);
  const [soil, setSoil] = useRecords("soil", initSoil);
  const [foliar, setFoliar] = useRecords("foliar", initFoliar);

  const weightForm = useFormModal(initWeight[0]);
  const balanceForm = useFormModal(initBalance[0]);
  const soilForm = useFormModal(initSoil[0]);
  const foliarForm = useFormModal(initFoliar[0]);
  const confirm = useConfirmDialog();

  const save = (data: any[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      setData(withEdited(data, form, values));
    } else { setData([...data, values]); }
    form.close();
  };
  /**
   * One record per bed selected. A soil sample or a balance covers a run of
   * beds, and entering them one at a time was the whole complaint.
   */
  const saveAcrossBeds = (
    data: any[], setData: (d: any) => void,
    form: ReturnType<typeof useFormModal>, values: Record<string, unknown>
  ) => {
    const records = expandBeds(values);
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data];
      u[form.editIndex] = { ...u[form.editIndex], ...records[0] };
      setData([...u, ...records.slice(1)]);
    } else {
      setData([...data, ...records]);
    }
    form.close();
  };

  const del = (data: any[], setData: (d: any) => void) => {
    if (confirm.pending) setData(withoutPending(data, confirm.pending));
  };

  /**
   * One reading of the whole module. The page had four totals that divided by
   * `weight.length` with no guard — NaN on an empty table — and a "Latest pH"
   * that took row zero from an unsorted list, so it was the latest only by
   * accident.
   */
  const n = useMemo(
    () => nutritionSummary({ balances: balance, soil, foliar, weights: weight }),
    [balance, soil, foliar, weight]
  );

  const renderTab = () => {
    switch (tab) {
      case "weight":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Boxes weighed" value={weight.length} icon={Scale} />
              <StatCard label="Avg leaf weight" value={n.meanLeafWeight ? `${n.meanLeafWeight} g` : "—"} icon={Leaf} />
              <StatCard label="Total fresh matter" value={`${weight.reduce((s, r) => s + (r.netWeight ?? 0), 0).toFixed(1)} kg`} icon={Scale} />
              <StatCard label="Avg dry matter" value={n.meanDryMatter ? `${n.meanDryMatter}%` : "—"} icon={FlaskConical} />
            </motion.div>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "packingBox", label: "Box ID" },
                { key: "awb", label: "AWB" },
                { key: "avgLeafWeight", label: "Avg Leaf (g)" },
                { key: "netWeight", label: "Net (kg)" },
                { key: "grossWeight", label: "Gross (kg)" },
                { key: "dryMatterPct", label: "DM %", render: (r) => (r.dryMatterPct === undefined || r.dryMatterPct === null ? "—" : `${r.dryMatterPct}%`) },
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {n.elements.map((el) => (
                <MetricTile
                  key={el.element}
                  label={`${el.element} balance`}
                  value={`${el.balance >= 0 ? "+" : ""}${el.balance.toFixed(1)} kg`}
                  icon={FlaskConical}
                  // Negative means the crop is taking out more than goes in.
                  tone={el.balance < 0 ? "bad" : el.balance > 0 ? "good" : "default"}
                  context={{ label: "applied / extracted", value: `${el.applied.toFixed(1)} / ${el.extracted.toFixed(1)}` }}
                />
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
                { key: "dryMatterPct", label: "DM %", render: (r) => (r.dryMatterPct === undefined || r.dryMatterPct === null ? "—" : `${r.dryMatterPct}%`) },
              ]}
              data={balance}
              onAdd={balanceForm.openCreate}
              onEdit={(row, i) => balanceForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Balance Entry"
              searchPlaceholder="Search balance..."
            />
            <FormModal open={balanceForm.open} onClose={balanceForm.close} title={balanceForm.isEdit ? "Edit Nutrient Balance" : "Add Nutrient Balance"} groups={balanceFields} values={balanceForm.values} onChange={balanceForm.onChange} isEdit={balanceForm.isEdit} onSubmit={(v) => saveAcrossBeds(balance, setBalance, balanceForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Entry" message="Delete this nutrient balance entry?" onConfirm={() => del(balance, setBalance)} />
          </>
        );
      case "soil":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Analyses on record" value={soil.length} icon={Microscope} />
              <StatCard label="Mean pH" value={n.meanPh ?? "—"} icon={Beaker}
                tone={n.acidBeds > 0 ? "warning" : "neutral"}
                context={n.acidBeds > 0 ? `${n.acidBeds} beds below 5.5` : undefined} />
              <StatCard label="Mean organic matter" value={n.meanOrganicMatter ? `${n.meanOrganicMatter}%` : "—"} icon={Leaf} />
              <StatCard label="Aluminium risk" value={n.aluminiumBeds} icon={FlaskConical}
                tone={n.aluminiumBeds > 0 ? "critical" : "neutral"}
                context="beds above 30% saturation" />
            </motion.div>
            <DataTable
              columns={[
                { key: "sampleDate", label: "Date" },
                { key: "lab", label: "Lab" },
                { key: "labCode", label: "Sample Code" },
                { key: "texture", label: "Texture" },
                { key: "ph", label: "pH" },
                { key: "organicMatter", label: "M.O. %", render: (r) => (r.organicMatter === undefined || r.organicMatter === null ? "—" : `${r.organicMatter}%`) },
                { key: "nTotal", label: "N %", render: (r) => (r.nTotal === undefined || r.nTotal === null ? "—" : `${r.nTotal}%`) },
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
            <FormModal open={soilForm.open} onClose={soilForm.close} title={soilForm.isEdit ? "Edit Soil Analysis" : "Add Soil Analysis"} subtitle="Zamorano lab report format" groups={soilFields} values={soilForm.values} onChange={soilForm.onChange} isEdit={soilForm.isEdit} onSubmit={(v) => saveAcrossBeds(soil, setSoil, soilForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Analysis" message="Delete this soil analysis record?" onConfirm={() => del(soil, setSoil)} />
          </>
        );
      case "foliar":
        return (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Analyses on record" value={foliar.length} icon={Microscope} />
              <StatCard label="Beds sampled" value={n.bedsAnalysed} icon={Leaf} />
              <StatCard label="Beds with a balance" value={n.bedsWithBalance} icon={FlaskConical} />
              <StatCard label="Since last soil sample" value={n.daysSinceSoil === undefined ? "—" : `${n.daysSinceSoil} d`} icon={Beaker}
                tone={(n.daysSinceSoil ?? 0) > 180 ? "warning" : "neutral"} />
            </motion.div>
            <DataTable
              columns={[
                { key: "sampleDate", label: "Date" },
                { key: "lab", label: "Lab" },
                { key: "crop", label: "Crop" },
                { key: "n", label: "N %", render: (r) => (r.n === undefined || r.n === null ? "—" : `${r.n}%`) },
                { key: "p", label: "P %", render: (r) => (r.p === undefined || r.p === null ? "—" : `${r.p}%`) },
                { key: "k", label: "K %", render: (r) => (r.k === undefined || r.k === null ? "—" : `${r.k}%`) },
                { key: "ca", label: "Ca %", render: (r) => (r.ca === undefined || r.ca === null ? "—" : `${r.ca}%`) },
                { key: "mg", label: "Mg %", render: (r) => (r.mg === undefined || r.mg === null ? "—" : `${r.mg}%`) },
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
            <FormModal open={foliarForm.open} onClose={foliarForm.close} title={foliarForm.isEdit ? "Edit Foliar Analysis" : "Add Foliar Analysis"} groups={foliarFields} values={foliarForm.values} onChange={foliarForm.onChange} isEdit={foliarForm.isEdit} onSubmit={(v) => saveAcrossBeds(foliar, setFoliar, foliarForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Analysis" message="Delete this foliar analysis record?" onConfirm={() => del(foliar, setFoliar)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Nutrition" subtitle="Weight tracking, nutrient balance, soil and foliar analysis" icon={FlaskConical}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricTile
          label="Elements running a deficit"
          value={n.depleted.length ? n.depleted.join(", ") : n.elements.some((e) => e.applied || e.extracted) ? "None" : "—"}
          icon={FlaskConical}
          tone={n.depleted.length ? "bad" : n.elements.some((e) => e.applied) ? "good" : "default"}
          context={{ label: "of four tracked", value: `${n.depleted.length}` }}
        />
        <MetricTile
          label="Mean soil pH"
          value={n.meanPh === undefined ? "—" : String(n.meanPh)}
          icon={Beaker}
          // Below 5.5 the crop stops taking up what is applied, so fertiliser
          // spent on those beds largely does not arrive.
          tone={n.meanPh === undefined ? "default" : n.meanPh < 5.5 ? "bad" : n.meanPh > 7.5 ? "warn" : "good"}
          context={{ label: "beds below 5.5", value: String(n.acidBeds) }}
        />
        <MetricTile
          label="Beds sampled"
          value={String(n.bedsAnalysed)}
          icon={Microscope}
          context={{ label: "with a nutrient balance", value: String(n.bedsWithBalance) }}
        />
        <MetricTile
          label="Since last soil sample"
          value={n.daysSinceSoil === undefined ? "—" : `${n.daysSinceSoil} d`}
          icon={Leaf}
          tone={n.daysSinceSoil === undefined ? "default" : n.daysSinceSoil > 180 ? "warn" : "good"}
          context={{ label: "mean organic matter", value: n.meanOrganicMatter ? `${n.meanOrganicMatter}%` : "—" }}
        />
      </motion.div>

      {n.elements.some((e) => e.applied || e.extracted) && (
        <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm mb-5">
          <h4 className="text-[13px] font-semibold text-navy-900">Applied against extracted</h4>
          <p className="text-[11px] text-navy-400 mb-4">
            Kilograms per element across every bed with a balance recorded
          </p>
          <ElementBalanceChart elements={n.elements} />
        </div>
      )}

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}

/**
 * Two bars per element on a shared scale: what went in, what came out.
 *
 * Drawn rather than charted because the comparison is the whole point — a
 * single "balance" bar hides whether a small surplus came from feeding little
 * and cropping less, or from feeding heavily against a heavy crop.
 */
function ElementBalanceChart({
  elements,
}: {
  elements: { element: string; applied: number; extracted: number; balance: number }[];
}) {
  const max = Math.max(...elements.flatMap((e) => [e.applied, e.extracted]), 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-[11px] text-navy-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bar-fill" /> applied</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bar-accent" /> extracted</span>
      </div>
      {elements.map((e) => (
        <div key={e.element} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-[11px] font-medium text-navy-700">{e.element}</span>
          <div className="flex-1 space-y-1">
            <div className="relative h-3 rounded bg-sand-100 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded bar-fill"
                   style={{ width: `${Math.max((e.applied / max) * 100, e.applied > 0 ? 1 : 0)}%` }}
                   title={`Applied ${e.applied} kg`} />
            </div>
            <div className="relative h-3 rounded bg-sand-100 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded bar-accent"
                   style={{ width: `${Math.max((e.extracted / max) * 100, e.extracted > 0 ? 1 : 0)}%` }}
                   title={`Extracted ${e.extracted} kg`} />
            </div>
          </div>
          <span className={`w-24 shrink-0 text-[11px] text-right tabular-nums font-medium ${
            e.balance < 0 ? "text-red-600" : e.balance > 0 ? "text-lime-700" : "text-navy-400"
          }`}>
            {e.balance >= 0 ? "+" : ""}{e.balance.toFixed(1)} kg
          </span>
        </div>
      ))}
    </div>
  );
}
