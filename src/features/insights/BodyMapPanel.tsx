import { useMemo, useState } from 'react';
import Model from 'react-body-highlighter';
import type { IExerciseData } from 'react-body-highlighter';
import type { BodyFinding, BodyPart } from '@/types';

interface BodyMapPanelProps {
  findings: BodyFinding[];
  activeSourceRefId?: string;
  onSelectFinding?: (finding: BodyFinding) => void;
  isEditMode?: boolean;
  onEditFinding?: (findingId: string, patch: { label?: string; status?: 'new' | 'ongoing' | 'resolved' }) => void;
  onDeleteFinding?: (findingId: string) => void;
  fixedBodySide?: 'anterior' | 'posterior';
  title?: string;
  hideHeader?: boolean;
  hideLegend?: boolean;
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

const statusClassMap = {
  new: 'bg-red-100 border-red-300 text-red-700',
  ongoing: 'bg-amber-100 border-amber-300 text-amber-700',
  resolved: 'bg-emerald-100 border-emerald-300 text-emerald-700',
};

const partOrder: BodyPart[] = [
  'head',
  'chest',
  'abdomen',
  'left_arm',
  'right_arm',
  'left_fingers',
  'right_fingers',
  'left_leg',
  'right_leg',
  'left_toes',
  'right_toes',
  'back',
];

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

const inferSide = (finding: BodyFinding): 'anterior' | 'posterior' => {
  if (finding.viewSide === 'back') return 'posterior';
  if (finding.viewSide === 'front') return 'anterior';
  return finding.part === 'back' ? 'posterior' : 'anterior';
};

export default function BodyMapPanel({
  findings,
  activeSourceRefId,
  onSelectFinding,
  isEditMode,
  onEditFinding,
  onDeleteFinding,
  fixedBodySide,
  title,
  hideHeader,
  hideLegend,
}: BodyMapPanelProps) {
  const [bodySideState, setBodySideState] = useState<'anterior' | 'posterior'>('anterior');
  const bodySide = fixedBodySide ?? bodySideState;
  const findingByPart = findings.reduce<Record<string, BodyFinding[]>>((acc, finding) => {
    acc[finding.part] = [...(acc[finding.part] ?? []), finding];
    return acc;
  }, {});

  const latestByPart = useMemo(
    () =>
      partOrder
        .map((part) => {
          const list = findingByPart[part] ?? [];
          return list[list.length - 1];
        })
        .filter(Boolean) as BodyFinding[],
    [findingByPart]
  );

  const shownFindings = useMemo(
    () => latestByPart.filter((finding) => inferSide(finding) === bodySide),
    [bodySide, latestByPart]
  );

  const modelData = useMemo<IExerciseData[]>(
    () =>
      shownFindings.map((finding) => ({
        name: `${finding.part}:${finding.id}`,
        muscles: partMuscles[finding.part][bodySide] as IExerciseData['muscles'],
        frequency: finding.status === 'new' ? 3 : finding.status === 'ongoing' ? 2 : 1,
      })),
    [bodySide, shownFindings]
  );

  const muscleMap = useMemo(() => {
    const map = new Map<string, BodyFinding>();
    shownFindings.forEach((finding) => {
      partMuscles[finding.part][bodySide].forEach((muscle) => {
        map.set(muscle, finding);
      });
    });
    return map;
  }, [bodySide, shownFindings]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {hideHeader ? null : (
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">{title ?? '人体分区图（前/后视）'}</div>
          {fixedBodySide ? (
            <div className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {fixedBodySide === 'anterior' ? '正面' : '背面'}
            </div>
          ) : (
            <div className="flex gap-1 rounded-md border border-slate-200 p-1 text-xs">
              <button
                className={`rounded px-2 py-1 ${bodySide === 'anterior' ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
                onClick={() => setBodySideState('anterior')}
              >
                正面
              </button>
              <button
                className={`rounded px-2 py-1 ${bodySide === 'posterior' ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
                onClick={() => setBodySideState('posterior')}
              >
                背面
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[240px] rounded-lg border border-slate-100 bg-slate-50 p-2">
        <div className="relative">
          <Model
            data={modelData}
            type={bodySide}
            bodyColor="#d5dce4"
            highlightedColors={['#86efac', '#fdba74', '#fda4af']}
            onClick={({ muscle }: { muscle: string }) => {
              const finding = muscleMap.get(muscle);
              if (finding) onSelectFinding?.(finding);
            }}
            style={{ width: '100%', minHeight: '320px' }}
            svgStyle={{ width: '100%', height: '320px' }}
          />
          <div className="pointer-events-none absolute inset-0">
            {(
              [
                { part: 'left_fingers', className: 'left-2 top-[38%]' },
                { part: 'right_fingers', className: 'right-2 top-[38%]' },
                { part: 'left_toes', className: 'left-8 bottom-[8%]' },
                { part: 'right_toes', className: 'right-8 bottom-[8%]' },
              ] as Array<{ part: BodyPart; className: string }>
            ).map((item) => {
              const finding = shownFindings.find((f) => f.part === item.part);
              if (!finding) return null;
              return (
                <button
                  key={item.part}
                  className={`pointer-events-auto absolute ${item.className} rounded-full border px-2 py-0.5 text-xs ${
                    statusClassMap[finding.status as keyof typeof statusClassMap]
                  }`}
                  onClick={() => onSelectFinding?.(finding)}
                >
                  {partLabelMap[item.part]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${fixedBodySide ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {shownFindings.map((finding) => {
          const active = !!activeSourceRefId && finding.sourceRefIds.includes(activeSourceRefId);
          return (
            <button
              key={finding.id}
              className={`rounded-md border px-2 py-2 text-left text-xs ${
                active
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : statusClassMap[finding.status as keyof typeof statusClassMap]
              }`}
              onClick={() => onSelectFinding?.(finding)}
            >
              <div className="font-semibold">{partLabelMap[finding.part]}</div>
              {isEditMode ? (
                <div className="mt-1 space-y-1">
                  <input
                    className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
                    value={finding.label}
                    onChange={(event) => onEditFinding?.(finding.id, { label: event.target.value })}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <select
                    className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
                    value={finding.status}
                    onChange={(event) =>
                      onEditFinding?.(finding.id, { status: event.target.value as 'new' | 'ongoing' | 'resolved' })
                    }
                    onClick={(event) => event.stopPropagation()}
                  >
                    <option value="new">new</option>
                    <option value="ongoing">ongoing</option>
                    <option value="resolved">resolved</option>
                  </select>
                  <button
                    className="w-full rounded border border-red-200 bg-red-50 px-1.5 py-1 text-xs text-red-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteFinding?.(finding.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              ) : (
                <div className="mt-1">{finding.label}</div>
              )}
            </button>
          );
        })}
      </div>
      {hideLegend ? null : (
        <div className="mt-3 flex gap-2 text-xs text-slate-600">
          <span className="rounded bg-red-100 px-1.5 py-0.5">新发</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5">持续</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5">痊愈</span>
        </div>
      )}
    </div>
  );
}
