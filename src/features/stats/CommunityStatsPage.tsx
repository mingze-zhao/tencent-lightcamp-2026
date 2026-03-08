import type { BodyPart, CommunityBodyStat } from '@/types';

interface CommunityStatsPageProps {
  stats: CommunityBodyStat[];
}

const partLabelMap: Record<BodyPart, string> = {
  head: '头部',
  chest: '胸部',
  abdomen: '腹部',
  left_arm: '左臂',
  right_arm: '右臂',
  left_fingers: '左手指',
  right_fingers: '右手指',
  left_leg: '左腿',
  right_leg: '右腿',
  left_toes: '左脚趾',
  right_toes: '右脚趾',
  back: '背部',
};

const intensityClass = (rate: number) => {
  if (rate >= 0.7) return 'bg-red-300';
  if (rate >= 0.5) return 'bg-red-200';
  if (rate >= 0.3) return 'bg-amber-200';
  if (rate > 0) return 'bg-amber-100';
  return 'bg-slate-100';
};

export default function CommunityStatsPage({ stats }: CommunityStatsPageProps) {
  const sorted = stats.slice().sort((a, b) => b.rate - a.rate);
  const topRate = sorted[0]?.rate ?? 0;
  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-800">社区共性问题统计</h2>
      <p className="mt-1 text-sm text-slate-500">综合所有采访，展示各部位发病热力图与共性问题排名。</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">人体部位热力图</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(partLabelMap).map(([part, label]) => {
            const stat = stats.find((item) => item.part === part);
            return (
              <div key={part} className={`rounded-lg border border-slate-200 p-3 ${intensityClass(stat?.rate ?? 0)}`}>
                <div className="text-xs font-semibold text-slate-800">{label}</div>
                <div className="mt-1 text-[11px] text-slate-700">发病率：{Math.round((stat?.rate ?? 0) * 100)}%</div>
                <div className="text-[11px] text-slate-600">涉及长者：{stat?.elderCount ?? 0}</div>
                <div className="text-[11px] text-slate-600">记录次数：{stat?.issueCount ?? 0}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Top 共性问题</div>
        {sorted.length === 0 ? (
          <div className="text-sm text-slate-500">暂无统计数据。</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((item, index) => (
              <div key={item.part} className="rounded-md border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">
                    {index + 1}. {partLabelMap[item.part]}
                  </div>
                  <div className="text-xs text-slate-500">{Math.round(item.rate * 100)}%</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-red-300"
                    style={{ width: `${topRate > 0 ? (item.rate / topRate) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>活跃问题 {item.activeCount ?? item.issueCount}</span>
                  <span>已缓解 {item.resolvedCount ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
