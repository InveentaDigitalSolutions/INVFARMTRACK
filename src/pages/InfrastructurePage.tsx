import { useState } from "react";
import { motion } from "framer-motion";
import { Warehouse, Layers, LayoutGrid, BarChart3 } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import ShadehouseView from "../components/ShadehouseView";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "shadehouses", label: "Shadehouses" },
  { id: "layout", label: "Shadehouse Layout" },
  { id: "fields", label: "Fields" },
  { id: "beds", label: "Beds" },
];

const initShadehouses = [
  { name: "Shadehouse North", code: "SH-N", location: "Zone A", coordinates: "", length: 60, width: 30, capacity: 12, active: true },
  { name: "Shadehouse South", code: "SH-S", location: "Zone B", coordinates: "", length: 50, width: 25, capacity: 8, active: true },
  { name: "Shadehouse East", code: "SH-E", location: "Zone C", coordinates: "", length: 55, width: 28, capacity: 10, active: true },
];
const initFieldes = [
  { code: "B-2026-N1", shadehouse: "Shadehouse North", season: "2026-S1", position: "Row 1-4", notes: "" },
  { code: "B-2026-N2", shadehouse: "Shadehouse North", season: "2026-S1", position: "Row 5-8", notes: "" },
  { code: "B-2026-S1", shadehouse: "Shadehouse South", season: "2026-S1", position: "Row 1-6", notes: "" },
];
const initBeds = [
  { name: "Bed 3-A", field: "B-2026-N1", type: "Air", level: "1", capacity: 500, material: "Metal", soilType: "Loamy", drainage: "Excellent", irrigation: "Drip", active: true },
  { name: "Bed 1-B", field: "B-2026-N2", type: "Ground", level: "0", capacity: 400, material: "Wood", soilType: "Sandy", drainage: "Good", irrigation: "Sprinkler", active: true },
  { name: "Bed 5-C", field: "B-2026-S1", type: "Air", level: "2", capacity: 300, material: "Plastic", soilType: "Loamy", drainage: "Good", irrigation: "Drip", active: true },
];

const shOptions = initShadehouses.map((s) => ({ value: s.name, label: s.name }));
const fieldOptions = initFieldes.map((b) => ({ value: b.code, label: `${b.code} (${b.shadehouse})` }));
const seasonOptions = [{ value: "2026-S1", label: "2026-S1" }, { value: "2025-S2", label: "2025-S2" }];

const shadehouseFormGroups = [
  { title: "Shadehouse Details", columns: 2 as const, fields: [
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "code", label: "Code", type: "text" as const, required: true },
    { key: "location", label: "Location", type: "text" as const },
    { key: "coordinates", label: "GPS Coordinates", type: "text" as const },
    { key: "length", label: "Length", type: "number" as const, suffix: "m" },
    { key: "width", label: "Width", type: "number" as const, suffix: "m" },
    { key: "capacity", label: "Capacity (beds)", type: "number" as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];
const fieldFormGroups = [
  { title: "Field Details", columns: 2 as const, fields: [
    { key: "code", label: "Field Code", type: "text" as const, required: true },
    { key: "shadehouse", label: "Shadehouse", type: "select" as const, options: shOptions, required: true },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions },
    { key: "position", label: "Position", type: "text" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];
const bedFormGroups = [
  { title: "Bed Details", columns: 2 as const, fields: [
    { key: "name", label: "Bed Name", type: "text" as const, required: true },
    { key: "field", label: "Field", type: "select" as const, options: fieldOptions, required: true },
    { key: "type", label: "Type", type: "toggle" as const, options: [{ value: "Air", label: "Air" }, { value: "Ground", label: "Ground" }] },
    { key: "level", label: "Level", type: "select" as const, options: [{ value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] },
    { key: "capacity", label: "Capacity", type: "number" as const },
    { key: "material", label: "Material", type: "select" as const, options: [{ value: "Wood", label: "Wood" }, { value: "Concrete", label: "Concrete" }, { value: "Plastic", label: "Plastic" }, { value: "Metal", label: "Metal" }] },
    { key: "soilType", label: "Soil Type", type: "select" as const, options: [{ value: "Sandy", label: "Sandy" }, { value: "Loamy", label: "Loamy" }, { value: "Clay", label: "Clay" }, { value: "Peaty", label: "Peaty" }] },
    { key: "drainage", label: "Drainage", type: "select" as const, options: [{ value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" }, { value: "Moderate", label: "Moderate" }, { value: "Poor", label: "Poor" }] },
    { key: "irrigation", label: "Irrigation", type: "select" as const, options: [{ value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" }, { value: "Manual", label: "Manual" }, { value: "None", label: "None" }] },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

export default function InfrastructurePage() {
  const [tab, setTab] = useState("shadehouses");

  const [shadehouses, setShadehouses] = useState(initShadehouses);
  const [fields, setFieldes] = useState(initFieldes);
  const [beds, setBeds] = useState(initBeds);

  const shForm = useFormModal(initShadehouses[0]);
  const fieldForm = useFormModal(initFieldes[0]);
  const bedForm = useFormModal(initBeds[0]);
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

  const totalCapacity = shadehouses.filter((s) => s.active).reduce((sum, s) => sum + s.capacity, 0);
  const activeBeds = beds.filter((b) => b.active).length;
  const utilization = totalCapacity > 0 ? Math.round((activeBeds / totalCapacity) * 100) : 0;

  const renderTab = () => {
    switch (tab) {
      case "shadehouses":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "location", label: "Location" },
              { key: "length", label: "L (m)" }, { key: "width", label: "W (m)" }, { key: "capacity", label: "Capacity" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={shadehouses} onAdd={shForm.openCreate} onEdit={(r, i) => shForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Shadehouse" searchPlaceholder="Search shadehouses..." />
            <FormModal open={shForm.open} onClose={shForm.close} title={shForm.isEdit ? "Edit Shadehouse" : "Add Shadehouse"} groups={shadehouseFormGroups} values={shForm.values} onChange={shForm.onChange} isEdit={shForm.isEdit} onSubmit={(v) => save(shadehouses, setShadehouses, shForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Shadehouse" message="Delete this shadehouse and all related data?" onConfirm={() => del(shadehouses, setShadehouses)} />
          </>
        );
      case "layout":
        return <ShadehouseView />;
      case "fields":
        return (
          <>
            <DataTable columns={[
              { key: "code", label: "Code" }, { key: "shadehouse", label: "Shadehouse" },
              { key: "season", label: "Season" }, { key: "position", label: "Position" },
            ]} data={fields} onAdd={fieldForm.openCreate} onEdit={(r, i) => fieldForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Field" searchPlaceholder="Search fields..." />
            <FormModal open={fieldForm.open} onClose={fieldForm.close} title={fieldForm.isEdit ? "Edit Field" : "Add Field"} groups={fieldFormGroups} values={fieldForm.values} onChange={fieldForm.onChange} isEdit={fieldForm.isEdit} onSubmit={(v) => save(fields, setFieldes, fieldForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Field" message="Delete this field?" onConfirm={() => del(fields, setFieldes)} />
          </>
        );
      case "beds":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "field", label: "Field" },
              { key: "type", label: "Type", render: (r) => <Badge variant={r.type === "Air" ? "blue" : "green"}>{r.type as string}</Badge> },
              { key: "level", label: "Level" }, { key: "material", label: "Material" }, { key: "drainage", label: "Drainage" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={beds} onAdd={bedForm.openCreate} onEdit={(r, i) => bedForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Bed" searchPlaceholder="Search beds..." />
            <FormModal open={bedForm.open} onClose={bedForm.close} title={bedForm.isEdit ? "Edit Bed" : "Add Bed"} groups={bedFormGroups} values={bedForm.values} onChange={bedForm.onChange} isEdit={bedForm.isEdit} onSubmit={(v) => save(beds, setBeds, bedForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bed" message="Delete this bed?" onConfirm={() => del(beds, setBeds)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Infrastructure" subtitle="Shadehouses, fields and beds" icon={Warehouse}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Shadehouses" value={shadehouses.filter((s) => s.active).length} icon={Warehouse} color="green" />
        <StatCard label="Active Fieldes" value={fields.length} icon={Layers} color="blue" />
        <StatCard label="Active Beds" value={activeBeds} icon={LayoutGrid} color="amber" />
        <StatCard label="Utilization %" value={`${utilization}%`} icon={BarChart3} color="green" />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
