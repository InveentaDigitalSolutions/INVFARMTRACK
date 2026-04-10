import { List, LayoutGrid } from "lucide-react";

interface ViewToggleProps {
  view: "list" | "grid";
  onChange: (view: "list" | "grid") => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-sand-100 rounded-lg p-0.5">
      <button
        onClick={() => onChange("list")}
        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
          view === "list"
            ? "bg-white text-navy-800 shadow-sm"
            : "text-navy-400 hover:text-navy-600"
        }`}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("grid")}
        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
          view === "grid"
            ? "bg-white text-navy-800 shadow-sm"
            : "text-navy-400 hover:text-navy-600"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}
