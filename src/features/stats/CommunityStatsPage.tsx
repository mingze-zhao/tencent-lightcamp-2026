import { useMemo, useState } from 'react';
import type { BodyPart, CommunityBodyStat, CommunityDashboard, CommunityElderRow, RiskLevel } from '@/types';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Model from 'react-body-highlighter';
import type { IExerciseData } from 'react-body-highlighter';
import { useAppStore } from '@/state/appStore';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface CommunityStatsPageProps {
  stats: CommunityBodyStat[];
  dashboard?: CommunityDashboard;
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
  if (rate >= 0.45) return 'bg-rose-100/80 border-rose-200 text-rose-900';
  if (rate >= 0.3) return 'bg-rose-50 border-rose-100 text-rose-800';
  if (rate >= 0.15) return 'bg-rose-50/50 border-rose-100/50 text-rose-700';
  if (rate > 0) return 'bg-slate-50/80 border-slate-200 text-slate-600';
  return 'bg-transparent border-slate-100 text-slate-400';
};

const formatPercent = (value: number, total: number) => `${Math.round((value / Math.max(total, 1)) * 100)}%`;
const hkCenter: [number, number] = [22.3193, 114.1694];
const knownRegionCoordinates: Record<string, [number, number]> = {
  深水埗: [22.3305, 114.1591],
  油尖旺: [22.3198, 114.1693],
  观塘: [22.3104, 114.2252],
  荃湾: [22.3717, 114.1130],
  沙田: [22.3832, 114.1887],
  屯门: [22.3913, 113.9736],
  元朗: [22.4458, 114.0222],
  北区: [22.4962, 114.1282],
  大埔: [22.4500, 114.1688],
  西贡: [22.3822, 114.2708],
  东区: [22.2840, 114.2249],
  南区: [22.2473, 114.1588],
  九龙城: [22.3282, 114.1916],
  黄大仙: [22.3420, 114.1937],
  葵青: [22.3639, 114.1318],
};
const hashCode = (value: string) =>
  value.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
const normalizedRegion = (value: string) => value.replace(/[0-9#栋座室A-Za-z]/g, '').trim();
const resolveRegionCoord = (region: string): [number, number] => {
  const normalized = normalizedRegion(region);
  if (normalized && knownRegionCoordinates[normalized]) return knownRegionCoordinates[normalized];
  const seed = Math.abs(hashCode(region));
  const latOffset = ((seed % 1400) / 1400 - 0.5) * 0.26;
  const lngOffset = (((Math.floor(seed / 11) % 1400) / 1400) - 0.5) * 0.36;
  return [hkCenter[0] + latOffset, hkCenter[1] + lngOffset];
};
const partMuscles: Record<BodyPart, { anterior: string[]; posterior: string[] }> = {
  head: { anterior: ['head', 'neck'], posterior: ['head', 'neck'] },
  chest: { anterior: ['chest'], posterior: ['upper-back'] },
  abdomen: { anterior: ['abs', 'obliques'], posterior: ['lower-back'] },
  left_arm: { anterior: ['biceps', 'front-deltoids'], posterior: ['triceps', 'back-deltoids'] },
  right_arm: { anterior: ['biceps', 'front-deltoids'], posterior: ['triceps', 'back-deltoids'] },
  left_fingers: { anterior: ['forearm'], posterior: ['forearm'] },
  right_fingers: { anterior: ['forearm'], posterior: ['forearm'] },
  left_leg: { anterior: ['quadriceps', 'adductor'], posterior: ['hamstring', 'calves', 'gluteal'] },
  right_leg: { anterior: ['quadriceps', 'adductor'], posterior: ['hamstring', 'calves', 'gluteal'] },
  left_toes: { anterior: ['calves'], posterior: ['calves'] },
  right_toes: { anterior: ['calves'], posterior: ['calves'] },
  back: { anterior: ['abs'], posterior: ['trapezius', 'upper-back', 'lower-back'] },
};
const riskRank = (risk: RiskLevel) => (risk === 'high' ? 3 : risk === 'medium' ? 2 : 1);

const bodyLabelPositions: Record<string, { anterior?: { top: string; left: string }; posterior?: { top: string; left: string } }> = {
  head: { anterior: { top: '10%', left: '50%' }, posterior: { top: '10%', left: '50%' } },
  chest: { anterior: { top: '25%', left: '50%' } },
  back: { posterior: { top: '28%', left: '50%' } },
  abdomen: { anterior: { top: '38%', left: '50%' }, posterior: { top: '40%', left: '50%' } },
  left_arm: { anterior: { top: '35%', left: '72%' }, posterior: { top: '35%', left: '28%' } },
  right_arm: { anterior: { top: '35%', left: '28%' }, posterior: { top: '35%', left: '72%' } },
  left_fingers: { anterior: { top: '55%', left: '82%' }, posterior: { top: '55%', left: '18%' } },
  right_fingers: { anterior: { top: '55%', left: '18%' }, posterior: { top: '55%', left: '82%' } },
  left_leg: { anterior: { top: '65%', left: '62%' }, posterior: { top: '65%', left: '38%' } },
  right_leg: { anterior: { top: '65%', left: '38%' }, posterior: { top: '65%', left: '62%' } },
  left_toes: { anterior: { top: '88%', left: '65%' }, posterior: { top: '88%', left: '35%' } },
  right_toes: { anterior: { top: '88%', left: '35%' }, posterior: { top: '88%', left: '65%' } },
};

const riskChip = (risk: RiskLevel) =>
  risk === 'high'
    ? 'border-rose-200 bg-rose-50/80 text-rose-700'
    : risk === 'medium'
    ? 'border-amber-200 bg-amber-50/80 text-amber-700'
    : 'border-teal-200 bg-teal-50/80 text-teal-700';

export default function CommunityStatsPage({ stats, dashboard }: CommunityStatsPageProps) {
  const { selectElder, selectSession, setCurrentPage } = useAppStore();
  const [selectedRisk, setSelectedRisk] = useState<'all' | RiskLevel>('all');
  const [selectedRegion, setSelectedRegion] = useState<'all' | string>('all');
  const [selectedDisease, setSelectedDisease] = useState<'all' | string>('all');
  const [selectedPart, setSelectedPart] = useState<'all' | BodyPart | 'none'>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | 'demo' | 'real' | 'mixed'>('all');
  const [keyword, setKeyword] = useState('');
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [onlyHighRiskOver7d, setOnlyHighRiskOver7d] = useState(false);

  const sorted = stats.slice().sort((a, b) => b.rate - a.rate);
  const topRate = sorted[0]?.rate ?? 0;
  const kpis = dashboard?.kpis;
  const trendMax = Math.max(
    1,
    ...(dashboard?.trends.map((item) =>
      Math.max(item.highRiskElders, item.activeIssueElders, item.warningCount)
    ) ?? [1])
  );
  const regionNodes = useMemo(() => {
    const data = (dashboard?.regionStats ?? []).slice(0, 20);
    return data.map((item) => {
      const ratio = item.highRiskCount / Math.max(item.elderCount, 1);
      const coord = resolveRegionCoord(item.region);
      const color = ratio >= 0.5 ? '#e11d48' : ratio >= 0.25 ? '#d97706' : '#0f766e';
      const radius = Math.max(8, Math.min(20, 7 + item.elderCount * 1.8));
      return {
        ...item,
        ratio,
        coord,
        color,
        radius,
      };
    });
  }, [dashboard?.regionStats]);

  const regionOptions = useMemo(
    () => ['all', ...(dashboard?.regionStats.map((item) => item.region) ?? [])],
    [dashboard?.regionStats]
  );
  const diseaseOptions = useMemo(
    () => ['all', ...(dashboard?.chronicStats.map((item) => item.disease) ?? [])],
    [dashboard?.chronicStats]
  );
  const partOptions = useMemo<Array<'all' | 'none' | BodyPart>>(
    () => ['all', 'none', ...(Object.keys(partLabelMap) as BodyPart[])],
    []
  );

  const filteredElders = useMemo(() => {
    const rows = dashboard?.elderRows ?? [];
    const pass = (row: CommunityElderRow) =>
      (selectedRisk === 'all' || row.risk === selectedRisk) &&
      (selectedRegion === 'all' || row.region === selectedRegion) &&
      (selectedDisease === 'all' || row.chronicDiseases.includes(selectedDisease)) &&
      (selectedPart === 'all' || row.involvedParts.includes(selectedPart)) &&
      (selectedScope === 'all' || row.dataScope === selectedScope || (selectedScope !== 'mixed' && row.dataScope === 'mixed')) &&
      (!onlyUnresolved || row.activeIssueCount > 0 || row.pendingActionCount > 0) &&
      (!onlyHighRiskOver7d || (row.risk === 'high' && row.oldestUnresolvedDays > 7)) &&
      (!keyword.trim() || row.elderName.includes(keyword.trim()));
    return rows
      .filter(pass)
      .sort((a, b) => riskRank(b.risk) - riskRank(a.risk) || b.activeIssueCount - a.activeIssueCount || b.warningCount - a.warningCount)
      .slice(0, 80);
  }, [dashboard?.elderRows, keyword, onlyHighRiskOver7d, onlyUnresolved, selectedDisease, selectedPart, selectedRegion, selectedRisk, selectedScope]);

  const trendSeries = useMemo(() => {
    const buckets = dashboard?.trends ?? [];
    return buckets.map((item) => ({
      bucket: item.bucket,
      highRisk: item.highRiskElders,
      activeIssue: item.activeIssueElders,
      warning: item.warningCount,
    }));
  }, [dashboard?.trends]);

  const bodyModelData = useMemo(() => {
    const enriched = stats.map((item) => ({ ...item, intensity: item.rate }));
    const toFrequency = (v: number) => {
      if (v >= 0.45) return 4;
      if (v >= 0.3) return 3;
      if (v >= 0.15) return 2;
      if (v > 0) return 1;
      return 0;
    };
    const front = enriched
      .filter((item) => item.part !== 'back')
      .map((item) => ({
        name: `front-${item.part}`,
        muscles: partMuscles[item.part].anterior as IExerciseData['muscles'],
        frequency: toFrequency(item.intensity ?? 0),
      }));
    const back = enriched
      .filter((item) => item.part === 'back' || item.part.includes('leg') || item.part.includes('toes') || item.part.includes('arm') || item.part.includes('fingers'))
      .map((item) => ({
        name: `back-${item.part}`,
        muscles: partMuscles[item.part].posterior as IExerciseData['muscles'],
        frequency: toFrequency(item.intensity ?? 0),
      }));
    return { front, back };
  }, [stats]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-800">社区共性问题统计</h2>
      <p className="mt-1 text-sm text-slate-500">综合风险、人群、部位、时间与服务执行状态，展示社区健康全景。</p>

      {dashboard ? (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-1 w-full bg-rose-500" />
            <div className="text-xs font-medium text-slate-500">当前高危人数</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{kpis?.highRiskElders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-400">占比 {formatPercent(kpis?.highRiskElders ?? 0, kpis?.elderTotal ?? 0)}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-1 w-full bg-amber-500" />
            <div className="text-xs font-medium text-slate-500">活跃问题人数</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{kpis?.activeIssueElders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-400">新增问题 {kpis?.newIssueCount ?? 0}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-1 w-full bg-teal-500" />
            <div className="text-xs font-medium text-slate-500">痊愈/缓解人数</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{kpis?.resolvedIssueElders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-400">低危 {kpis?.lowRiskElders ?? 0}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-1 w-full bg-slate-300" />
            <div className="text-xs font-medium text-slate-500">预警总量</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{kpis?.warningCount ?? 0}</div>
            <div className="mt-1 text-xs text-slate-400">中危 {kpis?.mediumRiskElders ?? 0}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="absolute left-0 top-0 h-1 w-full bg-slate-300" />
            <div className="text-xs font-medium text-slate-500">行动项闭环率</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {Math.round(
                ((kpis?.completedActionCount ?? 0) /
                  Math.max((kpis?.completedActionCount ?? 0) + (kpis?.pendingActionCount ?? 0), 1)) *
                  100
              )}
              %
            </div>
            <div className="mt-1 text-xs text-slate-400">
              待办 {kpis?.pendingActionCount ?? 0} · 完成 {kpis?.completedActionCount ?? 0}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-bold text-slate-700">社区风险地图（卫星地图）</div>
            <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {dashboard?.window ?? '90d'} · {dashboard?.includeDemo ? '演示+真实' : '真实'}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <MapContainer
              center={hkCenter}
              zoom={11}
              minZoom={9}
              maxZoom={17}
              scrollWheelZoom
              className="h-[300px] w-full"
            >
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              {regionNodes.map((item) => (
                <CircleMarker
                  key={item.region}
                  center={item.coord}
                  radius={item.radius}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 1,
                    fillColor: item.color,
                    fillOpacity: 0.65,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} permanent>
                    <div className="text-xs">
                      <div className="font-semibold">{item.region}</div>
                      <div>
                        高危 {item.highRiskCount}/{item.elderCount} ({Math.round(item.ratio * 100)}%)
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-600"></span>高风险密度高</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-600"></span>中风险密度</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-600"></span>风险可控</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-base font-bold text-slate-700">风险趋势（{dashboard?.granularity ?? 'week'}）</div>
          {dashboard?.trends.length ? (
            <div className="rounded-lg border border-slate-100 bg-white p-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendSeries} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e11d48" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d97706" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendWarn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, Math.max(2, Math.ceil(trendMax * 1.2))]}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                    <Area type="monotone" dataKey="highRisk" name="高危人数" stroke="#e11d48" fill="url(#trendHigh)" strokeWidth={2} />
                    <Area type="monotone" dataKey="activeIssue" name="活跃问题人数" stroke="#d97706" fill="url(#trendActive)" strokeWidth={2} />
                    <Area type="monotone" dataKey="warning" name="预警数量" stroke="#0f766e" fill="url(#trendWarn)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">暂无趋势数据。</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 text-base font-bold text-slate-800">人体部位热力图（前后视）</div>
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr_280px]">
          <div className="flex flex-col relative rounded-xl border border-slate-100 bg-slate-50/30 p-4 overflow-hidden">
            <div className="mb-4 text-center text-xs font-medium text-slate-500 relative z-10">正面</div>
            <div className="flex-1 flex items-center justify-center relative">
              <Model
                data={bodyModelData.front}
                type="anterior"
                bodyColor="#e2e8f0"
                highlightedColors={['#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#e11d48']}
                style={{ width: '100%', minHeight: '320px' }}
                svgStyle={{ width: '100%', height: '320px' }}
              />
              {stats.filter(s => s.rate > 0 && s.part !== 'back' && bodyLabelPositions[s.part]?.anterior).map(s => {
                const pos = bodyLabelPositions[s.part].anterior!;
                return (
                  <div key={`front-lbl-${s.part}`} className="absolute pointer-events-none flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2" style={{ top: pos.top, left: pos.left }}>
                    <div className="px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap">
                      {partLabelMap[s.part]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col relative rounded-xl border border-slate-100 bg-slate-50/30 p-4 overflow-hidden">
            <div className="mb-4 text-center text-xs font-medium text-slate-500 relative z-10">背面</div>
            <div className="flex-1 flex items-center justify-center relative">
              <Model
                data={bodyModelData.back}
                type="posterior"
                bodyColor="#e2e8f0"
                highlightedColors={['#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#e11d48']}
                style={{ width: '100%', minHeight: '320px' }}
                svgStyle={{ width: '100%', height: '320px' }}
              />
              {stats.filter(s => s.rate > 0 && (s.part === 'back' || s.part.includes('leg') || s.part.includes('toes') || s.part.includes('arm') || s.part.includes('fingers')) && bodyLabelPositions[s.part]?.posterior).map(s => {
                const pos = bodyLabelPositions[s.part].posterior!;
                return (
                  <div key={`back-lbl-${s.part}`} className="absolute pointer-events-none flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2" style={{ top: pos.top, left: pos.left }}>
                    <div className="px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap">
                      {partLabelMap[s.part]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {sorted.map((item) => (
              <div key={item.part} className={`rounded-lg border px-3 py-2.5 transition-all ${intensityClass(item.rate)}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{partLabelMap[item.part]}</div>
                    <div className="text-xs font-medium opacity-90">{Math.round(item.rate * 100)}%</div>
                  </div>
                  <div className="mt-1 text-xs opacity-80 flex items-center justify-between">
                    <span>活跃 {item.activeCount ?? 0}</span>
                    <span>痊愈 {item.resolvedCount ?? 0}</span>
                  </div>
                  {item.topLabels && item.topLabels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.topLabels.map(l => (
                        <span key={l.name} className="inline-flex items-center rounded-sm bg-white/60 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                          {l.name} {l.count > 1 && <span className="ml-0.5 opacity-60">({l.count})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 text-base font-bold text-slate-800">多维筛选 <span className="text-slate-400 font-normal mx-1">/</span> 命中个案（排查视角）</div>
        <div className="mb-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-7">
          <input
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            placeholder="搜索姓名"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" value={selectedRisk} onChange={(event) => setSelectedRisk(event.target.value as 'all' | RiskLevel)}>
              <option value="all">风险：全部</option>
              <option value="high">风险：高危</option>
              <option value="medium">风险：中危</option>
              <option value="low">风险：低危</option>
            </select>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
              {regionOptions.map((item) => (
                <option key={item} value={item}>
                  片区：{item === 'all' ? '全部' : item}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" value={selectedDisease} onChange={(event) => setSelectedDisease(event.target.value)}>
              {diseaseOptions.map((item) => (
                <option key={item} value={item}>
                  慢病：{item === 'all' ? '全部' : item}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" value={selectedPart} onChange={(event) => setSelectedPart(event.target.value as 'all' | BodyPart | 'none')}>
              {partOptions.map((item) => (
                <option key={item} value={item}>
                  部位：
                  {item === 'all' ? '全部' : item === 'none' ? '无部位记录' : partLabelMap[item]}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" value={selectedScope} onChange={(event) => setSelectedScope(event.target.value as 'all' | 'demo' | 'real' | 'mixed')}>
              <option value="all">数据：全部</option>
              <option value="real">数据：真实</option>
              <option value="demo">数据：演示</option>
              <option value="mixed">数据：混合</option>
            </select>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-all">
            <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5" checked={onlyUnresolved} onChange={(event) => setOnlyUnresolved(event.target.checked)} />
            仅看未解决
          </label>
          <button
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              onlyHighRiskOver7d ? 'border-rose-200 bg-rose-50 text-rose-700 shadow-inner' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
            onClick={() => setOnlyHighRiskOver7d((prev) => !prev)}
          >
            高危且未闭环 &gt; 7天
          </button>
        </div>
        <div className="mb-3 text-xs text-slate-500">命中 <span className="font-medium text-slate-700">{filteredElders.length}</span> 人（按风险及活跃问题优先排序）</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredElders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 xl:col-span-3">当前筛选下没有命中个案。</div>
          ) : (
            filteredElders.map((row) => (
              <div key={row.elderId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">{row.elderName}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskChip(row.risk)}`}>{row.risk}</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  {row.region} <span className="mx-1 text-slate-300">|</span> 最近会话 {row.lastSessionDate ?? '-'} <span className="mx-1 text-slate-300">|</span> 数据 {row.dataScope}
                </div>
                <div className="mt-1.5 text-xs text-slate-700">
                  活跃 <span className="font-medium text-amber-600">{row.activeIssueCount}</span> · 预警 <span className="font-medium text-rose-600">{row.warningCount}</span> · 待办 {row.pendingActionCount}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  已解决 {row.resolvedIssueCount} · 已完成 {row.completedActionCount} · 挂起最久 {row.oldestUnresolvedDays} 天
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.involvedParts.slice(0, 4).map((part) => (
                    <span key={`${row.elderId}-${part}`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 border border-slate-200">
                      {part === 'none' ? '-' : partLabelMap[part]}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  慢病：{row.chronicDiseases.length ? row.chronicDiseases.join(' / ') : '未标注'}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    onClick={() => {
                      setCurrentPage('archive');
                      void selectElder(row.elderId);
                    }}
                  >
                    人员档案
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      setCurrentPage('workbench');
                      void selectElder(row.elderId).then(() => {
                        if (row.lastSessionId) selectSession(row.lastSessionId);
                      });
                    }}
                  >
                    个案工作台
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="mb-4 text-base font-bold text-slate-800">Top 共性问题</div>
          {sorted.length === 0 ? (
            <div className="text-sm text-slate-500">暂无统计数据。</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((item, index) => (
                <div key={item.part} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-700">
                      <span className="mr-2 text-slate-400">{index + 1}.</span>{partLabelMap[item.part]}
                    </div>
                    <div className="text-xs font-medium text-slate-500">{Math.round(item.rate * 100)}%</div>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
                      style={{ width: `${topRate > 0 ? (item.rate / topRate) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>活跃问题 <span className="font-medium text-slate-700">{item.activeCount ?? item.issueCount}</span></span>
                    <span>已缓解 <span className="font-medium text-slate-700">{item.resolvedCount ?? 0}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 text-base font-bold text-slate-800">慢病分层视图</div>
          <div className="space-y-3">
            {(dashboard?.chronicStats ?? []).slice(0, 10).map((item) => (
              <div key={item.disease} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.disease}</span>
                  <span className="text-xs text-slate-500">长者 <span className="font-medium text-slate-700">{item.elderCount}</span></span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  高危 <span className="font-medium text-rose-600">{item.highRiskCount}</span> <span className="mx-1 text-slate-300">|</span> 活跃问题 <span className="font-medium text-amber-600">{item.activeIssueCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
