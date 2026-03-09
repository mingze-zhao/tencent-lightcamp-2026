import type { Prisma, PrismaClient } from '@prisma/client';
import type { DemoDataset } from './contracts.js';

const inferViewSide = (part: string) => (part === 'back' ? 'back' : 'front');

const baseDimensionOrder = ['medication', 'diet', 'emotion', 'adl', 'social_support'] as const;

const transcriptPadBank = [
  { speaker: 'social_worker' as const, text: '我再确认一下，你最近一周最困扰你的症状系咩？' },
  { speaker: 'elder' as const, text: '主要都系活动时会辛苦啲，不过比之前有少少改善。' },
  { speaker: 'social_worker' as const, text: '明白，我会帮你记录并同医生沟通，另外你自己有无做日常监测？' },
  { speaker: 'elder' as const, text: '有，我而家会记低数据同感受，但有时都会漏一两次。' },
  { speaker: 'social_worker' as const, text: '好，今日我哋一齐再定一个下周可执行嘅小目标。' },
  { speaker: 'elder' as const, text: '可以，我想先由最容易做得到嘅开始。' },
];

function enrichTranscript(
  sessionId: string,
  transcript: Array<{
    id: string;
    startTime: number;
    endTime: number;
    speaker: 'social_worker' | 'elder';
    text: string;
    risk?: 'high' | 'medium' | 'low';
    keywords?: string[];
  }>
) {
  if (transcript.length >= 8) return transcript;
  const extraNeeded = 8 - transcript.length;
  const baseEnd = transcript.length ? transcript[transcript.length - 1].endTime : 0;
  const startIndex = Math.abs(
    [...sessionId].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % transcriptPadBank.length;
  const extras = Array.from({ length: extraNeeded }, (_, index) => {
    const line = transcriptPadBank[(startIndex + index) % transcriptPadBank.length];
    const startTime = baseEnd + index * 7 + 1;
    return {
      id: `${sessionId}-extra-${index + 1}`,
      startTime,
      endTime: startTime + 6,
      speaker: line.speaker,
      text: line.text,
      risk: line.speaker === 'elder' ? ('low' as const) : undefined,
      keywords: undefined,
    };
  });
  return [...transcript, ...extras];
}

export async function wipeAll(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.bodyFindingSourceRef.deleteMany(),
    prisma.bodyFinding.deleteMany(),
    prisma.actionItemSourceRef.deleteMany(),
    prisma.actionItem.deleteMany(),
    prisma.warningSourceRef.deleteMany(),
    prisma.warning.deleteMany(),
    prisma.insightBlockSourceRef.deleteMany(),
    prisma.insightBlock.deleteMany(),
    prisma.symptom.deleteMany(),
    prisma.sessionDimension.deleteMany(),
    prisma.sourceRef.deleteMany(),
    prisma.transcriptSegment.deleteMany(),
    prisma.appendedSegmentLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.elderTag.deleteMany(),
    prisma.elder.deleteMany(),
  ]);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function ingestDataset(prisma: PrismaClient, dataset: DemoDataset) {
  await wipeAll(prisma);

  for (const elder of dataset.elders) {
    await prisma.elder.create({
      data: {
        id: elder.id,
        name: elder.name,
        age: elder.age,
        gender: elder.gender,
        address: elder.address,
        contactNumber: elder.contactNumber,
        livingStatus: elder.livingStatus,
        chronicDiseases: toJson(elder.chronicDiseases),
        emergencyContactName: elder.emergencyContact.name,
        emergencyContactPhone: elder.emergencyContact.phone,
        emergencyContactRel: elder.emergencyContact.relation,
        ifDemo: elder.ifDemo ?? true,
        overallRisk: elder.overallRisk ?? 'low',
        lastVisitDate: elder.lastVisitDate ? new Date(elder.lastVisitDate) : null,
        tags: {
          create: (elder.tags ?? []).map((tag, index) => ({
            id: `${elder.id}-tag-${index + 1}`,
            tag,
          })),
        },
      },
    });
  }

  for (const [elderId, sessions] of Object.entries(dataset.sessionsByElder)) {
    for (const session of sessions) {
      await prisma.session.create({
        data: {
          id: session.id,
          elderId,
          date: new Date(session.date),
          duration: session.duration,
          ifDemo: session.ifDemo ?? true,
          status: session.status,
          report: session.report ?? null,
        },
      });

      const enrichedTranscript = enrichTranscript(session.id, session.transcript);
      for (const segment of enrichedTranscript) {
        await prisma.transcriptSegment.create({
          data: {
            id: segment.id,
            sessionId: session.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            speaker: segment.speaker,
            text: segment.text,
            risk: segment.risk ?? null,
            keywords: segment.keywords ? toJson(segment.keywords) : undefined,
          },
        });
      }

      for (const source of session.sourceRefs ?? []) {
        await prisma.sourceRef.create({
          data: {
            id: source.id,
            sessionId: session.id,
            segmentId: source.segmentId,
            startChar: source.startChar,
            endChar: source.endChar,
            text: source.text,
          },
        });
      }

      const extract = session.extractResult;
      if (extract) {
        for (const dimension of baseDimensionOrder) {
          const value = extract[dimension];
          if (!value) continue;
          await prisma.sessionDimension.create({
            data: {
              id: `${session.id}-dim-${dimension}`,
              sessionId: session.id,
              dimension,
              summary: value.summary,
              risk: value.risk,
              details: value.details ? toJson(value.details) : undefined,
              sourceSegmentIds: value.sourceSegmentIds ? toJson(value.sourceSegmentIds) : undefined,
            },
          });
        }

        for (let i = 0; i < extract.symptoms.length; i += 1) {
          const symptom = extract.symptoms[i];
          await prisma.symptom.create({
            data: {
              id: symptom.id ?? `${session.id}-sym-${i + 1}`,
              sessionId: session.id,
              description: symptom.description,
              risk: symptom.risk,
              sourceSegmentIds: symptom.sourceSegmentIds ? toJson(symptom.sourceSegmentIds) : undefined,
            },
          });
        }

        for (let i = 0; i < extract.warnings.length; i += 1) {
          const warning = await prisma.warning.create({
            data: {
              id: `${session.id}-warn-${i + 1}`,
              sessionId: session.id,
              content: extract.warnings[i],
              severity: extract.warnings[i].includes('漏服') ? 'high' : 'medium',
              order: i,
            },
          });
          const segmentIds = extract.warningSegmentIds?.[i] ?? [];
          const refs = (session.sourceRefs ?? []).filter((ref) => segmentIds.includes(ref.segmentId));
          for (let j = 0; j < refs.length; j += 1) {
            await prisma.warningSourceRef.create({
              data: {
                id: `${warning.id}-src-${j + 1}`,
                warningId: warning.id,
                sourceRefId: refs[j].id,
              },
            });
          }
        }

        for (let i = 0; i < extract.action_items.length; i += 1) {
          const item = extract.action_items[i];
          await prisma.actionItem.create({
            data: {
              id: item.id,
              sessionId: session.id,
              content: item.content,
              priority: item.priority,
              status: item.status,
              order: i,
              sourceRefs: {
                create: ((item.sourceSegmentIds ?? [])
                  .flatMap((segmentId) => (session.sourceRefs ?? []).filter((ref) => ref.segmentId === segmentId))
                  .map((ref, idx) => ({
                    id: `${item.id}-src-${idx + 1}`,
                    sourceRefId: ref.id,
                  }))),
              },
            },
          });
        }

        for (const block of extract.insightBlocks ?? []) {
          await prisma.insightBlock.create({
            data: {
              id: block.id,
              sessionId: session.id,
              title: block.title,
              type: block.type,
              risk: block.risk,
              summary: block.summary,
              sourceRefs: {
                create: block.sourceRefIds.map((sourceRefId, index) => ({
                  id: `${block.id}-src-${index + 1}`,
                  sourceRefId,
                })),
              },
            },
          });
        }
      }

      for (let i = 0; i < (session.bodyMapSnapshot?.findings.length ?? 0); i += 1) {
        const finding = session.bodyMapSnapshot!.findings[i];
        await prisma.bodyFinding.create({
          data: {
            id: finding.id,
            sessionId: session.id,
            viewSide: finding.viewSide ?? inferViewSide(finding.part),
            bodyPart: finding.part,
            label: finding.label,
            status: finding.status,
            risk: finding.risk,
            order: i,
            sourceRefs: {
              create: finding.sourceRefIds.map((sourceRefId, index) => ({
                id: `${finding.id}-src-${index + 1}`,
                sourceRefId,
              })),
            },
          },
        });
      }
    }
  }
}
