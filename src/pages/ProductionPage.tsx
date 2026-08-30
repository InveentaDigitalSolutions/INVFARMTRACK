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
import { expandBeds, expandPlantLines } from "../services/expandBeds";
import { emptyLine } from "../components/PlantLines";
import type { FertilizationRow, HarvestRow, IrrigationRow, PlantingsRow, PlantsRow, PruningRow, SeasonsRow, TasksRow, TreatmentsRow } from "../services/rowTypes.generated";

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
  // What a box of each variety and size should hold. Beside Plants because it
  // is reference data typed once and read constantly, the same reason Seasons
  // is here rather than under Accounting.
  { id: "sizes", label: "Sizes & Packing" },
  { id: "seasons", label: "Seasons" },
] as const;

// Initial data
const initPlantSizes: Record<string, unknown>[] = [];
const initPlantings: PlantingsRow[] = [];
const initTreatments: TreatmentsRow[] = [];
const initIrrigation: IrrigationRow[] = [];
const initHarvest: HarvestRow[] = [];
const initTasks: TasksRow[] = [];

const initPruning: PruningRow[] = [];
// No invoiceName: it was a stored copy of "{name} / {variety}", which the
// app already composes wherever a plant is shown. A duplicate that can only
// go stale.
const initPlants: PlantsRow[] = [];

const initSeasons: SeasonsRow[] = [];



const initFertilization: FertilizationRow[] = [];

/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */
const plantOptionsFallback: { value: string; label: string }[] = [];
const seasonOptionsFallback: { value: string; label: string }[] = [];
const inputOptionsFallback: { value: string; label: string }[] = [];
const workerOptionsFallback: { value: string; label: string }[] = [];

// Form definitions
const plantingFields = [
  { title: "Planting Details", columns: 2 as const, fields: [
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    // A bed carries several varieties at once, each with its own quantity.
    // Every line becomes its own planting record.
    { key: "lines", label: "Plants and quantities", type: "plantlines" as const,
      options: plantOptionsFallback, optionsFrom: "plants", required: true, span: 2 as const },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptionsFallback, optionsFrom: "seasons", required: true },
    { key: "date", label: "Planting Date", type: "date" as const, required: true },
    // Baskets carry hanging pots in two shapes; the 3D view renders each.
    { key: "potType", label: "Pot Type", type: "toggle" as const, options: [
      { value: "round", label: "Round" }, { value: "square", label: "Square" },
    ] },
    // A bed can carry several plantings at once — 4,000 of one variety and 200
    // of another. This says which are still standing, not which is latest.
    { key: "current", label: "Still on this bed", type: "boolean" as const },
  ]},
];

const treatmentFields = [
  { title: "Treatment Details", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "input", label: "Input (Chemical)", type: "select" as const, options: inputOptionsFallback, optionsFrom: "inputs", required: true },
    { key: "type", label: "Type", type: "toggle" as const, options: [
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
    // Which variety was cut. A bed carrying one fills this in on its own; a
    // bed carrying two cannot, and guessing is how a "by variety" figure lies.
    { key: "plant", label: "Plant", type: "select" as const, options: [], optionsFrom: "plants" },
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
      { value: "Harvesting", label: "Harvesting" }, { value: "Planting", label: "Planting" },
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

const fertilizerInputOptionsFallback: { value: string; label: string }[] = [];

const pruningFields = [
  { title: "Pruning Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    // Which variety was cut. A bed carrying one fills this in on its own; a
    // bed carrying two cannot, and guessing is how a "by variety" figure lies.
    { key: "plant", label: "Plant", type: "select" as const, options: [], optionsFrom: "plants" },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    // No "beds pruned" field: it is however many beds are selected. Typing it
    // separately meant someone could select five and write three.
    { key: "cuttingsEstimated", label: "Cuttings Estimated (per bed)", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
  ]},
];

/**
 * One row per variety and size. Deliberately keyed on the plant record rather
 * than the variety name: "Neon" is both a Pothos and a Philodendron, and a form
 * that matched on the name would quietly merge the two.
 */
const plantSizeFields = [
  { title: "Which product", columns: 2 as const, fields: [
    { key: "code", label: "Size ID", type: "text" as const, readOnly: true, placeholder: "PS-0001 (auto)" },
    { key: "plant", label: "Plant", type: "select" as const, required: true,
      options: [], optionsFrom: "plants" },
    // Five sizes, always the same five: a row of buttons is quicker to hit and
    // shows the whole range at once.
    { key: "size", label: "Size", type: "toggle" as const, required: true, span: 2 as const, options: [
      { value: "Large", label: "LRG" },
      { value: "Regular", label: "REG" },
      { value: "California", label: "CAL" },
      { value: "Small", label: "SML" },
      { value: "Petit", label: "PET" },
    ] },
    { key: "active", label: "Offered", type: "boolean" as const },
  ]},
  { title: "What a box holds", columns: 2 as const, fields: [
    // The number an order line is checked against: 40 boxes of Regular
    // Hawaiian is 80,000 cuttings, and nothing could say so before this.
    { key: "cuttingsPerBox", label: "Cuttings per Box", type: "number" as const, min: 1, required: true },
    // Bounded and small, so it drags. Cuttings per box stays a typed box: it
    // runs to 2,500 and an exact figure matters more than a quick one.
    { key: "bundleSize", label: "Bundle Size", type: "range" as const, min: 1, max: 25, suffix: "per bundle" },
    { key: "productType", label: "Product Type", type: "toggle" as const, options: [
      { value: "URC", label: "URC — unrooted cutting" },
    ] },
    { key: "cuttingType", label: "Cutting Type", type: "toggle" as const, options: [
      { value: "L/E", label: "L/E — leaf and eye" },
    ] },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const, rows: 2 },
  ]},
];

const plantFields = [
  { title: "Plant Information", columns: 2 as const, fields: [
    { key: "code", label: "Plant ID", type: "text" as const, readOnly: true, placeholder: "PLT-0001 (auto)" },
    { key: "name", label: "Common Name", type: "text" as const, required: true },
    { key: "latin", label: "Latin Name", type: "text" as const },
    { key: "variety", label: "Variety", type: "text" as const },
  ]},
  { title: "How it is grown", columns: 2 as const, fields: [
    // What the variety asks for. The bed records what it actually has, and the
    // two are different facts — a basket-only variety offered for a ground bed
    // is a mistake nothing could catch before this existed.
    // Two things you can pick, and both together. Choosing both stores
    // "Ground & Basket", which is itself one of the three choice labels, so
    // nothing has to be mapped on the way in or out.
    { key: "grownIn", label: "Grown In", type: "toggle" as const, multi: true, options: [
      { value: "Ground", label: "Ground" },
      { value: "Basket", label: "Basket" },
    ] },
    /**
     * Shade cloth is sold and spoken about by how much it BLOCKS — 65% cloth —
     * so that is what these say. They read as transmission before, which is the
     * same fact upside down and the wrong way round for anyone in the nursery.
     * The light model still works in transmission underneath: 35%, 12.25%,
     * 4.29%.
     */
    { key: "shadeNeeded", label: "Shade Needed", type: "toggle" as const, options: [
      { value: "Single", label: "Single · 65%" },
      { value: "Double", label: "Double · 87.75%" },
      { value: "Triple", label: "Triple · 95.71%" },
    ] },
    // Capacity depends on which of the two it is: a basket row holds a
    // different number from a ground bed row. A variety grown both ways carries
    // both figures, and each only appears when it applies.
    { key: "plantsPerBed", label: "Plants per Bed Row", type: "number" as const, min: 0,
      showWhen: (v: Record<string, unknown>) => String(v.grownIn ?? "").includes("Ground") },
    { key: "plantsPerBasketRow", label: "Plants per Basket Row", type: "number" as const, min: 0,
      showWhen: (v: Record<string, unknown>) => String(v.grownIn ?? "").includes("Basket") },
  ]},
  /**
   * Production knowledge, and it is genuinely per variety — the figures happen
   * to fall into two groups today, but Santiago is clear that is not a rule
   * about shade, so each variety carries its own.
   *
   * Two seasons because the same cutting takes longer in the dark half of the
   * year: measured daylight here averages 45.3 mol/m2 a day from March to
   * August and 34.7 from September to February.
   */
  { title: "Production — March to August", columns: 2 as const, fields: [
    { key: "growthWeeksMinMarAug", label: "Growth to 8 leaves — from", type: "range" as const, min: 0, max: 30, suffix: "wks", hint: "weeks" },
    { key: "growthWeeksMaxMarAug", label: "…to", type: "range" as const, min: 0, max: 30, suffix: "wks" },
    { key: "harvestWeeksMarAug", label: "Harvest every", type: "range" as const, min: 0, max: 20, suffix: "wks" },
    { key: "pruningWeeksMarAug", label: "Back to 2 leaves after", type: "range" as const, min: 0, max: 20, suffix: "wks" },
  ]},
  { title: "Production — September to February", columns: 2 as const, fields: [
    { key: "growthWeeksMinSepFeb", label: "Growth to 8 leaves — from", type: "range" as const, min: 0, max: 30, suffix: "wks", hint: "weeks" },
    { key: "growthWeeksMaxSepFeb", label: "…to", type: "range" as const, min: 0, max: 30, suffix: "wks" },
    { key: "harvestWeeksSepFeb", label: "Harvest every", type: "range" as const, min: 0, max: 20, suffix: "wks" },
    { key: "pruningWeeksSepFeb", label: "Back to 2 leaves after", type: "range" as const, min: 0, max: 20, suffix: "wks" },
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
            value === v.id ? "segment-active shadow-sm" : "text-navy-400 hover:text-navy-600"
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
  const [plantSizes, setPlantSizes] = useRecords("plantSizes", initPlantSizes);

  /** Names a new season from its start date; an existing one keeps its name. */
  const saveSeason = (values: Record<string, unknown>) => {
    const start = String(values.start ?? "");
    const name = seasonForm.isEdit
      ? String(values.name ?? "")
      : nextSeasonName(start, seasons as Array<{ name?: string }>);
    if (!name) { alert("Give the season a start date so it can be named."); return; }
    handleSave(seasons, setSeasons, seasonForm, { ...values, name });
  };

  // A new planting is on the bed by definition, and starts with one blank line
  // so the control has something to show.
  const plantingForm = useFormModal({ current: true, lines: [emptyLine()] });
  const treatmentForm = useFormModal(initTreatments[0]);
  const irrigationForm = useFormModal(initIrrigation[0]);
  const harvestForm = useFormModal(initHarvest[0]);
  const taskForm = useFormModal(initTasks[0]);
  const pruningForm = useFormModal(initPruning[0]);
  const fertilizationForm = useFormModal(initFertilization[0]);
  const plantForm = useFormModal(initPlants[0]);
  const plantSizeForm = useFormModal(initPlantSizes[0]);
  const seasonForm = useFormModal(initSeasons[0]);
  const confirm = useConfirmDialog();

  const handleSave = (data: Record<string, unknown>[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const updated = [...data];
      updated[form.editIndex] = values as any;
      setData(updated);
    } else {
      // One record per bed, then one per variety planted into it. A bed is a
      // single lookup, so an array saved as one record resolved to nothing and
      // the bed was silently dropped; a planting is one variety, so a bed
      // carrying two is two records.
      setData([...data, ...expandBeds(values).flatMap(expandPlantLines)]);
    }
    form.close();
  };

  /**
   * Opening a planting for edit.
   *
   * The record holds one variety and one quantity; the control speaks in
   * lines. Without this the form would open with the plant control empty and
   * quietly blank the variety on save.
   */
  const openPlantingEdit = (row: Record<string, unknown>, index: number) => {
    plantingForm.openEdit(
      { ...row, lines: [{
        plant: String(row.plant ?? ""),
        qty: row.qty === undefined ? "" : String(row.qty),
        position: String(row.position ?? "Whole bed"),
        purpose: String(row.purpose ?? "Production"),
      }] },
      index
    );
  };

  /**
   * Saving a planting.
   *
   * Editing corrects the record in front of you — its first line. Any further
   * line is another variety going into the same bed on the same day, which is
   * a new planting record, not a change to this one.
   */
  const savePlanting = (values: Record<string, unknown>) => {
    const records = expandBeds(values).flatMap(expandPlantLines);
    if (records.length === 0 || !records[0].plant) {
      alert("Choose at least one plant.");
      return;
    }

    if (plantingForm.isEdit && plantingForm.editIndex !== null) {
      const updated = [...plantings];
      updated[plantingForm.editIndex] = {
        ...updated[plantingForm.editIndex], ...records[0],
      } as never;
      setPlantings([...updated, ...records.slice(1)] as never);
    } else {
      setPlantings([...plantings, ...records] as never);
    }
    plantingForm.close();
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
                { key: "position", label: "Position", render: (r) =>
                  r.position === "Header"
                    ? <Badge variant="blue">Header</Badge>
                    : <span className="text-navy-500">Whole bed</span> },
                // Propagation is worth picking out: it sits on the bed but is
                // never offered to a customer as availability.
                { key: "purpose", label: "Purpose", render: (r) =>
                  r.purpose === "Propagation"
                    ? <Badge variant="amber">Propagation</Badge>
                    : <span className="text-navy-500">Production</span> },
                { key: "current", label: "Status", render: (r) => <Badge variant={r.current === false ? "gray" : "green"}>{r.current === false ? "Cleared" : "Standing"}</Badge> },
              ]}
              data={plantings}
              onAdd={plantingForm.openCreate}
              onEdit={(row, i) => openPlantingEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Planting"
              searchPlaceholder="Search plantings..."
            />
            <FormModal open={plantingForm.open} onClose={plantingForm.close} title={plantingForm.isEdit ? "Edit Planting" : "New Planting"} groups={plantingFields} values={plantingForm.values} onChange={plantingForm.onChange} isEdit={plantingForm.isEdit} onSubmit={savePlanting} />
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
                { key: "grownIn", label: "Grown In" },
                { key: "plantsPerBed", label: "Per Bed Row" },
                { key: "plantsPerBasketRow", label: "Per Basket Row" },
                // The seasonal pair replaced a single "weeks to first cut":
                // the same cutting takes 8-10 weeks in the bright half of the
                // year and 10-12 in the dark, so one number was always wrong
                // for half the year.
                { key: "growthWeeksMinMarAug", label: "Mar–Aug wks" },
                { key: "growthWeeksMinSepFeb", label: "Sep–Feb wks" },
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
      case "sizes":
        return (
          <>
            <div className="mb-3 text-[12px] text-navy-500 bg-sand-50 border border-sand-200 rounded-lg px-3.5 py-2.5">
              What a box <em>should</em> hold, per variety and size. Packing records
              what a box actually held; this is what an order is checked against —
              40 boxes of Regular Hawaiian is 80,000 cuttings.
            </div>
            <DataTable
              columns={[
                { key: "plant", label: "Plant" },
                { key: "size", label: "Size", render: (r) => <Badge variant="blue">{r.size as string}</Badge> },
                { key: "cuttingsPerBox", label: "Per Box", render: (r) => (
                  <span className="font-mono tabular-nums text-navy-700">
                    {Number(r.cuttingsPerBox ?? 0).toLocaleString()}
                  </span>
                ) },
                { key: "bundleSize", label: "Bundle" },
                { key: "productType", label: "Type" },
                { key: "cuttingType", label: "Condition" },
                { key: "active", label: "Offered", render: (r) => (
                  <Badge variant={r.active === false ? "gray" : "green"}>
                    {r.active === false ? "No" : "Yes"}
                  </Badge>
                ) },
              ]}
              data={plantSizes}
              onAdd={plantSizeForm.openCreate}
              onEdit={(row, i) => plantSizeForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Size"
              searchPlaceholder="Search sizes..."
            />
            <FormModal
              open={plantSizeForm.open} onClose={plantSizeForm.close}
              title={plantSizeForm.isEdit ? "Edit Size" : "Add Size"}
              groups={plantSizeFields} values={plantSizeForm.values}
              onChange={plantSizeForm.onChange} isEdit={plantSizeForm.isEdit}
              onSubmit={(v) => handleSave(plantSizes, setPlantSizes, plantSizeForm, v)}
            />
            <ConfirmDialog
              open={confirm.open} onClose={confirm.close} title="Delete Size"
              message="Remove this size from the catalogue?"
              onConfirm={() => handleDelete(plantSizes, setPlantSizes)}
            />
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
        <StatCard variant="hero" label="Active Plantings" value={plantings.filter((p) => p.current !== false).length} icon={Leaf} />
        <StatCard label="Treatments (month)" value={treatments.length} icon={Bug} />
        <StatCard label="Water Used (L)" value={irrigation.reduce((s, i) => s + (i.liters ?? 0), 0).toLocaleString()} icon={Droplets} />
        <StatCard label="Harvested" value={harvest.reduce((s, h) => s + (h.qty ?? 0), 0).toLocaleString()} icon={Scissors} />
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
