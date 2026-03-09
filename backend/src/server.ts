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

const includeDemo = (value: unknown) => String(value ?? '1') !== '0';

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

app.get('/api/elders', async (req, res) => {
  const showDemo = includeDemo(req.query.includeDemo);
  const elders = await prisma.elder.findMany({
    where: showDemo ? undefined : { ifDemo: false },
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
      ifDemo: false,
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
  const showDemo = includeDemo(req.query.includeDemo);
  const sessions = await prisma.session.findMany({
    where: {
      elderId: req.params.elderId,
      ...(showDemo ? {} : { ifDemo: false }),
    },
    include: fullSessionInclude,
    orderBy: { date: 'desc' },
  });
  res.json(sessions.map(mapSession));
});

app.get('/api/sessions/by-elder', async (req, res) => {
  const elderId = String(req.query.elderId ?? '');
  const showDemo = includeDemo(req.query.includeDemo);
  const sessions = await prisma.session.findMany({
    where: { elderId, ...(showDemo ? {} : { ifDemo: false }) },
    include: fullSessionInclude,
    orderBy: { date: 'desc' },
  });
  res.json(sessions.map(mapSession));
});

app.get('/api/sessions/:sessionId/full', async (req, res) => {
  const showDemo = includeDemo(req.query.includeDemo);
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: fullSessionInclude,
  });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (!showDemo && session.ifDemo) return res.status(404).json({ message: 'Session not found' });
  return res.json(mapSession(session));
});

app.get('/api/calendar', async (req, res) => {
  const showDemo = includeDemo(req.query.includeDemo);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const sessions = await prisma.session.findMany({
    where: {
      ...(showDemo ? {} : { ifDemo: false }),
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

app.post('/api/sessions/:sessionId/source-refs', async (req, res) => {
  const sessionId = req.params.sessionId;
  const segmentId = String(req.body.segmentId ?? '').trim();
  const startChar = Number(req.body.startChar ?? 0);
  const endChar = Number(req.body.endChar ?? startChar);
  if (!segmentId) return res.status(400).json({ message: 'segmentId is required' });
  const segment = await prisma.transcriptSegment.findUnique({ where: { id: segmentId } });
  if (!segment) return res.status(404).json({ message: 'segment not found' });
  const boundedStart = Math.max(0, Math.min(startChar, Math.max(segment.text.length - 1, 0)));
  const boundedEnd = Math.max(boundedStart, Math.min(endChar, Math.max(segment.text.length - 1, boundedStart)));
  const text =
    typeof req.body.text === 'string' && req.body.text.trim()
      ? String(req.body.text).trim()
      : segment.text.slice(boundedStart, boundedEnd + 1);
  const sourceRef = await prisma.sourceRef.create({
    data: {
      id: `${sessionId}-sr-${Date.now()}`,
      sessionId,
      segmentId,
      startChar: boundedStart,
      endChar: boundedEnd,
      text,
    },
  });
  return res.status(201).json(sourceRef);
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

app.post('/api/sessions/:sessionId/insights', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body as Partial<{
    title: string;
    summary: string;
    risk: RiskLevel;
    type: 'warning' | 'medication' | 'symptom' | 'emotion' | 'social' | 'diet' | 'adl' | 'action_item';
    sourceRefIds: string[];
  }>;
  const sourceRefIds = (body.sourceRefIds ?? []).filter(Boolean);
  const count = await prisma.insightBlock.count({ where: { sessionId } });
  const created = await prisma.insightBlock.create({
    data: {
      id: `${sessionId}-ib-${Date.now()}`,
      sessionId,
      title: body.title?.trim() || '新结构化块',
      summary: body.summary?.trim() || '待补充',
      risk: body.risk ?? 'low',
      type: body.type ?? 'symptom',
      sourceRefs: {
        create: sourceRefIds.map((sourceRefId, idx) => ({
          id: `${sessionId}-ib-src-${Date.now()}-${idx}`,
          sourceRefId,
        })),
      },
    },
    include: { sourceRefs: true },
  });
  return res.status(201).json({
    id: created.id,
    title: created.title,
    type: created.type,
    risk: created.risk,
    summary: created.summary,
    sourceRefIds: created.sourceRefs.map((item) => item.sourceRefId),
    order: count + 1,
  });
});

app.delete('/api/sessions/:sessionId/insights/:blockId', async (req, res) => {
  await prisma.insightBlock.delete({ where: { id: req.params.blockId } });
  return res.json({ ok: true });
});

app.post('/api/sessions/:sessionId/warnings', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body as Partial<{ content: string; severity: RiskLevel; sourceRefIds: string[] }>;
  const content = String(body.content ?? '').trim();
  if (!content) return res.status(400).json({ message: 'content is required' });
  const sourceRefIds = (body.sourceRefIds ?? []).filter(Boolean);
  const maxOrder = await prisma.warning.aggregate({
    where: { sessionId },
    _max: { order: true },
  });
  const warning = await prisma.warning.create({
    data: {
      id: `${sessionId}-warn-${Date.now()}`,
      sessionId,
      content,
      severity: body.severity ?? 'medium',
      order: (maxOrder._max.order ?? 0) + 1,
      sourceRefs: {
        create: sourceRefIds.map((sourceRefId, idx) => ({
          id: `${sessionId}-warn-src-${Date.now()}-${idx}`,
          sourceRefId,
        })),
      },
    },
    include: { sourceRefs: true },
  });
  return res.status(201).json({
    id: warning.id,
    content: warning.content,
    sourceRefIds: warning.sourceRefs.map((item) => item.sourceRefId),
  });
});

app.delete('/api/sessions/:sessionId/warnings/:warningIndex', async (req, res) => {
  const index = Number(req.params.warningIndex);
  if (!Number.isFinite(index) || index < 0) return res.status(400).json({ message: 'warningIndex invalid' });
  const warnings = await prisma.warning.findMany({
    where: { sessionId: req.params.sessionId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  const target = warnings[index];
  if (!target) return res.status(404).json({ message: 'Warning not found' });
  await prisma.warning.delete({ where: { id: target.id } });
  return res.json({ ok: true });
});

app.post('/api/sessions/:sessionId/action-items', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body as Partial<{
    content: string;
    priority: RiskLevel;
    status: 'pending' | 'in_progress' | 'completed';
    sourceRefIds: string[];
  }>;
  const sourceRefIds = (body.sourceRefIds ?? []).filter(Boolean);
  const maxOrder = await prisma.actionItem.aggregate({
    where: { sessionId },
    _max: { order: true },
  });
  const created = await prisma.actionItem.create({
    data: {
      id: `${sessionId}-action-${Date.now()}`,
      sessionId,
      content: body.content?.trim() || '待跟进事项',
      priority: body.priority ?? 'medium',
      status: body.status ?? 'pending',
      order: (maxOrder._max.order ?? 0) + 1,
      sourceRefs: {
        create: sourceRefIds.map((sourceRefId, idx) => ({
          id: `${sessionId}-action-src-${Date.now()}-${idx}`,
          sourceRefId,
        })),
      },
    },
    include: { sourceRefs: { include: { sourceRef: { select: { segmentId: true } } } } },
  });
  return res.status(201).json({
    id: created.id,
    content: created.content,
    priority: created.priority,
    status: created.status,
    sourceSegmentIds: created.sourceRefs.map((item) => item.sourceRef.segmentId),
  });
});

app.delete('/api/sessions/:sessionId/action-items/:itemId', async (req, res) => {
  await prisma.actionItem.delete({ where: { id: req.params.itemId } });
  return res.json({ ok: true });
});

app.post('/api/sessions/:sessionId/body-findings', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body as Partial<{
    part: string;
    label: string;
    status: BodyFindingStatus;
    risk: RiskLevel;
    viewSide: BodyViewSide;
    sourceRefIds: string[];
  }>;
  const sourceRefIds = (body.sourceRefIds ?? []).filter(Boolean);
  const maxOrder = await prisma.bodyFinding.aggregate({
    where: { sessionId },
    _max: { order: true },
  });
  const created = await prisma.bodyFinding.create({
    data: {
      id: `${sessionId}-bf-${Date.now()}`,
      sessionId,
      bodyPart: body.part ?? 'chest',
      label: body.label?.trim() || '待补充身体发现',
      status: body.status ?? 'ongoing',
      risk: body.risk ?? 'medium',
      viewSide: body.viewSide ?? 'front',
      order: (maxOrder._max.order ?? 0) + 1,
      sourceRefs: {
        create: sourceRefIds.map((sourceRefId, idx) => ({
          id: `${sessionId}-bf-src-${Date.now()}-${idx}`,
          sourceRefId,
        })),
      },
    },
    include: { sourceRefs: true },
  });
  return res.status(201).json({
    id: created.id,
    part: created.bodyPart,
    label: created.label,
    status: created.status,
    risk: created.risk,
    viewSide: created.viewSide,
    sourceRefIds: created.sourceRefs.map((item) => item.sourceRefId),
  });
});

app.delete('/api/sessions/:sessionId/body-findings/:findingId', async (req, res) => {
  await prisma.bodyFinding.delete({ where: { id: req.params.findingId } });
  return res.json({ ok: true });
});

app.post('/api/sessions/:sessionId/dimensions', async (req, res) => {
  const sessionId = req.params.sessionId;
  const body = req.body as Partial<{
    dimension: string;
    summary: string;
    risk: RiskLevel;
    details: string[];
    sourceSegmentIds: string[];
  }>;
  const dimension = String(body.dimension ?? '').trim();
  if (!dimension) return res.status(400).json({ message: 'dimension is required' });
  const created = await prisma.sessionDimension.upsert({
    where: { sessionId_dimension: { sessionId, dimension } },
    update: {
      summary: body.summary?.trim() || '待补充',
      risk: body.risk ?? 'low',
      details: body.details ?? [],
      sourceSegmentIds: body.sourceSegmentIds ?? [],
    },
    create: {
      id: `${sessionId}-dim-${Date.now()}`,
      sessionId,
      dimension,
      summary: body.summary?.trim() || '待补充',
      risk: body.risk ?? 'low',
      details: body.details ?? [],
      sourceSegmentIds: body.sourceSegmentIds ?? [],
    },
  });
  return res.status(201).json(created);
});

app.delete('/api/sessions/:sessionId/dimensions/:dimensionId', async (req, res) => {
  await prisma.sessionDimension.delete({ where: { id: req.params.dimensionId } });
  return res.json({ ok: true });
});

app.patch('/api/sessions/:sessionId/action-items/:itemId', async (req, res) => {
  const checked = req.body.checked === undefined ? undefined : Boolean(req.body.checked);
  const content = req.body.content === undefined ? undefined : String(req.body.content);
  const priority = req.body.priority === undefined ? undefined : (String(req.body.priority) as RiskLevel);
  const updated = await prisma.actionItem.update({
    where: { id: req.params.itemId },
    data: {
      ...(checked === undefined ? {} : { status: checked ? 'completed' : 'pending' }),
      ...(content === undefined ? {} : { content }),
      ...(priority === undefined ? {} : { priority }),
    },
  });
  res.json({
    id: updated.id,
    content: updated.content,
    priority: updated.priority,
    status: updated.status,
  });
});

app.patch('/api/elders/:elderId', async (req, res) => {
  const body = req.body as Partial<{
    name: string;
    age: number;
    address: string;
    contactNumber: string;
    livingStatus: string;
    chronicDiseases: string[];
    tags: string[];
  }>;
  const updated = await prisma.elder.update({
    where: { id: req.params.elderId },
    data: {
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.age === undefined ? {} : { age: Number(body.age) }),
      ...(body.address === undefined ? {} : { address: body.address }),
      ...(body.contactNumber === undefined ? {} : { contactNumber: body.contactNumber }),
      ...(body.livingStatus === undefined ? {} : { livingStatus: body.livingStatus }),
      ...(body.chronicDiseases === undefined ? {} : { chronicDiseases: body.chronicDiseases }),
      ...(body.tags === undefined
        ? {}
        : {
            tags: {
              deleteMany: {},
              create: body.tags.map((tag, index) => ({ id: `${req.params.elderId}-tag-${Date.now()}-${index}`, tag })),
            },
          }),
    },
    include: { tags: true },
  });
  res.json(mapElder(updated));
});

app.patch('/api/sessions/:sessionId', async (req, res) => {
  const body = req.body as Partial<{ date: string; duration: number; report: string }>;
  const updated = await prisma.session.update({
    where: { id: req.params.sessionId },
    data: {
      ...(body.date === undefined ? {} : { date: new Date(body.date) }),
      ...(body.duration === undefined ? {} : { duration: Number(body.duration) }),
      ...(body.report === undefined ? {} : { report: body.report }),
    },
    include: fullSessionInclude,
  });
  res.json(mapSession(updated));
});

app.patch('/api/sessions/:sessionId/transcript/:segmentId', async (req, res) => {
  const body = req.body as Partial<{ text: string; risk: RiskLevel }>;
  const updated = await prisma.transcriptSegment.update({
    where: { id: req.params.segmentId },
    data: {
      ...(body.text === undefined ? {} : { text: body.text }),
      ...(body.risk === undefined ? {} : { risk: body.risk }),
    },
  });
  res.json(updated);
});

app.patch('/api/sessions/:sessionId/insights/:blockId', async (req, res) => {
  const body = req.body as Partial<{ title: string; summary: string; risk: RiskLevel }>;
  const updated = await prisma.insightBlock.update({
    where: { id: req.params.blockId },
    data: {
      ...(body.title === undefined ? {} : { title: body.title }),
      ...(body.summary === undefined ? {} : { summary: body.summary }),
      ...(body.risk === undefined ? {} : { risk: body.risk }),
    },
  });
  res.json(updated);
});

app.patch('/api/sessions/:sessionId/body-findings/:findingId', async (req, res) => {
  const body = req.body as Partial<{ label: string; status: BodyFindingStatus; risk: RiskLevel; viewSide: BodyViewSide }>;
  const updated = await prisma.bodyFinding.update({
    where: { id: req.params.findingId },
    data: {
      ...(body.label === undefined ? {} : { label: body.label }),
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.risk === undefined ? {} : { risk: body.risk }),
      ...(body.viewSide === undefined ? {} : { viewSide: body.viewSide }),
    },
  });
  res.json(updated);
});

app.patch('/api/sessions/:sessionId/warnings/:warningIndex', async (req, res) => {
  const index = Number(req.params.warningIndex);
  const content = String(req.body.content ?? '').trim();
  if (!Number.isFinite(index) || index < 0) return res.status(400).json({ message: 'warningIndex invalid' });
  const warnings = await prisma.warning.findMany({
    where: { sessionId: req.params.sessionId },
    orderBy: { order: 'asc' },
  });
  const target = warnings[index];
  if (!target) return res.status(404).json({ message: 'Warning not found' });
  const updated = await prisma.warning.update({
    where: { id: target.id },
    data: { content },
  });
  res.json(updated);
});

app.get('/api/community/body-heatmap', async (_req, res) => {
  const showDemo = includeDemo(_req.query.includeDemo);
  const elders = await prisma.elder.count({ where: showDemo ? undefined : { ifDemo: false } });
  const findings = await prisma.bodyFinding.findMany({
    where: showDemo ? undefined : { session: { ifDemo: false } },
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
  const showDemo = includeDemo(_req.query.includeDemo);
  const elders = await prisma.elder.count({ where: showDemo ? undefined : { ifDemo: false } });
  const findings = await prisma.bodyFinding.findMany({
    where: showDemo ? undefined : { session: { ifDemo: false } },
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

app.post('/api/transcribe', async (_req, res) => {
  res.json({ text: '实时转写接口占位：请接入粤语 ASR 服务。' });
});

app.post('/api/extract', async (req, res) => {
  const sessionId = String(req.body.sessionId ?? '');
  if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: fullSessionInclude,
  });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  const mapped = mapSession(session);
  return res.json(mapped.extractResult ?? null);
});

app.post('/api/report', async (req, res) => {
  const extract = req.body.extract as {
    medication?: { summary?: string };
    symptoms?: Array<{ description?: string }>;
    emotion?: { summary?: string };
    action_items?: Array<{ content?: string }>;
  };
  const report = [
    '自动生成报告（DB）',
    '',
    `用药：${extract?.medication?.summary ?? '暂无'}`,
    `症状：${(extract?.symptoms ?? []).map((item) => item.description).filter(Boolean).join('；') || '暂无'}`,
    `情绪：${extract?.emotion?.summary ?? '暂无'}`,
    `建议：${(extract?.action_items ?? []).map((i) => i.content).filter(Boolean).join('；') || '暂无'}`,
  ].join('\n');
  return res.json(report);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
