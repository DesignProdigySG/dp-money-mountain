"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export interface MountainChartRow {
  label: string;
  total: number;
  isPick: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function MountainChart({ rows }: { rows: MountainChartRow[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs" style={{ color: "var(--foreground-secondary)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--series-pick)" }} />
          Current pick
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--series-other)" }} />
          Other bands
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis dataKey="label" tick={{ fill: "var(--foreground-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--baseline, var(--gridline))" }} tickLine={false} />
          <YAxis tick={{ fill: "var(--foreground-muted)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={56} />
          <Tooltip
            formatter={(value) => fmt(Number(value))}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {rows.map((row, i) => (
              <Cell key={i} fill={row.isPick ? "var(--series-pick)" : "var(--series-other)"} />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              formatter={(value) => fmt(Number(value))}
              style={{ fill: "var(--foreground-secondary)", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
