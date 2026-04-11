import { useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Leaf, Bug, Droplets, Scissors } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "plantings", label: "Plantings" },
  { id: "treatments", label: "Treatments" },
  { id: "irrigation", label: "Irrigation" },
  { id: "harvest", label: "Harvest" },
  { id: "plants", label: "Plant Catalog" },
  { id: "inputs", label: "Inputs" },
];

// Initial data
const initPlantings = [
  { plant: "Pothos / Hawaiian", bed: "Bed 3-A", season: "2026-S1", date: "2026-03-15", qty: 5000, status: "Active" },
  { plant: "Pothos / Marble Queen", bed: "Bed 1-B", season: "2026-S1", date: "2026-03-10", qty: 3000, status: "Active" },
  { plant: "Pothos / Jade", bed: "Bed 5-C", season: "2026-S1", date: "2026-02-28", qty: 2000, status: "Active" },
];
const initTreatments = [
  { date: "2026-04-08", bed: "Bed 3-A", input: "Neem Oil", type: "Insecticide", worker: "Carlos M.", temp: "28", humidity: "75", ph: "6.5" },
  { date: "2026-04-05", bed: "Bed 1-B", input: "Copper Fungicide", type: "Fungicide", worker: "Maria L.", temp: "26", humidity: "80", ph: "6.2" },
];
const initIrrigation = [
  { date: "2026-04-09", bed: "Bed 3-A", liters: 450, method: "Drip" },
  { date: "2026-04-09", bed: "Bed 1-B", liters: 320, method: "Sprinkler" },
  { date: "2026-04-08", bed: "Bed 5-C", liters: 200, method: "Manual" },
];
const initHarvest = [
  { date: "2026-04-07", bed: "Bed 3-A", qty: 4200, quality: "Excellent", worker: "Juan P." },
  { date: "2026-04-05", bed: "Bed 1-B", qty: 2800, quality: "Good", worker: "Carlos M." },
];
const initPlants = [
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Hawaiian", invoiceName: "Pothos / Hawaiian", patent: "Yes", patentNum: "PP32456", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "High Color", invoiceName: "Pothos / High Color", patent: "No", patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "N'Joy", invoiceName: "Pothos / N'Joy", patent: "Yes", patentNum: "PP33012", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Neon", invoiceName: "Pothos / Neon", patent: "No", patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Jade", invoiceName: "Pothos / Jade", patent: "No", patentNum: "", active: true },
  { code: "PTH", name: "Pothos", latin: "Epipremnum aureum", variety: "Marble Queen", invoiceName: "Pothos / Marble Queen", patent: "No", patentNum: "", active: true },
  { code: "SNS", name: "Sansevieria", latin: "Dracaena trifasciata", variety: "Sansevieria", invoiceName: "Sansevieria / Sansevieria", patent: "No", patentNum: "", active: true },
];
const initInputs = [
  { name: "Neem Oil", category: "Pesticide", method: "Foliar Spray", safety: "7", brand: "BioGrow", composition: "Azadirachtin 0.3%" },
  { name: "Copper Fungicide", category: "Fungicide", method: "Soil Drench", safety: "14", brand: "CupraSol", composition: "Copper hydroxide 77%" },
  { name: "NPK 20-20-20", category: "Fertilizer", method: "Drip", safety: "", brand: "NutriMax", composition: "N-P-K balanced" },
];

const plantOptions = initPlants.map((p) => ({ value: p.name, label: p.name }));

const seasonOptions = [
  { value: "2026-S1", label: "2026-S1" },
  { value: "2025-S2", label: "2025-S2" },
];
const inputOptions = initInputs.map((i) => ({ value: i.name, label: i.name }));
const workerOptions = [
  { value: "Carlos M.", label: "Carlos M. (W001)" },
  { value: "Maria L.", label: "Maria L. (W002)" },
  { value: "Juan P.", label: "Juan P. (W003)" },
  { value: "Ana R.", label: "Ana R. (W004)" },
];

// Form definitions
const plantingFields = [
  { title: "Planting Details", columns: 2 as const, fields: [
    { key: "plant", label: "Plant", type: "select" as const, options: plantOptions, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions, required: true },
    { key: "date", label: "Planting Date", type: "date" as const, required: true },
    { key: "qty", label: "Quantity", type: "number" as const, min: 1 },
    { key: "status", label: "Status", type: "toggle" as const, options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] },
  ]},
];

const treatmentFields = [
  { title: "Treatment Details", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "input", label: "Input (Chemical)", type: "select" as const, options: inputOptions, required: true },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Insecticide", label: "Insecticide" }, { value: "Fungicide", label: "Fungicide" },
      { value: "Herbicide", label: "Herbicide" }, { value: "Regulator", label: "Regulator" },
    ], required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions },
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
    { key: "worker", label: "Harvested By", type: "select" as const, options: workerOptions },
  ]},
];

const plantFields = [
  { title: "Plant Information", columns: 2 as const, fields: [
    { key: "code", label: "Plant Code", type: "text" as const, required: true },
    { key: "name", label: "Common Name", type: "text" as const, required: true },
    { key: "latin", label: "Latin Name", type: "text" as const },
    { key: "variety", label: "Variety", type: "text" as const },
  ]},
  { title: "Patent & Status", columns: 2 as const, fields: [
    { key: "patent", label: "Patented", type: "toggle" as const, options: [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }] },
    { key: "patentNum", label: "Patent Number", type: "text" as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const inputFields = [
  { title: "Input Details", columns: 2 as const, fields: [
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "category", label: "Category", type: "select" as const, options: [
      { value: "Fertilizer", label: "Fertilizer" }, { value: "Pesticide", label: "Pesticide" },
      { value: "Fungicide", label: "Fungicide" }, { value: "Herbicide", label: "Herbicide" },
      { value: "Growth Regulator", label: "Growth Regulator" }, { value: "Other", label: "Other" },
    ], required: true },
    { key: "method", label: "Application Method", type: "select" as const, options: [
      { value: "Foliar Spray", label: "Foliar Spray" }, { value: "Soil Drench", label: "Soil Drench" },
      { value: "Granular", label: "Granular" }, { value: "Drip", label: "Drip" },
      { value: "Broadcast", label: "Broadcast" }, { value: "Other", label: "Other" },
    ]},
    { key: "brand", label: "Brand", type: "text" as const },
    { key: "safety", label: "Safety Interval", type: "number" as const, suffix: "days" },
    { key: "composition", label: "Composition", type: "text" as const, span: 2 as const },
  ]},
];

const qualityBadge = (q: string) => {
  const v = q === "Excellent" ? "green" : q === "Good" ? "blue" : q === "Average" ? "amber" : "red";
  return <Badge variant={v}>{q}</Badge>;
};

export default function PlantCarePage() {
  const [tab, setTab] = useState("plantings");

  // Data state
  const [plantings, setPlantings] = useState(initPlantings);
  const [treatments, setTreatments] = useState(initTreatments);
  const [irrigation, setIrrigation] = useState(initIrrigation);
  const [harvest, setHarvest] = useState(initHarvest);
  const [plants, setPlants] = useState(initPlants);
  const [inputs, setInputs] = useState(initInputs);

  // Form hooks for each tab
  const plantingForm = useFormModal(initPlantings[0]);
  const treatmentForm = useFormModal(initTreatments[0]);
  const irrigationForm = useFormModal(initIrrigation[0]);
  const harvestForm = useFormModal(initHarvest[0]);
  const plantForm = useFormModal(initPlants[0]);
  const inputForm = useFormModal(initInputs[0]);
  const confirm = useConfirmDialog();

  // CRUD handlers
  const handleSave = (data: Record<string, unknown>[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const updated = [...data];
      updated[form.editIndex] = values as any;
      setData(updated);
    } else {
      setData([...data, values]);
    }
    form.close();
  };

  const handleDelete = (data: Record<string, unknown>[], setData: (d: any) => void) => {
    if (confirm.pending) {
      const updated = data.filter((_, i) => i !== confirm.pending!.index);
      setData(updated);
    }
  };

  const renderTab = () => {
    switch (tab) {
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
      case "plants":
        return (
          <>
            <DataTable
              columns={[
                { key: "code", label: "Code" },
                { key: "name", label: "Name" },
                { key: "latin", label: "Latin Name" },
                { key: "variety", label: "Variety" },
                { key: "invoiceName", label: "Invoice Name" },
                { key: "patent", label: "Patented", render: (r) => <Badge variant={r.patent === "Yes" ? "amber" : "gray"}>{r.patent as string}</Badge> },
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
      case "inputs":
        return (
          <>
            <DataTable
              columns={[
                { key: "name", label: "Name" },
                { key: "category", label: "Category", render: (r) => <Badge variant="blue">{r.category as string}</Badge> },
                { key: "brand", label: "Brand" },
                { key: "method", label: "Application Method" },
                { key: "safety", label: "Safety (days)" },
              ]}
              data={inputs}
              onAdd={inputForm.openCreate}
              onEdit={(row, i) => inputForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Input"
              searchPlaceholder="Search inputs..."
            />
            <FormModal open={inputForm.open} onClose={inputForm.close} title={inputForm.isEdit ? "Edit Input" : "Add Input"} groups={inputFields} values={inputForm.values} onChange={inputForm.onChange} isEdit={inputForm.isEdit} onSubmit={(v) => handleSave(inputs, setInputs, inputForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Input" message="Are you sure you want to delete this input from the catalog?" onConfirm={() => handleDelete(inputs, setInputs)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Plant Care" subtitle="Manage plantings, treatments, irrigation and harvest" icon={Sprout}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Plantings" value={plantings.filter((p) => p.status === "Active").length} icon={Leaf} color="green" />
        <StatCard label="Treatments (month)" value={treatments.length} icon={Bug} color="amber" />
        <StatCard label="Water Used (L)" value={irrigation.reduce((s, i) => s + i.liters, 0).toLocaleString()} icon={Droplets} color="blue" />
        <StatCard label="Harvested" value={harvest.reduce((s, h) => s + h.qty, 0).toLocaleString()} icon={Scissors} color="green" />
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
