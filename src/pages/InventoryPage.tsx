import { useState } from "react";
import { motion } from "framer-motion";
import { PackageSearch, Leaf, FlaskConical, DollarSign, CalendarDays } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "plants", label: "Plant Catalog" },
  { id: "inputs", label: "Inputs" },
  { id: "prices", label: "Price List" },
  { id: "seasons", label: "Seasons" },
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
const initPrices = [
  { plant: "Pothos / Hawaiian", season: "2026-S1", customer: "Base", priceExt: "$0.020", priceInt: "L 5.00", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Marble Queen", season: "2026-S1", customer: "Base", priceExt: "$0.020", priceInt: "L 5.00", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Jade", season: "2026-S1", customer: "Base", priceExt: "$0.018", priceInt: "L 4.50", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Hawaiian", season: "2026-S1", customer: "The Plant Company", priceExt: "$0.019", priceInt: "\u2014", from: "2026-04-01", to: "2026-06-30", active: true },
  { plant: "Sansevieria / Sansevieria", season: "2026-S1", customer: "Base", priceExt: "$0.035", priceInt: "L 8.00", from: "2026-01-01", to: "2026-12-31", active: true },
];
const initSeasons = [
  { name: "2026-S1", start: "2026-01-01", end: "2026-06-30", description: "First season 2026", active: true },
  { name: "2025-S2", start: "2025-07-01", end: "2025-12-31", description: "Second season 2025", active: false },
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

const plantNameOptions = initPlants.map((p) => ({ value: p.invoiceName, label: p.invoiceName }));
const seasonOptions = [{ value: "2026-S1", label: "2026-S1" }, { value: "2025-S2", label: "2025-S2" }];
const customerOptions = [
  { value: "Base", label: "Base (default)" },
  { value: "The Plant Company", label: "The Plant Company" },
  { value: "Green Gardens", label: "Green Gardens" },
];

const priceFields = [
  { title: "Price Details", columns: 2 as const, fields: [
    { key: "plant", label: "Plant", type: "select" as const, options: plantNameOptions, required: true },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions, required: true },
    { key: "customer", label: "Customer", type: "select" as const, options: customerOptions },
    { key: "priceExt", label: "Price (USD)", type: "text" as const, required: true },
    { key: "priceInt", label: "Price (HNL)", type: "text" as const },
    { key: "from", label: "Valid From", type: "date" as const, required: true },
    { key: "to", label: "Valid To", type: "date" as const, required: true },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const seasonFormGroups = [
  { title: "Season Details", columns: 2 as const, fields: [
    { key: "name", label: "Season Name", type: "text" as const, required: true },
    { key: "start", label: "Start Date", type: "date" as const, required: true },
    { key: "end", label: "End Date", type: "date" as const, required: true },
    { key: "description", label: "Description", type: "textarea" as const, span: 2 as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

export default function InventoryPage() {
  const [tab, setTab] = useState("plants");

  const [plants, setPlants] = useState(initPlants);
  const [inputs, setInputs] = useState(initInputs);
  const [prices, setPrices] = useState(initPrices);
  const [seasons, setSeasons] = useState(initSeasons);

  const plantForm = useFormModal(initPlants[0]);
  const inputForm = useFormModal(initInputs[0]);
  const priceForm = useFormModal(initPrices[0]);
  const seasonForm = useFormModal(initSeasons[0]);
  const confirm = useConfirmDialog();

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

  const statusBadge = (active: boolean) => (
    <Badge variant={active ? "green" : "gray"}>{active ? "Active" : "Closed"}</Badge>
  );

  const renderTab = () => {
    switch (tab) {
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
      case "prices":
        return (
          <>
            <DataTable
              columns={[
                { key: "plant", label: "Plant" },
                { key: "season", label: "Season" },
                { key: "customer", label: "Customer", render: (r) => <Badge variant={r.customer === "Base" ? "gray" : "blue"}>{r.customer as string}</Badge> },
                { key: "priceExt", label: "EXT (USD)" },
                { key: "priceInt", label: "INT (HNL)" },
                { key: "from", label: "From" },
                { key: "to", label: "To" },
                { key: "active", label: "Active", render: (r) => (
                  <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Expired"}</Badge>
                )},
              ]}
              data={prices}
              onAdd={priceForm.openCreate}
              onEdit={(row, i) => priceForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Set Price"
              searchPlaceholder="Search prices..."
            />
            <FormModal open={priceForm.open} onClose={priceForm.close} title={priceForm.isEdit ? "Edit Price" : "Set Price"} groups={priceFields} values={priceForm.values} onChange={priceForm.onChange} isEdit={priceForm.isEdit} onSubmit={(v) => handleSave(prices, setPrices, priceForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Price" message="Delete this price entry?" onConfirm={() => handleDelete(prices, setPrices)} />
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
                { key: "active", label: "Status", render: (r) => statusBadge(r.active as boolean) },
              ]}
              data={seasons}
              onAdd={seasonForm.openCreate}
              onEdit={(row, i) => seasonForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Season"
              searchPlaceholder="Search seasons..."
            />
            <FormModal open={seasonForm.open} onClose={seasonForm.close} title={seasonForm.isEdit ? "Edit Season" : "Add Season"} groups={seasonFormGroups} values={seasonForm.values} onChange={seasonForm.onChange} isEdit={seasonForm.isEdit} onSubmit={(v) => handleSave(seasons, setSeasons, seasonForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Season" message="Delete this season?" onConfirm={() => handleDelete(seasons, setSeasons)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Inventory" subtitle="Plant catalog, inputs, pricing and seasons" icon={PackageSearch}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Plant Varieties" value={plants.length} icon={Leaf} color="green" />
        <StatCard label="Active Inputs" value={inputs.length} icon={FlaskConical} color="blue" />
        <StatCard label="Active Prices" value={prices.filter((p) => p.active).length} icon={DollarSign} color="amber" />
        <StatCard label="Current Season" value={seasons.filter((s) => s.active).length} icon={CalendarDays} color="green" />
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
