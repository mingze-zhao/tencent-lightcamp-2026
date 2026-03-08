import { useMemo, useState } from 'react';
import Model from 'react-body-highlighter';
import type { IExerciseData } from 'react-body-highlighter';
import type { BodyFinding, BodyPart } from '@/types';

interface BodyMapPanelProps {
  findings: BodyFinding[];
  activeSourceRefId?: string;
  onSelectFinding?: (finding: BodyFinding) => void;
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

export default function BodyMapPanel({ findings, activeSourceRefId, onSelectFinding }: BodyMapPanelProps) {
  const [bodySide, setBodySide] = useState<'anterior' | 'posterior'>('anterior');
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
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">人体分区图（前/后视）</div>
        <div className="flex gap-1 rounded-md border border-slate-200 p-1 text-xs">
          <button
            className={`rounded px-2 py-1 ${bodySide === 'anterior' ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
            onClick={() => setBodySide('anterior')}
          >
            正面
          </button>
          <button
            className={`rounded px-2 py-1 ${bodySide === 'posterior' ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}`}
            onClick={() => setBodySide('posterior')}
          >
            背面
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[230px] rounded-lg border border-slate-100 bg-slate-50 p-2">
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
                  className={`pointer-events-auto absolute ${item.className} rounded-full border px-2 py-0.5 text-[10px] ${
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

      <div className="mt-3 grid grid-cols-2 gap-2">
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
              <div className="mt-1">{finding.label}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2 text-[10px] text-slate-600">
        <span className="rounded bg-red-100 px-1.5 py-0.5">新发</span>
        <span className="rounded bg-amber-100 px-1.5 py-0.5">持续</span>
        <span className="rounded bg-emerald-100 px-1.5 py-0.5">痊愈</span>
      </div>
    </div>
  );
}
