import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Warehouse, Layers, LayoutGrid, BarChart3 } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import MetricTile from "../components/MetricTile";
import RankedBars from "../components/RankedBars";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import ShadehouseView from "../components/ShadehouseView";
import ShadehouseView3D from "../components/ShadehouseView3D";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { infrastructureSummary } from "../services/infrastructureInsight";
import { availableRows, bedName, parseBedName, typeForLevel, planBulkBeds, bedCapacityProblem, fieldNameProblem, fieldCapacityProblem } from "../services/infrastructureRules";
import type { BedsRow, FieldsRow, PlantingsRow, ShadehousesRow } from "../services/rowTypes.generated";

const tabs = [
  { id: "shadehouses", label: "Shadehouses" },
  { id: "fields", label: "Fields" },
  { id: "beds", label: "Beds" },
];

const initShadehouses: ShadehousesRow[] = [];
const initFieldes: FieldsRow[] = [];
const initBeds: BedsRow[] = [];

// No fallback lists. Both come from the live tables through `optionsFrom`;
// the value must be the NAME, since that is what a bed's lookup resolves
// against and what the bed name is built from.
const shOptions: { value: string; label: string }[] = [];
const fieldOptions: { value: string; label: string }[] = [];

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
/**
 * Adding beds a run at a time.
 *
 * Air beds come in runs — a cable spans rows 1 to 20 of a field — so entering
 * them one by one is a hundred identical form submissions. Soil and irrigation
 * are set for the whole batch because in practice a run shares them.
 */
const bulkBedFormGroups = [
  { title: "Add a run of beds", columns: 2 as const, fields: [
    { key: "field", label: "Field", type: "select" as const,
      options: fieldOptions, optionsFrom: "fields", required: true },
    { key: "level", label: "Level", type: "select" as const, required: true, options: [
      { value: "0", label: "0 — ground beds" },
      { value: "1", label: "1 — air beds" },
      { value: "2", label: "2 — air beds" },
      { value: "3", label: "3 — air beds" },
    ] },
    { key: "fromRow", label: "First Row", type: "number" as const, min: 1, required: true },
    { key: "toRow", label: "Last Row", type: "number" as const, min: 1, required: true },
    { key: "soilType", label: "Soil Type", type: "select" as const, options: [
      { value: "Sandy", label: "Sandy" }, { value: "Loamy", label: "Loamy" },
      { value: "Clay", label: "Clay" }, { value: "Peaty", label: "Peaty" },
      { value: "Chalky", label: "Chalky" }, { value: "Silty", label: "Silty" },
    ] },
    { key: "irrigationType", label: "Irrigation", type: "select" as const, options: [
      { value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" },
      { value: "Manual", label: "Manual" }, { value: "None", label: "None" },
    ] },
    { key: "drainage", label: "Drainage", type: "select" as const, options: [
      { value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" },
      { value: "Moderate", label: "Moderate" }, { value: "Poor", label: "Poor" },
    ] },
  ]},
];

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
      optionsWhen: (values: Record<string, unknown>) => {
        const free = availableRows(
          fields.find((f) => f.name === values.field),
          beds,
          Number(values.level ?? 0)
        );
        // A bed being edited occupies its own row, so that row is not free —
        // without adding it back the control would have no option matching
        // the bed's actual value.
        const own = Number(values.row);
        if (Number.isFinite(own) && own > 0 && !free.includes(own)) free.push(own);
        return free
          .sort((a, b) => a - b)
          .map((row) => ({ value: String(row), label: String(row).padStart(2, "0") }));
      } },
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
  const [tab, setTab] = useState(tabs[0].id);

  const [shadehouses, setShadehouses] = useRecords("shadehouses", initShadehouses);
  const [fields, setFieldes] = useRecords("fields", initFieldes);
  const [beds, setBeds] = useRecords("beds", initBeds);
  // Read-only here: which beds carry a crop is the other half of "how much of
  // the nursery is in use", and it lives on the planting, not the bed.
  const [plantings] = useRecords<PlantingsRow>("plantings", []);
  const [shView, setShView] = useState<"plan" | "3d">("plan");

  const bulkBedForm = useFormModal({
    field: "", level: "1", fromRow: 1, toRow: 1,
    soilType: "", irrigationType: "", drainage: "",
  });

  /**
   * Creates a run of beds in one go, after saying exactly what it will do.
   * Rows that already hold a bed at that level are skipped rather than
   * refused — asking for rows 1 to 20 when 2 and 7 exist should fill the
   * gaps, not fail.
   */
  const saveBulkBeds = (values: Record<string, unknown>) => {
    const field = (fields as FieldRow[]).find((f) => f.name === values.field);
    const level = Number(values.level ?? 0);
    const shadehouse = (shadehouses as Array<Record<string, unknown>>).find(
      (h) => h.name === field?.shadehouse
    );

    const plan = planBulkBeds({
      field,
      level,
      fromRow: Number(values.fromRow),
      toRow: Number(values.toRow),
      existing: beds as BedRow[],
      shadehouse: shadehouse as never,
    });

    if (plan.problem) { alert(plan.problem); return; }
    if (plan.create.length === 0) {
      alert(`Every row in that range already has a bed at level ${level}.`);
      return;
    }

    const notes: string[] = [];
    if (plan.alreadyThere.length) notes.push(`${plan.alreadyThere.length} already existed and were skipped`);
    if (plan.outOfRange.length) notes.push(`${plan.outOfRange.length} were past the end of ${field?.name}`);
    const summary =
      `Create ${plan.create.length} bed${plan.create.length === 1 ? "" : "s"}, ` +
      `${plan.create[0]} to ${plan.create[plan.create.length - 1]}?` +
      (notes.length ? `\n\n${notes.join(". ")}.` : "");
    if (!window.confirm(summary)) return;

    const created = plan.create.map((name) => ({
      id: "",
      name,
      field: values.field,
      level: String(level),
      type: typeForLevel(level),
      soilType: values.soilType || undefined,
      irrigationType: values.irrigationType || undefined,
      drainage: values.drainage || undefined,
      active: true,
    }));
    setBeds([...(beds as unknown[]), ...created] as typeof beds);
    bulkBedForm.close();
  };

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
  /**
   * Opens a bed for editing with its row and level filled in.
   *
   * Neither is stored: the name carries them, and the form derives the name
   * from them. Opening an existing bed therefore showed both controls empty,
   * and saving rebuilt the name from nothing — "Choose a field, a level and a
   * row" on a bed that plainly had all three.
   */
  const openBedEdit = (row: Record<string, unknown>, index: number) => {
    const parsed = parseBedName(String(row.name ?? ""));
    bedForm.openEdit(
      {
        ...row,
        field: row.field ?? parsed?.field ?? "",
        row: parsed ? String(parsed.row) : "",
        level: parsed ? String(parsed.level) : String(row.level ?? ""),
      } as never,
      index
    );
  };

  const saveBed = (values: Record<string, unknown>) => {
    const fieldName = String(values.field ?? "");
    const row = Number(values.row);
    const level = Number(values.level ?? 0);

    const name = bedName(fieldName, row, level);
    if (!name) { alert("Choose a field, a level and a row so the bed can be named."); return; }

    const shadehouse = (shadehouses as Array<Record<string, unknown>>).find(
      (h) => h.name === (fields as FieldRow[]).find((f) => f.name === fieldName)?.shadehouse
    );
    if (!bedForm.isEdit) {
      // Positions, not records: an air bed above an existing row needs no new
      // ground, so it must not be refused because the floor is full.
      const full = bedCapacityProblem(shadehouse as never, beds as BedRow[], [name]);
      if (full) { alert(full); return; }
    }

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

  /**
   * Utilisation counted bed records against capacity, but a shadehouse's
   * capacity is measured in positions — field plus row — and three air beds
   * hanging above one ground bed are one position, not four. Counting records
   * put the house over 100% the moment air beds went in.
   */
  const infra = useMemo(
    () => infrastructureSummary({
      shadehouses: shadehouses as never, fields: fields as never,
      beds: beds as never, plantings: plantings as never,
    }),
    [shadehouses, fields, beds, plantings]
  );

  const renderTab = () => {
    switch (tab) {
      case "shadehouses":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "location", label: "Location" },
              { key: "length", label: "L (m)" }, { key: "width", label: "W (m)" },
              { key: "capacity", label: "Bed Positions" }, { key: "fieldCapacity", label: "Fields" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={shadehouses} onAdd={shForm.openCreate} onEdit={(r, i) => shForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Shadehouse" searchPlaceholder="Search shadehouses..." />
            <FormModal open={shForm.open} onClose={shForm.close} title={shForm.isEdit ? "Edit Shadehouse" : "Add Shadehouse"} groups={shadehouseFormGroups} values={shForm.values} onChange={shForm.onChange} isEdit={shForm.isEdit} onSubmit={(v) => save(shadehouses, setShadehouses, shForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Shadehouse" message="Delete this shadehouse and all related data?" onConfirm={() => del(shadehouses, setShadehouses)} />

            {/* The layout and the 3D view are two ways of looking at the same
                shadehouse, so they belong with it rather than as tabs of
                their own beside it. */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-navy-700">Layout</h3>
                <div className="flex bg-sand-100 rounded-lg p-0.5" role="group" aria-label="Layout view">
                  {([["plan", "Plan"], ["3d", "3D"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setShView(id)}
                      aria-pressed={shView === id}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
                        shView === id
                          ? "segment-active shadow-sm"
                          : "text-navy-400 hover:text-navy-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {shView === "plan" ? <ShadehouseView /> : <ShadehouseView3D />}
            </div>
          </>
        );
      case "fields":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Field" }, { key: "code", label: "ID" },
              { key: "shadehouse", label: "Shadehouse" },
              { key: "rows", label: "Bed Rows" }, { key: "notes", label: "Notes" },
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
              { key: "level", label: "Level" },
              { key: "soilType", label: "Soil" }, { key: "irrigationType", label: "Irrigation" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={beds} onAdd={bedForm.openCreate} onEdit={(r, i) => openBedEdit(r as Record<string, unknown>, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Bed" searchPlaceholder="Search beds..." />
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={bulkBedForm.openCreate}
                className="px-3 py-2 text-[12px] font-medium rounded-lg border border-sand-200
                           text-navy-700 hover:bg-sand-50 focus:outline-none
                           focus:ring-2 focus:ring-lime-400/30 transition-colors cursor-pointer"
              >
                Add a run of beds
              </button>
            </div>
            <FormModal open={bulkBedForm.open} onClose={bulkBedForm.close} title="Add a run of beds"
              subtitle="Creates every bed in the row range at once"
              groups={bulkBedFormGroups} values={bulkBedForm.values} onChange={bulkBedForm.onChange}
              submitLabel="Preview" onSubmit={(v) => saveBulkBeds(v)} />
            <FormModal open={bedForm.open} onClose={bedForm.close} title={bedForm.isEdit ? "Edit Bed" : "Add Bed"} groups={bedFormGroups(fields as FieldRow[], beds as BedRow[])} values={bedForm.values} onChange={bedForm.onChange} isEdit={bedForm.isEdit} onSubmit={(v) => saveBed(v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bed" message="Delete this bed?" onConfirm={() => del(beds, setBeds)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Infrastructure" subtitle="Shadehouses, fields and beds" icon={Warehouse}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricTile
          label="Beds in the nursery"
          value={String(infra.beds)}
          icon={LayoutGrid}
          context={{ label: "ground / air", value: `${infra.ground} / ${infra.air}` }}
        />
        <MetricTile
          label="Positions used"
          value={infra.capacity ? `${infra.utilisation}%` : "—"}
          icon={BarChart3}
          tone={infra.utilisation > 100 ? "bad" : infra.utilisation > 90 ? "warn" : "good"}
          context={{ label: "of capacity", value: infra.capacity ? `${infra.positions} / ${infra.capacity}` : "not set" }}
        />
        <MetricTile
          label="Beds carrying a crop"
          value={String(infra.planted)}
          icon={Layers}
          comparison={infra.beds ? { label: "of the nursery", value: `${infra.plantedShare}%` } : undefined}
          context={{ label: "sitting idle", value: String(infra.idle) }}
        />
        <MetricTile
          label="Fields"
          value={String(infra.fields)}
          icon={Warehouse}
          context={{ label: "shadehouses", value: String(infra.shadehouses) }}
        />
      </motion.div>

      {(infra.byField.length > 0 || infra.byLevel.length > 1) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {infra.byField.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadew-sm shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Beds per field</h4>
              <p className="text-[11px] text-navy-400 mb-4">Ground and air together, against the average field</p>
              <RankedBars rows={infra.byField} format={(v) => `${v}`} />
            </div>
          )}
          {infra.byLevel.length > 1 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Beds by level</h4>
              <p className="text-[11px] text-navy-400 mb-4">Ground, then each cable line above it</p>
              <RankedBars rows={infra.byLevel} format={(v) => `${v}`} showAverage={false} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
