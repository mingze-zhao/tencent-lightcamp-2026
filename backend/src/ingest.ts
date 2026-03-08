import type { Prisma, PrismaClient } from '@prisma/client';
import type { DemoDataset } from './contracts.js';

const inferViewSide = (part: string) => (part === 'back' ? 'back' : 'front');

const baseDimensionOrder = ['medication', 'diet', 'emotion', 'adl', 'social_support'] as const;

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
          status: session.status,
          report: session.report ?? null,
        },
      });

      for (const segment of session.transcript) {
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
