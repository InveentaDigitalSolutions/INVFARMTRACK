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
import ShadehouseView3D from "../components/ShadehouseView3D";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { availableRows, bedName, typeForLevel, bedCapacityProblem, fieldNameProblem, fieldCapacityProblem } from "../services/infrastructureRules";

const tabs = [
  { id: "shadehouses", label: "Shadehouses" },
  { id: "layout", label: "Shadehouse Layout" },
  { id: "layout3d", label: "3D View" },
  { id: "fields", label: "Fields" },
  { id: "beds", label: "Beds" },
];

const initShadehouses = [
  { name: "Shadehouse 1", code: "SH-1", location: "El Olvido, Santa Cruz de Yojoa", coordinates: "14.9700, -87.8500", length: 80, width: 80, capacity: 120, active: true },
];
const initFieldes = [
  { code: "E3", shadehouse: "Shadehouse 1", season: "2026-S1", position: "NW — 33 beds × 1.20m", notes: "" },
  { code: "E1", shadehouse: "Shadehouse 1", season: "2026-S1", position: "NE — 33 beds × 1.20m", notes: "" },
  { code: "C3", shadehouse: "Shadehouse 1", season: "2026-S1", position: "SW — 27 beds × 1.80m", notes: "" },
  { code: "C1", shadehouse: "Shadehouse 1", season: "2026-S1", position: "SE — 27 beds × 1.80m", notes: "" },
];
const initBeds = [
  { name: "E3-01", field: "E3", type: "Air", level: "1", capacity: 500, material: "Metal", soilType: "Loamy", drainage: "Excellent", irrigation: "Drip", active: true },
  { name: "E3-02", field: "E3", type: "Air", level: "2", capacity: 500, material: "Metal", soilType: "Loamy", drainage: "Excellent", irrigation: "Drip", active: true },
  { name: "E1-01", field: "E1", type: "Air", level: "1", capacity: 500, material: "Metal", soilType: "Loamy", drainage: "Good", irrigation: "Drip", active: true },
  { name: "C3-01", field: "C3", type: "Ground", level: "0", capacity: 400, material: "Concrete", soilType: "Loamy", drainage: "Good", irrigation: "Sprinkler", active: true },
  { name: "C1-01", field: "C1", type: "Ground", level: "0", capacity: 400, material: "Concrete", soilType: "Sandy", drainage: "Moderate", irrigation: "Manual", active: true },
];

const shOptions = initShadehouses.map((s) => ({ value: s.name, label: s.name }));
const fieldOptions = initFieldes.map((b) => ({ value: b.code, label: `${b.code} (${b.shadehouse})` }));

const shadehouseFormGroups = [
  { title: "Shadehouse Details", columns: 2 as const, fields: [
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "code", label: "Shadehouse ID", type: "text" as const, readOnly: true, placeholder: "SH-0001 (auto)" },
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
    { key: "code", label: "Field ID", type: "text" as const, readOnly: true, placeholder: "FLD-0001 (auto)" },
    { key: "name", label: "Field Name", type: "text" as const, required: true, placeholder: "E3" },
    { key: "shadehouse", label: "Shadehouse", type: "select" as const,
      options: shOptions, optionsFrom: "shadehouses", required: true },
    // What bounds bed numbering: rows run 01 to this, and the field is full at it.
    { key: "rows", label: "Bed Rows", type: "number" as const, min: 0, required: true },
    { key: "position", label: "Position", type: "text" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
    // No season: a field is infrastructure. The planting carries the season.
  ]},
];
/**
 * The bed form is built as a function because two of its controls depend on
 * the others: the rows on offer come from the field chosen, and the levels
 * from whether the bed is on the ground or in the air.
 */
interface FieldRow { id?: string; name?: string; shadehouse?: string; rows?: number }
interface BedRow { id?: string; name?: string; field?: string; type?: string; level?: string }

/**
 * Built as a function because the controls depend on each other: the level
 * decides whether this is a ground or an air bed, and the rows on offer are
 * the ones free in the chosen field at that level.
 */
const bedFormGroups = (fields: FieldRow[], beds: BedRow[]) => [
  { title: "Bed Details", columns: 2 as const, fields: [
    { key: "field", label: "Field", type: "select" as const,
      options: fieldOptions, optionsFrom: "fields", required: true },
    // Level first: a field's rows are its ground beds, and air beds hang on
    // cables above some of them. Type follows from this, not the other way.
    { key: "level", label: "Level", type: "select" as const, required: true, options: [
      { value: "0", label: "0 — ground bed" },
      { value: "1", label: "1 — air bed" },
      { value: "2", label: "2 — air bed" },
      { value: "3", label: "3 — air bed" },
    ] },
    // Free rows at this level. A ground bed in row 7 does not stop an air bed
    // hanging above it, so each level is counted separately.
    { key: "row", label: "Row", type: "select" as const, required: true, options: [],
      optionsWhen: (values: Record<string, unknown>) =>
        availableRows(
          fields.find((f) => f.name === values.field),
          beds,
          Number(values.level ?? 0)
        ).map((row) => ({ value: String(row), label: String(row).padStart(2, "0") })) },
    { key: "name", label: "Bed Name", type: "text" as const, readOnly: true,
      placeholder: "E3-01, or E3-01-2 for an air bed" },
    { key: "soilType", label: "Soil Type", type: "select" as const, options: [
      { value: "Sandy", label: "Sandy" }, { value: "Loamy", label: "Loamy" },
      { value: "Clay", label: "Clay" }, { value: "Peaty", label: "Peaty" },
      { value: "Chalky", label: "Chalky" }, { value: "Silty", label: "Silty" },
    ] },
    { key: "drainage", label: "Drainage", type: "select" as const, options: [
      { value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" },
      { value: "Moderate", label: "Moderate" }, { value: "Poor", label: "Poor" },
    ] },
    { key: "irrigationType", label: "Irrigation", type: "select" as const, options: [
      { value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" },
      { value: "Manual", label: "Manual" }, { value: "None", label: "None" },
    ] },
    { key: "active", label: "Active", type: "boolean" as const },
    // No Type control: it is the level. No Capacity either — a bed holds far
    // fewer Extra Large than Petit, so that lives in Bed Capacities.
  ]},
];

export default function InfrastructurePage() {
  const [tab, setTab] = useState("shadehouses");

  const [shadehouses, setShadehouses] = useRecords("shadehouses", initShadehouses);
  const [fields, setFieldes] = useRecords("fields", initFieldes);
  const [beds, setBeds] = useRecords("beds", initBeds);

  /**
   * Refuses a field name already used in that shadehouse, and a field the
   * shadehouse is not laid out for.
   */
  const saveField = (values: Record<string, unknown>) => {
    const name = String(values.name ?? "");
    const shadehouseName = String(values.shadehouse ?? "");

    const clash = fieldNameProblem(
      name, shadehouseName, fields as FieldRow[],
      fieldForm.isEdit ? (fieldForm.values.id as string | undefined) : undefined
    );
    if (clash) { alert(clash); return; }

    if (!fieldForm.isEdit) {
      const shadehouse = (shadehouses as Array<Record<string, unknown>>).find(
        (h) => h.name === shadehouseName
      );
      const full = fieldCapacityProblem(shadehouse as never, fields as FieldRow[]);
      if (full) { alert(full); return; }
    }

    save(fields, setFieldes, fieldForm, { ...values, name: name.trim() });
  };

  /**
   * Names the bed from its field and row, forces the level the type implies,
   * and refuses one the shadehouse has no room for. Doing it here rather than
   * in the form means a bed created any other way is named the same.
   */
  const saveBed = (values: Record<string, unknown>) => {
    const fieldName = String(values.field ?? "");
    const row = Number(values.row);
    const level = Number(values.level ?? 0);

    const shadehouse = (shadehouses as Array<Record<string, unknown>>).find(
      (h) => h.name === (fields as FieldRow[]).find((f) => f.name === fieldName)?.shadehouse
    );
    if (!bedForm.isEdit) {
      const full = bedCapacityProblem(shadehouse as never, beds.length);
      if (full) { alert(full); return; }
    }

    const name = bedName(fieldName, row, level);
    if (!name) { alert("Choose a field, a level and a row so the bed can be named."); return; }

    save(beds, setBeds, bedForm, {
      ...values,
      name,
      level: String(level),
      // Type is not asked for: a bed on the ground is a ground bed and one on
      // a cable above it is an air bed. Storing it keeps the column usable for
      // filtering without ever letting it disagree with the level.
      type: typeForLevel(level),
    });
  };

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
      case "layout3d":
        return <ShadehouseView3D />;
      case "fields":
        return (
          <>
            <DataTable columns={[
              { key: "code", label: "Code" }, { key: "shadehouse", label: "Shadehouse" },
              { key: "season", label: "Season" }, { key: "position", label: "Position" },
            ]} data={fields} onAdd={fieldForm.openCreate} onEdit={(r, i) => fieldForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Field" searchPlaceholder="Search fields..." />
            <FormModal open={fieldForm.open} onClose={fieldForm.close} title={fieldForm.isEdit ? "Edit Field" : "Add Field"} groups={fieldFormGroups} values={fieldForm.values} onChange={fieldForm.onChange} isEdit={fieldForm.isEdit} onSubmit={(v) => saveField(v)} />
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
            <FormModal open={bedForm.open} onClose={bedForm.close} title={bedForm.isEdit ? "Edit Bed" : "Add Bed"} groups={bedFormGroups(fields as FieldRow[], beds as BedRow[])} values={bedForm.values} onChange={bedForm.onChange} isEdit={bedForm.isEdit} onSubmit={(v) => saveBed(v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bed" message="Delete this bed?" onConfirm={() => del(beds, setBeds)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Infrastructure" subtitle="Shadehouses, fields and beds" icon={Warehouse}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Shadehouses" value={shadehouses.filter((s) => s.active).length} icon={Warehouse} />
        <StatCard label="Active Fields" value={fields.length} icon={Layers} />
        <StatCard label="Active Beds" value={activeBeds} icon={LayoutGrid} />
        <StatCard variant="hero" label="Utilization %" value={`${utilization}%`} icon={BarChart3} />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
