import { useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Leaf, Bug, Droplets, Scissors} from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { nextSeasonName } from "../services/infrastructureRules";
import ProductionOverview from "../components/ProductionOverview";
import { useInputNutrients } from "../hooks/useInputNutrients";
import { expandBeds } from "../services/expandBeds";

/**
 * Ordered the way the work happens: see where you stand, plant, tend, harvest,
 * with the work list and the reference data at the end.
 *
 * Eleven tabs became six by grouping what is the same kind of thing. The four
 * care activities share a shape — an operation on a bed, on a date, by a
 * worker — and are what a grower records daily, so they sit together rather
 * than four tabs apart.
 */
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "plantings", label: "Plantings" },
  { id: "care", label: "Crop Care" },
  { id: "harvest", label: "Harvest" },
  { id: "tasks", label: "Tasks" },
  { id: "catalog", label: "Catalog" },
];

/** The activities inside Crop Care, in the order they recur. */
const careViews = [
  { id: "irrigation", label: "Irrigation" },
  { id: "fertilization", label: "Fertilization" },
  { id: "treatments", label: "Treatments" },
  { id: "pruning", label: "Pruning" },
] as const;

const catalogViews = [
  { id: "plants", label: "Plants" },
  { id: "seasons", label: "Seasons" },
] as const;

// Initial data
const initPlantings = [
  { plant: "Pothos / Hawaiian", bed: "E3-01", season: "2026-S1", date: "2026-03-15", qty: 5000, status: "Active" },
  { plant: "Pothos / Marble Queen", bed: "E1-05", season: "2026-S1", date: "2026-03-10", qty: 3000, status: "Active" },
  { plant: "Pothos / Jade", bed: "C3-12", season: "2026-S1", date: "2026-02-28", qty: 2000, status: "Active" },
];
const initTreatments = [
  { date: "2026-04-08", bed: "E3-01", input: "Neem Oil", type: "Insecticide", worker: "Carlos M.", temp: "28", humidity: "75", ph: "6.5" },
  { date: "2026-04-05", bed: "E1-05", input: "Copper Fungicide", type: "Fungicide", worker: "Maria L.", temp: "26", humidity: "80", ph: "6.2" },
];
const initIrrigation = [
  { date: "2026-04-09", bed: "E3-01", liters: 450, method: "Drip" },
  { date: "2026-04-09", bed: "E1-05", liters: 320, method: "Sprinkler" },
  { date: "2026-04-08", bed: "C3-12", liters: 200, method: "Manual" },
];
const initHarvest = [
  { date: "2026-04-07", bed: "E3-01", qty: 4200, quality: "Excellent", worker: "Juan P." },
  { date: "2026-04-05", bed: "E1-05", qty: 2800, quality: "Good", worker: "Carlos M." },
];
const initTasks = [
  { title: "Water Shadehouse 1", type: "Watering", due: "2026-04-10", assigned: "Carlos M.", priority: "High", status: "Pending", notes: "" },
  { title: "Apply Neem Oil E3-01", type: "Pest Control", due: "2026-04-11", assigned: "Maria L.", priority: "Normal", status: "Pending", notes: "" },
  { title: "Harvest Epipremnum Hawaiian", type: "Harvesting", due: "2026-04-10", assigned: "Juan P.", priority: "Urgent", status: "In Progress", notes: "" },
];

const initPruning = [
  { date: "2026-04-08", bed: "E1-03", week: 15, bedsPruned: 3, cuttingsEstimated: 1500, worker: "Carlos M." },
  { date: "2026-04-06", bed: "E3-25", week: 15, bedsPruned: 2, cuttingsEstimated: 1000, worker: "Maria L." },
  { date: "2026-04-03", bed: "E1-24", week: 14, bedsPruned: 4, cuttingsEstimated: 2100, worker: "Juan P." },
  { date: "2026-04-01", bed: "E3-27", week: 14, bedsPruned: 3, cuttingsEstimated: 1400, worker: "Ana R." },
];
// No invoiceName: it was a stored copy of "{name} / {variety}", which the
// app already composes wherever a plant is shown. A duplicate that can only
// go stale.
const initPlants = [
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Hawaiian", patent: true, patentNum: "PP32456", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "High Color", patent: false, patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "N'Joy", patent: true, patentNum: "PP33012", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Neon", patent: false, patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Jade", patent: false, patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Marble Queen", patent: false, patentNum: "", active: true },
  { code: "SNS", name: "Sansevieria", latin: "Dracaena trifasciata", variety: "Sansevieria", patent: false, patentNum: "", active: true },
];

const initSeasons = [
  { name: "2026-S1", start: "2026-01-01", end: "2026-06-30", description: "First season 2026", active: true },
  { name: "2025-S2", start: "2025-07-01", end: "2025-12-31", description: "Second season 2025", active: false },
];



const initFertilization = [
  { date: "2026-04-09", bed: "E3-31", input: "NPK 20-20-20", qtyKg: 5, method: "Soil Drench", nKg: 1.0, pKg: 1.0, kKg: 1.0, caKg: 0, worker: "Carlos M." },
  { date: "2026-04-07", bed: "E3-01", input: "Calcium Nitrate", qtyKg: 3, method: "Foliar Spray", nKg: 0.5, pKg: 0, kKg: 0, caKg: 0.6, worker: "Maria L." },
  { date: "2026-04-04", bed: "C3-20", input: "NPK 20-20-20", qtyKg: 4, method: "Soil Drench", nKg: 0.8, pKg: 0.8, kKg: 0.8, caKg: 0, worker: "Juan P." },
  { date: "2026-04-01", bed: "C3-16", input: "MKP (0-52-34)", qtyKg: 2, method: "Foliar Spray", nKg: 0, pKg: 1.04, kKg: 0.68, caKg: 0, worker: "Ana R." },
];

const plantOptionsFallback = [
  { value: "Pothos / Hawaiian", label: "Pothos / Hawaiian" },
  { value: "Pothos / Marble Queen", label: "Pothos / Marble Queen" },
  { value: "Pothos / Jade", label: "Pothos / Jade" },
  { value: "Pothos / N'Joy", label: "Pothos / N'Joy" },
  { value: "Pothos / Neon", label: "Pothos / Neon" },
];
const seasonOptionsFallback = [
  { value: "2026-S1", label: "2026-S1" },
  { value: "2025-S2", label: "2025-S2" },
];
const inputOptionsFallback = [
  { value: "Neem Oil", label: "Neem Oil" },
  { value: "Copper Fungicide", label: "Copper Fungicide" },
  { value: "NPK 20-20-20", label: "NPK 20-20-20" },
];
const workerOptionsFallback = [
  { value: "Carlos M.", label: "Carlos M. (W001)" },
  { value: "Maria L.", label: "Maria L. (W002)" },
  { value: "Juan P.", label: "Juan P. (W003)" },
  { value: "Ana R.", label: "Ana R. (W004)" },
];

// Form definitions
const plantingFields = [
  { title: "Planting Details", columns: 2 as const, fields: [
    { key: "plant", label: "Plant", type: "select" as const, options: plantOptionsFallback, optionsFrom: "plants", required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptionsFallback, optionsFrom: "seasons", required: true },
    { key: "date", label: "Planting Date", type: "date" as const, required: true },
    { key: "qty", label: "Quantity", type: "number" as const, min: 1 },
    // Air beds carry hanging pots in two shapes; the 3D view renders each.
    { key: "potType", label: "Pot Type", type: "select" as const, options: [
      { value: "round", label: "Round" }, { value: "square", label: "Square" },
    ] },
    { key: "status", label: "Status", type: "toggle" as const, options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] },
  ]},
];

const treatmentFields = [
  { title: "Treatment Details", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "input", label: "Input (Chemical)", type: "select" as const, options: inputOptionsFallback, optionsFrom: "inputs", required: true },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Insecticide", label: "Insecticide" }, { value: "Fungicide", label: "Fungicide" },
      { value: "Herbicide", label: "Herbicide" }, { value: "Regulator", label: "Regulator" },
    ], required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
    { key: "temp", label: "Temperature", type: "number" as const, suffix: "C" },
    { key: "humidity", label: "Humidity", type: "number" as const, suffix: "%" },
    { key: "ph", label: "pH", type: "number" as const },
  ]},
];

const irrigationFields = [
  { title: "Irrigation Event", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "liters", label: "Amount", type: "number" as const, min: 0, suffix: "L", required: true },
    { key: "method", label: "Method", type: "select" as const, options: [
      { value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" },
      { value: "Manual", label: "Manual" }, { value: "Flood", label: "Flood" },
    ]},
  ]},
];

const harvestFields = [
  { title: "Harvest Event", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "qty", label: "Quantity", type: "number" as const, min: 0, required: true },
    { key: "quality", label: "Quality", type: "select" as const, options: [
      { value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" },
      { value: "Average", label: "Average" }, { value: "Poor", label: "Poor" },
    ]},
    { key: "worker", label: "Harvested By", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
  ]},
];

const taskFormGroups = [
  { title: "Task Details", columns: 2 as const, fields: [
    { key: "title", label: "Title", type: "text" as const, required: true, span: 2 as const },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Watering", label: "Watering" }, { value: "Fertilizing", label: "Fertilizing" },
      { value: "Pruning", label: "Pruning" }, { value: "Pest Control", label: "Pest Control" },
      { value: "Harvesting", label: "Harvesting" }, { value: "Seeding", label: "Seeding" },
      { value: "Packing", label: "Packing" }, { value: "General Maintenance", label: "General Maintenance" },
    ], required: true },
    { key: "due", label: "Due Date", type: "date" as const, required: true },
    { key: "assigned", label: "Assigned To", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
    { key: "priority", label: "Priority", type: "select" as const, options: [
      { value: "Low", label: "Low" }, { value: "Normal", label: "Normal" },
      { value: "High", label: "High" }, { value: "Urgent", label: "Urgent" },
    ]},
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Pending", label: "Pending" }, { value: "In Progress", label: "In Progress" },
      { value: "Done", label: "Done" }, { value: "Skipped", label: "Skipped" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const fertilizerInputOptionsFallback = [
  { value: "NPK 20-20-20", label: "NPK 20-20-20" },
  { value: "Calcium Nitrate", label: "Calcium Nitrate" },
  { value: "MKP (0-52-34)", label: "MKP (0-52-34)" },
  { value: "Potassium Sulfate", label: "Potassium Sulfate" },
  { value: "Magnesium Sulfate", label: "Magnesium Sulfate" },
];

const pruningFields = [
  { title: "Pruning Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    // No "beds pruned" field: it is however many beds are selected. Typing it
    // separately meant someone could select five and write three.
    { key: "cuttingsEstimated", label: "Cuttings Estimated (per bed)", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
  ]},
];

const plantFields = [
  { title: "Plant Information", columns: 2 as const, fields: [
    { key: "code", label: "Plant ID", type: "text" as const, readOnly: true, placeholder: "PLT-0001 (auto)" },
    { key: "name", label: "Common Name", type: "text" as const, required: true },
    { key: "latin", label: "Latin Name", type: "text" as const },
    { key: "variety", label: "Variety", type: "text" as const },
  ]},
  { title: "Growing Cycle", columns: 2 as const, fields: [
    // Every bed is the same size, so how many fit is a property of the
    // variety rather than of any particular bed.
    { key: "plantsPerBed", label: "Plants per Bed", type: "number" as const, min: 0 },
    // Without these the schedule can only report the past: a planting date
    // says when work started, not when stock arrives.
    { key: "weeksToFirstHarvest", label: "Weeks to First Cut", type: "number" as const, min: 0 },
    { key: "productiveWeeks", label: "Productive Weeks", type: "number" as const, min: 0 },
  ]},
  { title: "Patent & Status", columns: 2 as const, fields: [
    // bv_IsPatented is a boolean; the form used to offer "Yes"/"No" strings,
    // which is why the column was never bound and the table showed nothing.
    { key: "patent", label: "Patented", type: "boolean" as const },
    { key: "patentNum", label: "Patent Number", type: "text" as const },
    { key: "patentHolder", label: "Patent Holder", type: "text" as const },
    { key: "patentExpiry", label: "Patent Expiry", type: "date" as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const seasonFormGroups = [
  { title: "Season Details", columns: 2 as const, fields: [
    // Named from the start year and the next free number in it, so 2026-S1 is
    // followed by 2026-S2 and a 2027 season begins again at S1.
    { key: "name", label: "Season Name", type: "text" as const, readOnly: true,
      placeholder: "2026-S2 (from the start date)" },
    { key: "start", label: "Start Date", type: "date" as const, required: true },
    { key: "end", label: "End Date", type: "date" as const, required: true },
    { key: "description", label: "Description", type: "textarea" as const, span: 2 as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const fertilizationFields = [
  { title: "Fertilization Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "input", label: "Fertilizer", type: "select" as const, options: fertilizerInputOptionsFallback, optionsFrom: "inputs", required: true },
    { key: "qtyKg", label: "Qty (kg)", type: "number" as const, min: 0, required: true },
    // Labels must match bv_fertilizations.bv_method exactly — Dataverse takes
    // its own option labels and nothing else. npm run dataverse:check verifies.
    { key: "method", label: "Method", type: "select" as const, options: [
      { value: "Foliar Spray", label: "Foliar Spray" },
      { value: "Soil Drench", label: "Soil Drench" },
      { value: "Granular", label: "Granular" },
      { value: "Drip / Fertigation", label: "Drip / Fertigation" },
      { value: "Broadcast", label: "Broadcast" },
    ]},
    { key: "nKg", label: "N (kg)", type: "number" as const, min: 0 },
    { key: "pKg", label: "P (kg)", type: "number" as const, min: 0 },
    { key: "kKg", label: "K (kg)", type: "number" as const, min: 0 },
    { key: "caKg", label: "Ca (kg)", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
  ]},
];

const qualityBadge = (q: string) => {
  const v = q === "Excellent" ? "green" : q === "Good" ? "blue" : q === "Average" ? "amber" : "red";
  return <Badge variant={v}>{q}</Badge>;
};
const priorityBadge = (p: string) => {
  const v = p === "Urgent" ? "red" : p === "High" ? "amber" : p === "Normal" ? "blue" : "gray";
  return <Badge variant={v}>{p}</Badge>;
};
const statusBadge = (s: string) => {
  const v = s === "Done" ? "green" : s === "In Progress" ? "blue" : s === "Pending" ? "amber" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};



/** Switches between the views inside a grouped tab. */
function ViewSwitch<T extends string>({ views, value, onChange, label }: {
  views: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="flex bg-sand-100 rounded-lg p-0.5 w-fit" role="group" aria-label={label}>
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          aria-pressed={value === v.id}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
            value === v.id ? "bg-white text-navy-800 shadow-sm" : "text-navy-400 hover:text-navy-600"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}





export default function ProductionPage() {
  const [tab, setTab] = useState(tabs[0].id);
  const [careView, setCareView] = useState<(typeof careViews)[number]["id"]>("irrigation");
  const [catalogView, setCatalogView] = useState<(typeof catalogViews)[number]["id"]>("plants");

  const [plantings, setPlantings] = useRecords("plantings", initPlantings);
  const [treatments, setTreatments] = useRecords("treatments", initTreatments);
  const [irrigation, setIrrigation] = useRecords("irrigation", initIrrigation);
  const [harvest, setHarvest] = useRecords("harvest", initHarvest);
  const [tasks, setTasks] = useRecords("tasks", initTasks);
  const [pruning, setPruning] = useRecords("pruning", initPruning);
  const [fertilization, setFertilization] = useRecords("fertilization", initFertilization);
  const [seasons, setSeasons] = useRecords("seasons", initSeasons);
  const { elementsFor, hasCompositions } = useInputNutrients();
  const [plants, setPlants] = useRecords("plants", initPlants);

  /** Names a new season from its start date; an existing one keeps its name. */
  const saveSeason = (values: Record<string, unknown>) => {
    const start = String(values.start ?? "");
    const name = seasonForm.isEdit
      ? String(values.name ?? "")
      : nextSeasonName(start, seasons as Array<{ name?: string }>);
    if (!name) { alert("Give the season a start date so it can be named."); return; }
    handleSave(seasons, setSeasons, seasonForm, { ...values, name });
  };

  const plantingForm = useFormModal(initPlantings[0]);
  const treatmentForm = useFormModal(initTreatments[0]);
  const irrigationForm = useFormModal(initIrrigation[0]);
  const harvestForm = useFormModal(initHarvest[0]);
  const taskForm = useFormModal(initTasks[0]);
  const pruningForm = useFormModal(initPruning[0]);
  const fertilizationForm = useFormModal(initFertilization[0]);
  const plantForm = useFormModal(initPlants[0]);
  const seasonForm = useFormModal(initSeasons[0]);
  const confirm = useConfirmDialog();

  const handleSave = (data: Record<string, unknown>[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const updated = [...data];
      updated[form.editIndex] = values as any;
      setData(updated);
    } else {
      // One record per bed. A bed is a single lookup, so an array saved as one
      // record resolved to nothing and the bed was silently dropped.
      setData([...data, ...expandBeds(values)]);
    }
    form.close();
  };

  const handleDelete = (data: Record<string, unknown>[], setData: (d: any) => void) => {
    if (confirm.pending) {
      const updated = data.filter((_, i) => i !== confirm.pending!.index);
      setData(updated);
    }
  };

  const renderTab = (which: string = tab) => {
    switch (which) {
      case "plantings":
        return (
          <>
            <DataTable
              columns={[
                { key: "plant", label: "Plant" },
                { key: "bed", label: "Bed" },
                { key: "season", label: "Season" },
                { key: "date", label: "Planted" },
                { key: "qty", label: "Qty" },
                { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "Active" ? "green" : "gray"}>{r.status as string}</Badge> },
              ]}
              data={plantings}
              onAdd={plantingForm.openCreate}
              onEdit={(row, i) => plantingForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Planting"
              searchPlaceholder="Search plantings..."
            />
            <FormModal open={plantingForm.open} onClose={plantingForm.close} title={plantingForm.isEdit ? "Edit Planting" : "New Planting"} groups={plantingFields} values={plantingForm.values} onChange={plantingForm.onChange} isEdit={plantingForm.isEdit} onSubmit={(v) => handleSave(plantings, setPlantings, plantingForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Planting" message="Are you sure you want to delete this planting record? This cannot be undone." onConfirm={() => handleDelete(plantings, setPlantings)} />
          </>
        );
      case "overview":
        return <ProductionOverview />;
      case "care":
        return (
          <div className="space-y-4">
            <ViewSwitch views={careViews} value={careView} onChange={setCareView} label="Crop care activity" />
            {renderTab(careView)}
          </div>
        );
      case "catalog":
        return (
          <div className="space-y-4">
            <ViewSwitch views={catalogViews} value={catalogView} onChange={setCatalogView} label="Catalog" />
            {renderTab(catalogView)}
          </div>
        );
      case "treatments":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "input", label: "Input Used" },
                { key: "type", label: "Type", render: (r) => <Badge variant="amber">{r.type as string}</Badge> },
                { key: "worker", label: "Worker" },
              ]}
              data={treatments}
              onAdd={treatmentForm.openCreate}
              onEdit={(row, i) => treatmentForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Treatment"
              searchPlaceholder="Search treatments..."
            />
            <FormModal open={treatmentForm.open} onClose={treatmentForm.close} title={treatmentForm.isEdit ? "Edit Treatment" : "Log Treatment"} subtitle="Record a treatment application" groups={treatmentFields} values={treatmentForm.values} onChange={treatmentForm.onChange} isEdit={treatmentForm.isEdit} onSubmit={(v) => handleSave(treatments, setTreatments, treatmentForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Treatment" message="Are you sure you want to delete this treatment record?" onConfirm={() => handleDelete(treatments, setTreatments)} />
          </>
        );
      case "irrigation":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "liters", label: "Liters" },
                { key: "method", label: "Method", render: (r) => <Badge variant="blue">{r.method as string}</Badge> },
              ]}
              data={irrigation}
              onAdd={irrigationForm.openCreate}
              onEdit={(row, i) => irrigationForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Irrigation"
              searchPlaceholder="Search irrigation..."
            />
            <FormModal open={irrigationForm.open} onClose={irrigationForm.close} title={irrigationForm.isEdit ? "Edit Irrigation" : "Log Irrigation"} groups={irrigationFields} values={irrigationForm.values} onChange={irrigationForm.onChange} isEdit={irrigationForm.isEdit} onSubmit={(v) => handleSave(irrigation, setIrrigation, irrigationForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Are you sure you want to delete this irrigation record?" onConfirm={() => handleDelete(irrigation, setIrrigation)} />
          </>
        );
      case "harvest":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "qty", label: "Quantity" },
                { key: "quality", label: "Quality", render: (r) => qualityBadge(r.quality as string) },
                { key: "worker", label: "Harvested By" },
              ]}
              data={harvest}
              onAdd={harvestForm.openCreate}
              onEdit={(row, i) => harvestForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Harvest"
              searchPlaceholder="Search harvests..."
            />
            <FormModal open={harvestForm.open} onClose={harvestForm.close} title={harvestForm.isEdit ? "Edit Harvest" : "Log Harvest"} groups={harvestFields} values={harvestForm.values} onChange={harvestForm.onChange} isEdit={harvestForm.isEdit} onSubmit={(v) => handleSave(harvest, setHarvest, harvestForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Are you sure you want to delete this harvest record?" onConfirm={() => handleDelete(harvest, setHarvest)} />
          </>
        );
      case "tasks":
        return (
          <>
            <DataTable
              columns={[
                { key: "title", label: "Task" },
                { key: "type", label: "Type" },
                { key: "due", label: "Due" },
                { key: "assigned", label: "Assigned" },
                { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority as string) },
                { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
              ]}
              data={tasks}
              onAdd={taskForm.openCreate}
              onEdit={(row, i) => taskForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Task"
              searchPlaceholder="Search tasks..."
            />
            <FormModal open={taskForm.open} onClose={taskForm.close} title={taskForm.isEdit ? "Edit Task" : "Add Task"} groups={taskFormGroups} values={taskForm.values} onChange={taskForm.onChange} isEdit={taskForm.isEdit} onSubmit={(v) => handleSave(tasks, setTasks, taskForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Task" message="Delete this task?" onConfirm={() => handleDelete(tasks, setTasks)} />
          </>
        );
      case "pruning":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "week", label: "Week" },
                { key: "bedsPruned", label: "Beds Pruned" },
                { key: "cuttingsEstimated", label: "Cuttings Est." },
                { key: "worker", label: "Worker" },
              ]}
              data={pruning}
              onAdd={pruningForm.openCreate}
              onEdit={(row, i) => pruningForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Pruning"
              searchPlaceholder="Search pruning..."
            />
            <FormModal open={pruningForm.open} onClose={pruningForm.close} title={pruningForm.isEdit ? "Edit Pruning" : "Log Pruning"} groups={pruningFields} values={pruningForm.values} onChange={pruningForm.onChange} isEdit={pruningForm.isEdit} onSubmit={(v) => handleSave(pruning, setPruning, pruningForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Pruning" message="Delete this pruning record?" onConfirm={() => handleDelete(pruning, setPruning)} />
          </>
        );
      case "fertilization":
        return (
          <>
            {!hasCompositions && (
              <div className="text-[12px] text-navy-500 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 mb-3">
                N, P, K and Ca are worked out from what each fertilizer contains.
                No composition is recorded yet — set it on an input in Inventory
                and these fill in for every application of it.
              </div>
            )}
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "input", label: "Fertilizer" },
                { key: "qtyKg", label: "Qty (kg)" },
                { key: "method", label: "Method", render: (r) => <Badge variant="blue">{r.method as string}</Badge> },
                // Computed from the input's composition and how much went on,
                // not stored: a saved copy would disagree with its own inputs
                // the first time a composition is corrected. A dash means no
                // composition is recorded for that input — which is not zero.
                ...(["N", "P", "K", "Ca"] as const).map((el) => ({
                  key: `el${el}`,
                  label: el,
                  render: (r: Record<string, unknown>) => {
                    const els = elementsFor(String(r.input ?? ""), Number(r.qtyKg ?? 0));
                    const v = els?.[el];
                    return (
                      <span className="font-mono tabular-nums text-navy-600">
                        {v === undefined ? <span className="text-navy-300">—</span> : v.toFixed(2)}
                      </span>
                    );
                  },
                })),
                { key: "worker", label: "Worker" },
              ]}
              data={fertilization}
              onAdd={fertilizationForm.openCreate}
              onEdit={(row, i) => fertilizationForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Fertilization"
              searchPlaceholder="Search fertilization..."
            />
            <FormModal open={fertilizationForm.open} onClose={fertilizationForm.close} title={fertilizationForm.isEdit ? "Edit Fertilization" : "Log Fertilization"} subtitle="Record a fertilization event" groups={fertilizationFields} values={fertilizationForm.values} onChange={fertilizationForm.onChange} isEdit={fertilizationForm.isEdit} onSubmit={(v) => handleSave(fertilization, setFertilization, fertilizationForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Delete this fertilization record?" onConfirm={() => handleDelete(fertilization, setFertilization)} />
          </>
        );
      case "plants":
        return (
          <>
            <DataTable
              columns={[
                { key: "code", label: "Code" },
                { key: "name", label: "Name" },
                { key: "latin", label: "Latin Name" },
                { key: "variety", label: "Variety" },
                { key: "plantsPerBed", label: "Per Bed" },
                { key: "weeksToFirstHarvest", label: "Wks to Cut" },
                { key: "productiveWeeks", label: "Productive" },
                { key: "patent", label: "Patented", render: (r) => (
                  <Badge variant={r.patent ? "amber" : "gray"}>{r.patent ? "Yes" : "No"}</Badge>
                ) },
              ]}
              data={plants}
              onAdd={plantForm.openCreate}
              onEdit={(row, i) => plantForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Plant"
              searchPlaceholder="Search plants..."
            />
            <FormModal open={plantForm.open} onClose={plantForm.close} title={plantForm.isEdit ? "Edit Plant" : "Add Plant"} groups={plantFields} values={plantForm.values} onChange={plantForm.onChange} isEdit={plantForm.isEdit} onSubmit={(v) => handleSave(plants, setPlants, plantForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Plant" message="Are you sure you want to delete this plant from the catalog?" onConfirm={() => handleDelete(plants, setPlants)} />
          </>
        );
      case "seasons":
        return (
          <>
            <DataTable
              columns={[
                { key: "name", label: "Season" },
                { key: "start", label: "Start" },
                { key: "end", label: "End" },
                { key: "description", label: "Description" },
                { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Closed"}</Badge> },
              ]}
              data={seasons}
              onAdd={seasonForm.openCreate}
              onEdit={(row, i) => seasonForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Season"
              searchPlaceholder="Search seasons..."
            />
            <FormModal open={seasonForm.open} onClose={seasonForm.close} title={seasonForm.isEdit ? "Edit Season" : "Add Season"} groups={seasonFormGroups} values={seasonForm.values} onChange={seasonForm.onChange} isEdit={seasonForm.isEdit} onSubmit={(v) => saveSeason(v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Season" message="Delete this season?" onConfirm={() => handleDelete(seasons, setSeasons)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Production" subtitle="Plantings, treatments, irrigation and harvest" icon={Sprout}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard variant="hero" label="Active Plantings" value={plantings.filter((p) => p.status === "Active").length} icon={Leaf} />
        <StatCard label="Treatments (month)" value={treatments.length} icon={Bug} />
        <StatCard label="Water Used (L)" value={irrigation.reduce((s, i) => s + i.liters, 0).toLocaleString()} icon={Droplets} />
        <StatCard label="Harvested" value={harvest.reduce((s, h) => s + h.qty, 0).toLocaleString()} icon={Scissors} />
      </motion.div>

      <div className="mb-4">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
