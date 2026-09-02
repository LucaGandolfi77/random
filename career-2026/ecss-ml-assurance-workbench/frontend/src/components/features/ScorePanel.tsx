import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreResult } from "../../types";
import { Term } from "../ui/Tooltip";
import { WarningBanner } from "../ui/Feedback";
import { SCORE_DISCLAIMER } from "../../utils/format";

const EVALUATED_COLOR = "#38bdf8";
const NOT_EVALUATED_COLOR = "#334155";

function scoreTone(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 85) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}

export function ScorePanel({ score }: { score: ScoreResult }) {
  const data = score.categories.map((category) => ({
    name: category.name,
    short: category.name.split(" ")[0],
    score: category.score,
    evaluated: category.evaluated,
    weight: category.weight,
  }));
  const evaluatedCount = score.categories.filter((c) => c.evaluated).length;

  return (
    <div className="space-y-3">
      <WarningBanner>{SCORE_DISCLAIMER}</WarningBanner>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel flex flex-col items-center justify-center p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Overall score</p>
          <p className={`mt-1 font-mono text-5xl font-bold ${scoreTone(score.overall_score)}`}>
            {score.overall_score === null ? "—" : score.overall_score.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            of 100 · decision-support only
          </p>
          <div className="mt-3 w-full space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="text-emerald-300">PASS</span>
              <span className="font-mono">{score.pass_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-300">WARNING</span>
              <span className="font-mono">{score.warning_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">FAIL</span>
              <span className="font-mono">{score.fail_count}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>N/A</span>
              <span className="font-mono">{score.not_applicable_count}</span>
            </div>
          </div>
        </div>

        <div className="panel p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-200">Score by category</p>
            <Term label="Share of the 8 score categories that could be evaluated with the available dataset metadata.">
              coverage
            </Term>
            <span className="font-mono text-xs text-slate-300">{score.coverage_pct.toFixed(1)}% ({evaluatedCount}/8)</span>
          </div>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis type="category" dataKey="short" width={120} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(56,189,248,0.06)" }}
                  contentStyle={{ background: "#0d1524", border: "1px solid #334155", fontSize: 12 }}
                  formatter={(value: number, _name: string, props) => [
                    props.payload.evaluated ? `${Number(value).toFixed(1)} / 100` : "not evaluated",
                    props.payload.name,
                  ]}
                />
                <Bar dataKey="score" radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={false}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.evaluated ? EVALUATED_COLOR : NOT_EVALUATED_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Grey bars = category not evaluated (insufficient metadata). Not-evaluated categories never count as a pass.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs" data-testid="score-table">
          <thead className="bg-base-800 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Score</th>
              <th className="px-2 py-2">Weight</th>
              <th className="px-2 py-2 text-right">PASS</th>
              <th className="px-2 py-2 text-right">WARNING</th>
              <th className="px-2 py-2 text-right">FAIL</th>
              <th className="px-2 py-2 text-right">N/A</th>
            </tr>
          </thead>
          <tbody>
            {score.categories.map((category) => (
              <tr key={category.name} className="border-b border-slate-800/60">
                <td className="px-2 py-1.5 font-medium text-slate-200">{category.name}</td>
                <td className={`px-2 py-1.5 font-mono ${scoreTone(category.score)}`}>
                  {category.evaluated ? category.score?.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1.5 font-mono text-slate-500">{category.weight}%</td>
                <td className="px-2 py-1.5 text-right font-mono text-emerald-300">{category.pass_count}</td>
                <td className="px-2 py-1.5 text-right font-mono text-amber-300">{category.warning_count}</td>
                <td className="px-2 py-1.5 text-right font-mono text-red-300">{category.fail_count}</td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-500">{category.not_applicable_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
