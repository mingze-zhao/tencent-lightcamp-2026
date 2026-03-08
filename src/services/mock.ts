import { ElderProfile, ExtractResult, VisitSession } from '../types';

export const elders: ElderProfile[] = [
  {
    id: '1',
    name: '陈伯',
    age: 78,
    gender: 'M',
    address: '深水埗海丽邨',
    contactNumber: '23456789',
    livingStatus: '独居',
    chronicDiseases: ['高血压', '糖尿病'],
    emergencyContact: { name: '陈小明', relation: '儿子', phone: '98765432' },
    lastVisitDate: '2026-03-01',
    overallRisk: 'high',
  },
  {
    id: '2',
    name: '李婆婆',
    age: 82,
    gender: 'F',
    address: '观塘丽阁邨',
    contactNumber: '22334455',
    livingStatus: '与配偶同住',
    chronicDiseases: ['骨关节炎'],
    emergencyContact: { name: '王大文', relation: '女儿', phone: '91234567' },
    lastVisitDate: '2026-02-25',
    overallRisk: 'medium',
  },
  {
    id: '3',
    name: '张叔',
    age: 71,
    gender: 'M',
    address: '黄大仙竹园邨',
    contactNumber: '25667788',
    livingStatus: '与子女同住',
    chronicDiseases: ['慢阻肺', '高血压'],
    emergencyContact: { name: '张美玲', relation: '女儿', phone: '95552222' },
    lastVisitDate: '2026-03-05',
    overallRisk: 'low',
  },
];

export const mockSessions: Record<string, VisitSession[]> = {
  '1': [
    {
      id: 'session-1-1',
      elderId: '1',
      date: '2026-03-08',
      duration: 360,
      status: 'completed',
      transcript: [
        { id: '1', startTime: 0, endTime: 5, speaker: 'social_worker', text: '陈伯，今日点啊？身体有冇边度唔舒服？' },
        { id: '2', startTime: 5, endTime: 12, speaker: 'elder', text: '唉，都系咁啦，最近对脚成日肿，行路都觉得重。', risk: 'medium', keywords: ['脚肿'] },
        { id: '3', startTime: 12, endTime: 18, speaker: 'social_worker', text: '脚肿？有冇按时食降压药啊？' },
        { id: '4', startTime: 18, endTime: 25, speaker: 'elder', text: '降压药... 有时唔记得食，前两日好似停咗两日。', risk: 'high', keywords: ['停咗两日'] },
        { id: '5', startTime: 25, endTime: 30, speaker: 'social_worker', text: '咁唔得噶喎，药一定要日日食。' },
      ],
      extractResult: {
        medication: { summary: '有时忘记食降压药，近期停药2天。', risk: 'high' },
        symptoms: [{ description: '双下肢水肿明显，自觉行走沉重。', risk: 'medium' }],
        diet: { summary: '胃口一般。', risk: 'low' },
        emotion: { summary: '情绪平稳，少少叹气。', risk: 'low' },
        adl: { summary: '行动受水肿影响，但可自理。', risk: 'medium' },
        social_support: { summary: '独居，无提及子女探望。', risk: 'medium' },
        warnings: ['连续漏服降压药2天'],
        action_items: [
          { id: 'a1', content: '联系门诊医生确认降压药服用方案', status: 'pending', priority: 'high' },
          { id: 'a2', content: '跟进下肢水肿情况，建议转介物理治疗', status: 'pending', priority: 'medium' }
        ]
      },
      report: `访谈日期: 2026年3月8日\n\n个案陈伯今日在家接受访谈。身体方面，个案表示近期双下肢水肿明显，影响日常行走。在用药方面，发现个案依从性差，自述近两日未服用降压药，存在高风险。情绪大致平稳。建议社工尽快联系其家人及主诊医生跟进停药情况，并持续留意其下肢水肿。`
    }
  ],
  '2': [
    {
      id: 'session-2-1',
      elderId: '2',
      date: '2026-03-06',
      duration: 280,
      status: 'completed',
      transcript: [
        { id: '21', startTime: 0, endTime: 5, speaker: 'social_worker', text: '李婆婆，上次膝头痛而家点呀？' },
        { id: '22', startTime: 5, endTime: 12, speaker: 'elder', text: '都系痛，不过比之前好啲，行得慢。', risk: 'medium', keywords: ['膝头痛'] },
        { id: '23', startTime: 12, endTime: 20, speaker: 'social_worker', text: '止痛药有冇按时食？有冇胃痛？' },
        { id: '24', startTime: 20, endTime: 27, speaker: 'elder', text: '有食，偶尔会胃唔舒服。', risk: 'low' },
      ],
      extractResult: {
        medication: { summary: '止痛药依从性尚可。', risk: 'low' },
        symptoms: [{ description: '膝关节疼痛持续但较上次缓解。', risk: 'medium' }],
        diet: { summary: '饮食正常。', risk: 'low' },
        emotion: { summary: '情绪稳定。', risk: 'low' },
        adl: { summary: '步行速度较慢。', risk: 'medium' },
        social_support: { summary: '与配偶同住，家庭支持较好。', risk: 'low' },
        warnings: [],
        action_items: [{ id: 'b1', content: '观察胃部不适并提醒饭后服药', status: 'pending', priority: 'medium' }],
      },
      report: '李婆婆膝痛持续但有改善，建议继续药物及复查。',
    },
  ],
  '3': [
    {
      id: 'session-3-1',
      elderId: '3',
      date: '2026-03-05',
      duration: 300,
      status: 'completed',
      transcript: [
        { id: '31', startTime: 0, endTime: 5, speaker: 'social_worker', text: '张叔，最近气喘情况点样？' },
        { id: '32', startTime: 5, endTime: 12, speaker: 'elder', text: '楼梯行快就会喘，平时还好。', risk: 'medium', keywords: ['气喘'] },
        { id: '33', startTime: 12, endTime: 20, speaker: 'social_worker', text: '吸入药有冇每日用？' },
        { id: '34', startTime: 20, endTime: 27, speaker: 'elder', text: '有，女儿会提醒我。', risk: 'low' },
      ],
      extractResult: {
        medication: { summary: '吸入药使用规律。', risk: 'low' },
        symptoms: [{ description: '运动后气喘。', risk: 'medium' }],
        diet: { summary: '饮食规律。', risk: 'low' },
        emotion: { summary: '对康复有信心。', risk: 'low' },
        adl: { summary: '可自理，体力一般。', risk: 'low' },
        social_support: { summary: '与子女同住，照护充分。', risk: 'low' },
        warnings: [],
        action_items: [{ id: 'c1', content: '下次复诊前记录气喘触发场景', status: 'pending', priority: 'low' }],
      },
      report: '张叔总体稳定，建议继续家庭支持与呼吸训练。',
    },
  ],
};

export const MockService = {
  getElders: async () => {
    return new Promise<ElderProfile[]>(resolve => setTimeout(() => resolve(elders), 500));
  },
  getSession: async (elderId: string) => {
    return new Promise<VisitSession | null>(resolve => {
      setTimeout(() => {
        const sessions = mockSessions[elderId];
        resolve(sessions ? sessions[0] : null);
      }, 800);
    });
  },
  createElder: async (payload: Omit<ElderProfile, 'id'>) => {
    const created: ElderProfile = {
      ...payload,
      id: `elder-${Date.now()}`,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      overallRisk: 'low',
    };
    elders.unshift(created);
    return created;
  },
  updateActionItem: async (sessionId: string, itemId: string, checked: boolean) => {
    const allSessions = Object.values(mockSessions).flat();
    const session = allSessions.find((item) => item.id === sessionId);
    const extract = session?.extractResult;
    if (!extract) return null;
    extract.action_items = extract.action_items.map((item) =>
      item.id === itemId ? { ...item, status: checked ? 'completed' : 'pending' } : item
    );
    return extract.action_items.find((item) => item.id === itemId) ?? null;
  },
  transcribeAudio: async () => {
    return new Promise<{ text: string }>((resolve) => {
      setTimeout(() => {
        resolve({ text: mockSessions['1'][0].transcript.map((s) => s.text).join('\n') });
      }, 1000);
    });
  },
  extractInsights: async (session: VisitSession) => {
    return new Promise<ExtractResult>((resolve, reject) => {
      setTimeout(() => {
        if (!session.extractResult) {
          reject(new Error('当前会话缺少结构化抽取结果'));
          return;
        }
        resolve(session.extractResult);
      }, 900);
    });
  },
  generateReport: async (extract: ExtractResult) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(
          `自动生成报告（Mock）\n\n用药：${extract.medication.summary}\n症状：${extract.symptoms
            .map((item) => item.description)
            .join('；')}\n情绪：${extract.emotion.summary}\n建议：${extract.action_items.map((i) => i.content).join('；')}`
        );
      }, 700);
    });
  },
};
