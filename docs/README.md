# MAD 生物力学交互式工具 V1

这是一个轻量的前后端分离研究型工具骨架，面向下颌前移矫治器（MAD）参数设计与生物力学可视化。

当前版本特点：

- 前端：React + TypeScript + ECharts + react-three-fiber
- 后端：FastAPI + pandas + scikit-learn
- 数据源：`/backend/data/P491310E02_关节盘及牙齿应力数据V250225.xlsx`
- 图表层：支持热力图、限制因子地图、雷达图、Pareto 散点图、响应面等值图、趋势图
- 推荐逻辑：先约束、后评分，再输出最优点与备选点
- 3D：内置占位牙颌骨场景，可直接替换为真实 GLB 零件模型

## 目录结构

```text
mad_biomech_tool/
├── backend/
├── frontend/
├── docs/
└── README.md
```

## 快速启动

### 1) 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows 用 .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) 前端

```bash
cd frontend
npm install
npm run dev
```

默认前端地址：`http://localhost:5173`

## 模型素材替换

把你的 GLB 零件模型放到：

```text
frontend/public/models/
```

建议命名：

- `maxilla.glb`
- `mandible.glb`
- `teeth_upper.glb`
- `teeth_lower.glb`
- `tmj_left.glb`
- `tmj_right.glb`
- `mad.glb`

然后在 `frontend/src/components/AnatomyScene.tsx` 中把 `USE_PLACEHOLDER_MODELS` 改为 `false`。

## 当前推荐逻辑

当前版本不是临床定稿，而是“先看、再删改”的可运行骨架：

- 硬约束：TMJ、下前牙 PDL、上前牙 PDL 的安全阈值
- 软约束：MP 不宜过大、VO 有偏好区间
- 效率代理：以 MP 提升作为治疗推进代理项
- 综合评分：可在前端通过权重实时调整

## 导出

当前版本支持：

- 导出推荐报告为 Markdown
- 导出当前参数与关键图表说明

后续可以把报告导出升级为 PDF。
