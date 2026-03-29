import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { QueryVolumeItem, PopularDocument, DocumentTypeInfo } from "../../lib/types";

interface QueryVolumeChartProps {
  data: QueryVolumeItem[];
}

export function QueryVolumeChart({ data }: QueryVolumeChartProps) {
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Query Volume (Last 30 Days)
      </h3>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No query data yet. Start asking questions!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Bar dataKey="queries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface PopularDocsChartProps {
  data: PopularDocument[];
}

export function PopularDocsChart({ data }: PopularDocsChartProps) {
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Most Referenced Documents
      </h3>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No citation data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              dataKey="fileName"
              type="category"
              tick={{ fontSize: 11 }}
              width={120}
              tickFormatter={(val: string) =>
                val.length > 18 ? val.slice(0, 18) + "..." : val
              }
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Bar dataKey="citationCount" fill="#10b981" radius={[0, 4, 4, 0]} name="Citations" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface DocTypesChartProps {
  data: DocumentTypeInfo[];
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function DocTypesChart({ data }: DocTypesChartProps) {
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Document Types Distribution
      </h3>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No documents uploaded yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="fileType"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
