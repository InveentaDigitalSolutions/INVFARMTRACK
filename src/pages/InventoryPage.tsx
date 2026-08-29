import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PackageSearch, FlaskConical } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { stockLevels, lowStock, direction, type Movement } from "../services/stock";

const tabs = [
  // What is on hand comes first: it is the question the store gets asked.
  { id: "stock", label: "Stock" },
  { id: "materials", label: "Materials" },
  { id: "movements", label: "Movements" },
  { id: "inputs", label: "Inputs" },
];

const materialFields = [
  { title: "Material", columns: 2 as const, fields: [
    { key: "code", label: "Material ID", type: "text" as const, readOnly: true, placeholder: "MAT-0001 (auto)" },
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "category", label: "Category", type: "select" as const, required: true, options: [
      { value: "Irrigation", label: "Irrigation" },
      { value: "Packaging", label: "Packaging" },
      { value: "Structure & Shade", label: "Structure & Shade" },
      { value: "Plumbing", label: "Plumbing" },
      { value: "Tools & Equipment", label: "Tools & Equipment" },
      { value: "Substrate & Pots", label: "Substrate & Pots" },
      { value: "Consumables", label: "Consumables" },
      { value: "Other", label: "Other" },
    ] },
    // How it is counted: drip line by the metre, baskets by the each.
    { key: "unit", label: "Unit", type: "select" as const, required: true, options: [
      { value: "Each", label: "Each" }, { value: "Metre", label: "Metre" },
      { value: "Roll", label: "Roll" }, { value: "Box", label: "Box" },
      { value: "Sack", label: "Sack" }, { value: "Kilogram", label: "Kilogram" },
      { value: "Litre", label: "Litre" }, { value: "Pair", label: "Pair" },
      { value: "Set", label: "Set" },
    ] },
    { key: "partNumber", label: "Part Number", type: "text" as const },
    { key: "supplier", label: "Usual Supplier", type: "select" as const,
      options: [], optionsFrom: "suppliers" },
    { key: "reorderLevel", label: "Reorder Level", type: "number" as const, min: 0 },
    { key: "lastUnitCost", label: "Last Unit Cost", type: "number" as const, min: 0 },
    { key: "active", label: "Active", type: "boolean" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const movementFields = [
  { title: "Stock Movement", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    // Quantity is always positive; the type carries the direction, so a
    // figure can never contradict its own label.
    { key: "type", label: "Type", type: "select" as const, required: true, options: [
      { value: "Received", label: "Received" }, { value: "Issued", label: "Issued" },
      { value: "Returned", label: "Returned" }, { value: "Written off", label: "Written off" },
      { value: "Adjustment up", label: "Adjustment up" },
      { value: "Adjustment down", label: "Adjustment down" },
    ] },
    { key: "material", label: "Material", type: "select" as const, options: [], optionsFrom: "materials" },
    { key: "input", label: "or Input", type: "select" as const, options: [], optionsFrom: "inputs" },
    { key: "quantity", label: "Quantity", type: "number" as const, min: 0, required: true },
    { key: "unitCost", label: "Unit Cost", type: "number" as const, min: 0 },
    { key: "issuedTo", label: "Issued To", type: "text" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const initInputs = [
  { name: "Neem Oil", category: "Pesticide", method: "Foliar Spray", safety: "7", brand: "BioGrow", composition: "Azadirachtin 0.3%" },
  { name: "Copper Fungicide", category: "Fungicide", method: "Soil Drench", safety: "14", brand: "CupraSol", composition: "Copper hydroxide 77%" },
  { name: "NPK 20-20-20", category: "Fertilizer", method: "Drip", safety: "", brand: "NutriMax", composition: "N-P-K balanced" },
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

export default function InventoryPage() {
  // Taken from the tabs themselves rather than named: this said "plants"
  // after the catalogue moved to Production, so nothing matched and the page
  // rendered empty with no tab selected.
  const [tab, setTab] = useState(tabs[0].id);

  const [inputs, setInputs] = useRecords("inputs", initInputs);
  const [materials, setMaterials] = useRecords<Record<string, unknown>>("materials", []);
  const [movements, setMovements] = useRecords<Record<string, unknown>>("stockMovements", []);
  const materialForm = useFormModal({});
  const movementForm = useFormModal({});

  // On hand is the sum of the movements, never a stored number: a total
  // somebody edits drifts, and afterwards nothing can say why.
  const levels = useMemo(() => stockLevels(movements as Movement[]), [movements]);
  const reorder = useMemo(
    () => new Map((materials as { name?: string; reorderLevel?: number }[])
      .map((m) => [String(m.name ?? ""), m.reorderLevel])),
    [materials]
  );
  const low = useMemo(() => lowStock(levels, reorder), [levels, reorder]);

  const inputForm = useFormModal(initInputs[0]);
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

  const renderTab = () => {
    switch (tab) {
      case "stock":
        return (
          <div className="space-y-4">
            {low.length > 0 && (
              <div className="bg-white rounded-xl border border-sand-200/80 border-l-4 border-l-amber-500 p-4 shadow-sm">
                <h4 className="text-[13px] font-semibold text-navy-900 mb-1">
                  {low.length} {low.length === 1 ? "item is" : "items are"} at or below the reorder level
                </h4>
                <p className="text-[12px] text-navy-500">
                  {low.slice(0, 4).map((l) => `${l.item} (${l.onHand} left, short ${l.short})`).join(" · ")}
                  {low.length > 4 && ` and ${low.length - 4} more`}
                </p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">On hand</h4>
              <p className="text-[11px] text-navy-400 mb-4">
                Summed from every movement recorded — materials and inputs together
              </p>
              {levels.length === 0 ? (
                <p className="text-[12px] text-navy-400 py-8 text-center">
                  Nothing recorded yet. Add a material, then record what was received.
                </p>
              ) : (
                <DataTable
                  columns={[
                    { key: "item", label: "Item" },
                    { key: "onHand", label: "On Hand", render: (r) => (
                      <span className={`font-mono tabular-nums ${(r.onHand as number) < 0 ? "text-red-600 font-semibold" : ""}`}>
                        {(r.onHand as number).toLocaleString()}
                      </span>
                    ) },
                    { key: "received", label: "Received" },
                    { key: "issued", label: "Issued" },
                    { key: "value", label: "Value", render: (r) => r.value === undefined
                      ? <span className="text-navy-300">—</span>
                      : <span className="font-mono tabular-nums">{(r.value as number).toLocaleString()}</span> },
                    { key: "lastMoved", label: "Last Moved" },
                  ]}
                  data={levels as unknown as Record<string, unknown>[]}
                  searchPlaceholder="Search stock..."
                />
              )}
            </div>
          </div>
        );

      case "materials":
        return (
          <>
            <DataTable
              columns={[
                { key: "name", label: "Name" },
                { key: "category", label: "Category", render: (r) => <Badge variant="blue">{r.category as string}</Badge> },
                { key: "unit", label: "Unit" },
                { key: "partNumber", label: "Part No." },
                { key: "supplier", label: "Supplier" },
                { key: "reorderLevel", label: "Reorder At" },
              ]}
              data={materials}
              onAdd={materialForm.openCreate}
              onEdit={(row, i) => materialForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Material"
              searchPlaceholder="Search materials..."
            />
            <FormModal open={materialForm.open} onClose={materialForm.close} title={materialForm.isEdit ? "Edit Material" : "Add Material"} groups={materialFields} values={materialForm.values} onChange={materialForm.onChange} isEdit={materialForm.isEdit} onSubmit={(v) => handleSave(materials, setMaterials, materialForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Material" message="Delete this material? Its stock movements stay on record." onConfirm={() => handleDelete(materials, setMaterials)} />
          </>
        );

      case "movements":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "type", label: "Type", render: (r) => (
                  <Badge variant={direction(r.type as string) > 0 ? "green" : "amber"}>{r.type as string}</Badge>
                ) },
                { key: "material", label: "Material", render: (r) => (r.material ?? r.input ?? "—") as string },
                { key: "quantity", label: "Qty" },
                { key: "unitCost", label: "Unit Cost" },
                { key: "issuedTo", label: "Issued To" },
              ]}
              data={movements}
              onAdd={movementForm.openCreate}
              onEdit={(row, i) => movementForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Record Movement"
              searchPlaceholder="Search movements..."
            />
            <FormModal open={movementForm.open} onClose={movementForm.close} title={movementForm.isEdit ? "Edit Movement" : "Record Movement"} groups={movementFields} values={movementForm.values} onChange={movementForm.onChange} isEdit={movementForm.isEdit} onSubmit={(v) => handleSave(movements, setMovements, movementForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Movement" message="Delete this movement? Stock on hand will change accordingly." onConfirm={() => handleDelete(movements, setMovements)} />
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
    <PageShell title="Inventory" subtitle="Inputs and raw materials" icon={PackageSearch}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard variant="hero" label="Inputs" value={inputs.length} icon={FlaskConical} />
        <StatCard
          label="Active"
          value={inputs.filter((i) => (i as { active?: boolean }).active !== false).length}
          icon={PackageSearch}
        />
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
