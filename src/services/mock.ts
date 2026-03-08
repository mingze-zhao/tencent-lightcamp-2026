import { VisitSession, ElderProfile } from '../types';

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
  }
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
  ]
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
  }
};
