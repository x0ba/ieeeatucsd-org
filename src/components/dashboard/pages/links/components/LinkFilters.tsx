import React from "react";
import { getCategoryColor } from "../utils/linkPermissions";

interface LinkFiltersProps {
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  linkCounts: Record<string, number>;
}

export default function LinkFilters({
  categoryFilter,
  onCategoryChange,
  linkCounts,
}: LinkFiltersProps) {
  const totalCount = Object.values(linkCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Get all unique categories from linkCounts
  const categories = Object.keys(linkCounts).sort();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Filter by Category
      </h3>
      <div className="flex flex-wrap gap-2">
        {/* All Categories */}
        <button
          onClick={() => onCategoryChange("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryFilter === "all"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          All ({totalCount})
        </button>

        {/* Individual Categories */}
        {categories.map((category) => {
          const count = linkCounts[category] || 0;
          const info = getCategoryColor(category);

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryFilter === category
                ? `${info.bgColor} ${info.color} ring-2 ring-offset-1`
                : `${info.bgColor} ${info.color} hover:ring-2 hover:ring-offset-1`
                }`}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}

