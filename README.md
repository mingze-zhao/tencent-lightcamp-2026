# 家访秒记 · 社工智能助手

**2026 LIGHT 创造营（港澳站）** — 香港长者慢性病管理 · 社工智能助手 Demo

---

## 项目简介

「家访秒记」面向香港社工人群，解决家访后撰写长篇健康跟进报告的效率痛点。社工在家访时录音，系统将粤语对话转写为文字，并自动抽取**用药情况、身体症状、情绪状态**等关键信息，一键生成符合社福机构格式的结构化报告与风险预警，让社工把时间用在服务长者而非文书上。

- **左侧**：家访录音转写文本，支持说话人区分与风险关键词高亮（编辑器式呈现）。
- **右侧**：结构化洞察看板 — 用药 / 症状 / 情绪 / 社交等维度卡片、高风险预警、待跟进事项与报告预览。

本仓库现在包含 **前端 + Node API + Prisma + SQLite**，统一数据库存储；演示数据通过 `if_demo` 字段标记，并由 `includeDemo` 查询参数控制是否展示。

## 当前可用交互范围（已升级）

- 左侧支持**长者档案二级目录**（长者 -> 多次采访）、**采访日历高亮**（有采访日期才高亮）、**标签 + 姓名搜索**。
- 转写区支持**短语级高亮**（sourceRef），不是整句高亮；点击左侧短语可定位右侧结构化块，点击右侧 sourceRef 可反向定位左侧。
- 右侧支持**生成式结构化块**（每块带原文引用）、高风险预警、待办、报告预览。
- 新增**人体问题图 + 时间线拖动**，可切换不同采访日查看部位状态（新发/持续/痊愈）。
- 新增**社区统计页**，展示全社区长者的部位热力分布与共性问题排名。
- 支持 `Ctrl/Cmd + K` 聚焦长者搜索、`Ctrl/Cmd + ,` 打开设置、转录区聚焦后按 `Space` 录音开关。
- 设置页支持**显示演示数据（if_demo）**开关与 API 地址配置。
- 工作台新增**编辑模式**：进入后可直接修改长者标签、转录文本、右侧结构化内容，并自动保存到数据库。
- 转录右上角支持**真实导出**（`Export as TXT` / `Export as JSON`）。
- 编辑保存升级为**字段级乐观更新**：失败仅回滚当前字段，并给出字段路径提示。
- 右侧结构化信息支持**新增/删除全覆盖**：warning / insight block / action item / body finding / dimension summary。
- 转录区支持**长按句子 Quick Add**，可把该句（或选中文本）直接绑定为 sourceRef 并新增结构化条目。
- 顶部新增**人员档案**页签，支持单人跨时间全量档案查看（时间轴 + 对比会话 + 正反人体图同屏 + 全量结构化 + 原始稿历史）。

---

## 技术栈

| 类别     | 技术 |
|----------|------|
| 框架     | React 19 + TypeScript |
| 构建     | Vite 7 |
| 样式     | Tailwind CSS 4 |
| 动效     | Framer Motion |
| 图标     | Lucide React |

---

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

### 启动数据库后端（实机模式）

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 生成 Prisma Client + 执行迁移 + 灌入 seed
npx prisma migrate dev --name init

# 启动 API（默认 http://localhost:8787）
npm run dev
```

前端设置里将 `API Base URL` 设为 `http://localhost:8787`。若关闭“显示演示数据（if_demo）”，将仅展示真实业务数据。

---

## 项目结构（简要）

```
src/
├── app/              # 应用壳与布局
├── features/         # 按功能划分
│   ├── cases/        # 长者列表与个案切换
│   ├── transcript/   # 转写区（短语级高亮、增量生成入口）
│   ├── insights/     # 结构化看板、人体图、时间线
│   ├── stats/        # 社区统计热力图页面
│   └── profiles/     # 人员档案页（跨时间完整档案）
├── services/         # 数据层（Mock / API 适配）
├── data/demo/        # 演示 JSON 数据（便于 Agent 写入）
├── types/            # TypeScript 类型契约
├── index.css         # 全局样式
└── main.tsx          # 入口
```

---

## 演示说明

- 当前默认读取数据库，演示数据以 `if_demo=true` 存在于同一库中。
- 关闭“显示演示数据（if_demo）”后，页面仅显示 `if_demo=false` 数据。
- 路演时可参考根目录 `demo-script.md` 中的场景与话术进行展示。

---

## 数据库字段说明（Prisma / SQLite）

核心表（与前后端字段对齐）：

- `elders`: 长者主档（基本信息、慢病、风险、最近家访日期、`if_demo`）
- `elder_tags`: 标签表（支持姓名/标签搜索）
- `sessions`: 家访会话（日期、时长、状态、报告、`if_demo`）
- `transcript_segments`: 转写分句
- `source_refs`: 短语级锚点（segment + char range）
- `session_dimensions`: medication/diet/emotion/adl/social_support 摘要
- `symptoms`: 症状项
- `insight_blocks` + `insight_block_source_refs`: 右侧结构化块及其原文引用
- `warnings` + `warning_source_refs`: 预警及引用
- `action_items` + `action_item_source_refs`: 跟进项及引用
- `body_findings` + `body_finding_source_refs`: 人体分区问题（front/back + new/ongoing/resolved）
- `appended_segment_logs`: 增量句子日志

数据库 schema 文件：`backend/prisma/schema.prisma`

---

## Agent 可写入 JSON 合约样例

以下样例可直接用于 `POST /api/ingest/json`（一次写入 elders + sessions）。

### elder 样例（含 `if_demo`）

```json
{
  "id": "elder-1001",
  "ifDemo": false,
  "name": "王婆婆",
  "age": 84,
  "gender": "F",
  "address": "深水埗",
  "contactNumber": "23334444",
  "livingStatus": "独居",
  "chronicDiseases": ["高血压"],
  "emergencyContact": { "name": "王小强", "relation": "儿子", "phone": "98887777" },
  "tags": ["独居", "高血压", "跌倒风险"],
  "lastVisitDate": "2026-03-08",
  "overallRisk": "medium"
}
```

### session + transcript + source_ref + insight_block + body_finding 样例（含 `if_demo`）

```json
{
  "id": "session-1001-1",
  "elderId": "elder-1001",
  "ifDemo": false,
  "date": "2026-03-08",
  "duration": 420,
  "status": "completed",
  "transcript": [
    { "id": "seg-1", "startTime": 0, "endTime": 6, "speaker": "elder", "text": "最近右脚肿，行得慢。", "risk": "medium" }
  ],
  "sourceRefs": [
    { "id": "sr-1001", "segmentId": "seg-1", "startChar": 2, "endChar": 10, "text": "右脚肿，行得慢" }
  ],
  "extractResult": {
    "medication": { "summary": "按时服药。", "risk": "low" },
    "symptoms": [{ "id": "sym-1", "description": "右下肢肿胀", "risk": "medium", "sourceSegmentIds": ["seg-1"] }],
    "diet": { "summary": "正常", "risk": "low" },
    "emotion": { "summary": "平稳", "risk": "low" },
    "adl": { "summary": "步行减慢", "risk": "medium", "sourceSegmentIds": ["seg-1"] },
    "social_support": { "summary": "偶有家属探访", "risk": "low" },
    "warnings": ["右下肢持续肿胀需跟进"],
    "warningSegmentIds": [["seg-1"]],
    "action_items": [
      { "id": "act-1", "content": "3天后复查水肿", "status": "pending", "priority": "medium", "sourceSegmentIds": ["seg-1"] }
    ],
    "insightBlocks": [
      { "id": "ib-1001", "title": "身体症状", "type": "symptom", "risk": "medium", "summary": "右下肢肿胀", "sourceRefIds": ["sr-1001"] }
    ]
  },
  "bodyMapSnapshot": {
    "sessionId": "session-1001-1",
    "date": "2026-03-08",
    "findings": [
      {
        "id": "bf-1001",
        "part": "right_leg",
        "viewSide": "front",
        "label": "下肢肿胀",
        "status": "ongoing",
        "risk": "medium",
        "sourceRefIds": ["sr-1001"]
      }
    ]
  },
  "report": "建议继续监测下肢肿胀并安排门诊复查。"
}
```

### `POST /api/ingest/json` 请求样例

```json
{
  "elders": [
    {
      "id": "elder-1001",
      "ifDemo": true,
      "name": "王婆婆",
      "age": 84,
      "gender": "F",
      "address": "深水埗",
      "contactNumber": "23334444",
      "livingStatus": "独居",
      "chronicDiseases": ["高血压"],
      "emergencyContact": { "name": "王小强", "relation": "儿子", "phone": "98887777" },
      "tags": ["独居", "高血压"],
      "lastVisitDate": "2026-03-08",
      "overallRisk": "medium"
    }
  ],
  "sessionsByElder": {
    "elder-1001": [
      {
        "id": "session-1001-1",
        "elderId": "elder-1001",
        "ifDemo": true,
        "date": "2026-03-08",
        "duration": 420,
        "status": "completed",
        "transcript": [{ "id": "seg-1", "startTime": 0, "endTime": 6, "speaker": "elder", "text": "最近右脚肿，行得慢。", "risk": "medium" }],
        "sourceRefs": [{ "id": "sr-1001", "segmentId": "seg-1", "startChar": 2, "endChar": 10, "text": "右脚肿，行得慢" }],
        "extractResult": {
          "medication": { "summary": "按时服药。", "risk": "low" },
          "symptoms": [{ "description": "右下肢肿胀", "risk": "medium", "sourceSegmentIds": ["seg-1"] }],
          "diet": { "summary": "正常", "risk": "low" },
          "emotion": { "summary": "平稳", "risk": "low" },
          "adl": { "summary": "步行减慢", "risk": "medium", "sourceSegmentIds": ["seg-1"] },
          "social_support": { "summary": "偶有家属探访", "risk": "low" },
          "warnings": [],
          "warningSegmentIds": [],
          "action_items": [],
          "insightBlocks": []
        },
        "bodyMapSnapshot": { "sessionId": "session-1001-1", "date": "2026-03-08", "findings": [] },
        "report": "示例报告"
      }
    ]
  }
}
```

### includeDemo 查询示例

```bash
# 展示所有数据（含 if_demo=true）
GET /api/elders?includeDemo=1

# 仅展示真实数据（if_demo=false）
GET /api/elders?includeDemo=0
GET /api/calendar?includeDemo=0
GET /api/community/body-heatmap?includeDemo=0
```

### 结构化新增/删除与 Quick Add 接口

```bash
# 新增 sourceRef（长按 Quick Add 使用）
POST /api/sessions/:sessionId/source-refs

# 结构化条目新增
POST /api/sessions/:sessionId/insights
POST /api/sessions/:sessionId/warnings
POST /api/sessions/:sessionId/action-items
POST /api/sessions/:sessionId/body-findings
POST /api/sessions/:sessionId/dimensions

# 结构化条目删除
DELETE /api/sessions/:sessionId/insights/:blockId
DELETE /api/sessions/:sessionId/warnings/:warningIndex
DELETE /api/sessions/:sessionId/action-items/:itemId
DELETE /api/sessions/:sessionId/body-findings/:findingId
DELETE /api/sessions/:sessionId/dimensions/:dimensionId

# 人员档案查询增强
GET /api/elders/:elderId/sessions?view=summary
GET /api/sessions/:sessionId/full
```

## 数据流与 Prompt 文档

- 端到端数据流：`docs/dataflow.md`
- Agent / LLM Prompt 模板：`docs/agent-prompts.md`

---

## 许可证与赛事

本作品为 2026 LIGHT 创造营参赛项目，仅供评审与学习使用。
