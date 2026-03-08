import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import type { BodyFindingStatus, BodyViewSide, RiskLevel } from '@prisma/client';
import { ingestDataset } from './ingest.js';
import { mapCalendar, mapCommunityStats, mapElder, mapSession } from './mapper.js';
import { prisma } from './prisma.js';
import type { DemoDataset } from './contracts.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const fullSessionInclude = {
  transcript: true,
  sourceRefs: true,
  dimensions: true,
  symptoms: true,
  warnings: {
    include: {
      sourceRefs: {
        include: { sourceRef: { select: { segmentId: true } } },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  actionItems: {
    include: {
      sourceRefs: { include: { sourceRef: { select: { segmentId: true } } } },
    },
    orderBy: { order: 'asc' as const },
  },
  insightBlocks: {
    include: { sourceRefs: true },
  },
  bodyFindings: {
    include: { sourceRefs: true },
    orderBy: { order: 'asc' as const },
  },
} as const;

const detectRisk = (text: string): RiskLevel =>
  /停药|漏服|严重|晕|痛到/.test(text) ? 'high' : /痛|肿|喘|唔舒服|困难/.test(text) ? 'medium' : 'low';

const detectBodyFinding = (
  text: string
): { part: string; label: string; viewSide: BodyViewSide; status: BodyFindingStatus } | null => {
  if (/左手指|左手麻|左手痛/.test(text)) return { part: 'left_fingers', label: '左手指不适', viewSide: 'front', status: 'ongoing' };
  if (/右手指|右手麻|右手痛/.test(text)) return { part: 'right_fingers', label: '右手指不适', viewSide: 'front', status: 'ongoing' };
  if (/左脚趾|左脚麻|左脚趾痛/.test(text)) return { part: 'left_toes', label: '左脚趾不适', viewSide: 'front', status: 'ongoing' };
  if (/右脚趾|右脚麻|右脚趾痛/.test(text)) return { part: 'right_toes', label: '右脚趾不适', viewSide: 'front', status: 'ongoing' };
  if (/脚|腿|膝/.test(text)) return { part: 'left_leg', label: '下肢不适', viewSide: 'front', status: 'ongoing' };
  if (/背|腰/.test(text)) return { part: 'back', label: '背腰不适', viewSide: 'back', status: 'ongoing' };
  if (/胸|喘|呼吸/.test(text)) return { part: 'chest', label: '呼吸相关不适', viewSide: 'front', status: 'ongoing' };
  if (/痛|肿|不适|困难/.test(text)) return { part: 'chest', label: '待复核身体不适', viewSide: 'front', status: 'ongoing' };
  return null;
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/elders', async (_req, res) => {
  const elders = await prisma.elder.findMany({
    include: { tags: true },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
  });
  res.json(elders.map(mapElder));
});

app.post('/api/elders', async (req, res) => {
  const payload = req.body as {
    name: string;
    age: number;
    gender: 'M' | 'F';
    address: string;
    contactNumber: string;
    livingStatus: string;
    chronicDiseases: string[];
    emergencyContact: { name: string; relation: string; phone: string };
    tags?: string[];
  };

  const id = `elder-${Date.now()}`;
  const elder = await prisma.elder.create({
    data: {
      id,
      name: payload.name,
      age: payload.age,
      gender: payload.gender,
      address: payload.address,
      contactNumber: payload.contactNumber,
      livingStatus: payload.livingStatus,
      chronicDiseases: payload.chronicDiseases,
      emergencyContactName: payload.emergencyContact.name,
      emergencyContactRel: payload.emergencyContact.relation,
      emergencyContactPhone: payload.emergencyContact.phone,
      lastVisitDate: new Date(),
      overallRisk: 'low',
      tags: {
        create: (payload.tags ?? []).map((tag, index) => ({ id: `${id}-tag-${index + 1}`, tag })),
      },
    },
    include: { tags: true },
  });
  res.status(201).json(mapElder(elder));
});

app.get('/api/elders/:elderId/sessions', async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { elderId: req.params.elderId },
    include: fullSessionInclude,
    orderBy: { date: 'desc' },
  });
  res.json(sessions.map(mapSession));
});

app.get('/api/sessions/by-elder', async (req, res) => {
  const elderId = String(req.query.elderId ?? '');
  const sessions = await prisma.session.findMany({
    where: { elderId },
    include: fullSessionInclude,
    orderBy: { date: 'desc' },
  });
  res.json(sessions.map(mapSession));
});

app.get('/api/sessions/:sessionId/full', async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: fullSessionInclude,
  });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  return res.json(mapSession(session));
});

app.get('/api/calendar', async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const sessions = await prisma.session.findMany({
    where: {
      date: {
        gte: from,
        lte: to,
      },
    },
    select: { date: true, elderId: true },
  });
  const dateMap = new Map<string, Set<string>>();
  for (const item of sessions) {
    const date = item.date.toISOString().slice(0, 10);
    const set = dateMap.get(date) ?? new Set<string>();
    set.add(item.elderId);
    dateMap.set(date, set);
  }
  const rows = [...dateMap.entries()]
    .map(([date, elderSet]) => ({ date: new Date(date), elderIds: JSON.stringify([...elderSet]) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  res.json(mapCalendar(rows));
});

app.post('/api/sessions/:sessionId/transcript/append', async (req, res) => {
  const sessionId = req.params.sessionId;
  const text = String(req.body.segmentText ?? '').trim();
  if (!text) return res.status(400).json({ message: 'segmentText is required' });

  const last = await prisma.transcriptSegment.findFirst({
    where: { sessionId },
    orderBy: { endTime: 'desc' },
  });
  const count = await prisma.transcriptSegment.count({ where: { sessionId } });
  const startTime = (last?.endTime ?? 0) + 1;
  const segment = await prisma.transcriptSegment.create({
    data: {
      id: `${sessionId}-sg-${count + 1}`,
      sessionId,
      startTime,
      endTime: startTime + 6,
      speaker: 'elder',
      text,
      risk: detectRisk(text),
    },
  });
  await prisma.appendedSegmentLog.create({
    data: {
      id: `${segment.id}-log`,
      sessionId,
      text,
    },
  });
  res.status(201).json({
    id: segment.id,
    startTime: segment.startTime,
    endTime: segment.endTime,
    speaker: segment.speaker,
    text: segment.text,
    risk: segment.risk,
  });
});

app.post('/api/sessions/:sessionId/incremental-extract', async (req, res) => {
  const sessionId = req.params.sessionId;
  const segmentId = String(req.body.segmentId ?? '');
  const segmentText = String(req.body.segmentText ?? '');

  const sourceRefId = `${sessionId}-sr-${Date.now()}`;
  const sourceRef = await prisma.sourceRef.create({
    data: {
      id: sourceRefId,
      sessionId,
      segmentId,
      startChar: 0,
      endChar: Math.max(0, segmentText.length - 1),
      text: segmentText.slice(0, 32),
    },
  });

  const risk = detectRisk(segmentText);
  const blockId = `${sessionId}-ib-${Date.now()}`;
  await prisma.insightBlock.create({
    data: {
      id: blockId,
      sessionId,
      title: risk === 'high' ? '增量风险提醒' : '增量观察记录',
      type: risk === 'high' ? 'warning' : 'symptom',
      risk,
      summary: segmentText,
      sourceRefs: {
        create: { id: `${blockId}-src-1`, sourceRefId },
      },
    },
  });

  let bodyFinding = null as null | {
    id: string;
    part: string;
    label: string;
    status: BodyFindingStatus;
    risk: RiskLevel;
    sourceRefIds: string[];
    viewSide: BodyViewSide;
  };

  const detected = detectBodyFinding(segmentText);
  if (detected) {
    const findingId = `${sessionId}-bf-${Date.now()}`;
    await prisma.bodyFinding.create({
      data: {
        id: findingId,
        sessionId,
        bodyPart: detected.part,
        label: detected.label,
        status: detected.status,
        risk,
        viewSide: detected.viewSide,
        order: 9999,
        sourceRefs: {
          create: {
            id: `${findingId}-src-1`,
            sourceRefId,
          },
        },
      },
    });
    bodyFinding = {
      id: findingId,
      part: detected.part,
      label: detected.label,
      status: detected.status,
      risk,
      sourceRefIds: [sourceRefId],
      viewSide: detected.viewSide,
    };
  }

  let warning: string | undefined;
  if (risk === 'high') {
    warning = `增量预警：${segmentText.slice(0, 24)}`;
    const warningId = `${sessionId}-warn-${Date.now()}`;
    await prisma.warning.create({
      data: {
        id: warningId,
        sessionId,
        content: warning,
        severity: 'high',
        order: 9999,
        sourceRefs: { create: { id: `${warningId}-src-1`, sourceRefId } },
      },
    });
  }

  res.json({
    sourceRef: {
      id: sourceRef.id,
      segmentId: sourceRef.segmentId,
      startChar: sourceRef.startChar,
      endChar: sourceRef.endChar,
      text: sourceRef.text,
    },
    insightBlock: {
      id: blockId,
      title: risk === 'high' ? '增量风险提醒' : '增量观察记录',
      type: risk === 'high' ? 'warning' : 'symptom',
      risk,
      summary: segmentText,
      sourceRefIds: [sourceRefId],
    },
    bodyFinding: bodyFinding ?? undefined,
    warning,
  });
});

app.patch('/api/sessions/:sessionId/action-items/:itemId', async (req, res) => {
  const checked = Boolean(req.body.checked);
  const updated = await prisma.actionItem.update({
    where: { id: req.params.itemId },
    data: { status: checked ? 'completed' : 'pending' },
  });
  res.json({
    id: updated.id,
    status: updated.status,
  });
});

app.get('/api/community/body-heatmap', async (_req, res) => {
  const elders = await prisma.elder.count();
  const findings = await prisma.bodyFinding.findMany({
    select: { bodyPart: true, status: true, session: { select: { elderId: true } } },
  });
  const map = new Map<
    string,
    {
      issueCount: number;
      activeCount: number;
      resolvedCount: number;
      elders: Set<string>;
    }
  >();
  for (const finding of findings) {
    const entry = map.get(finding.bodyPart) ?? {
      issueCount: 0,
      activeCount: 0,
      resolvedCount: 0,
      elders: new Set<string>(),
    };
    entry.issueCount += 1;
    entry.elders.add(finding.session.elderId);
    if (finding.status === 'resolved') entry.resolvedCount += 1;
    else entry.activeCount += 1;
    map.set(finding.bodyPart, entry);
  }
  const rows = [...map.entries()].map(([part, v]) => ({
    part,
    issueCount: v.issueCount,
    elderCount: v.elders.size,
    activeCount: v.activeCount,
    resolvedCount: v.resolvedCount,
  }));
  res.json(mapCommunityStats(rows, elders));
});

app.get('/api/community/body-stats', async (_req, res) => {
  const elders = await prisma.elder.count();
  const findings = await prisma.bodyFinding.findMany({
    select: { bodyPart: true, status: true, session: { select: { elderId: true } } },
  });
  const map = new Map<string, { issueCount: number; activeCount: number; resolvedCount: number; elders: Set<string> }>();
  for (const finding of findings) {
    const entry = map.get(finding.bodyPart) ?? { issueCount: 0, activeCount: 0, resolvedCount: 0, elders: new Set<string>() };
    entry.issueCount += 1;
    entry.elders.add(finding.session.elderId);
    if (finding.status === 'resolved') entry.resolvedCount += 1;
    else entry.activeCount += 1;
    map.set(finding.bodyPart, entry);
  }
  const rows = [...map.entries()].map(([part, v]) => ({
    part,
    issueCount: v.issueCount,
    elderCount: v.elders.size,
    activeCount: v.activeCount,
    resolvedCount: v.resolvedCount,
  }));
  res.json(mapCommunityStats(rows, elders));
});

app.post('/api/ingest/json', async (req, res) => {
  const payload = req.body as DemoDataset;
  if (!payload?.elders || !payload?.sessionsByElder) {
    return res.status(400).json({ message: 'Invalid dataset payload' });
  }
  await ingestDataset(prisma, payload);
  return res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
