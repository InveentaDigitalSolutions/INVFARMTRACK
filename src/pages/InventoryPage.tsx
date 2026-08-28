import { useState } from "react";
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

const tabs = [
  { id: "inputs", label: "Inputs" },
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
  const [tab, setTab] = useState("plants");

  const [inputs, setInputs] = useRecords("inputs", initInputs);

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
