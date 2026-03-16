import ReactECharts from 'echarts-for-react'
import type { AnalysisResponse, GridRecord } from '../types'
import PanelCard from './PanelCard'

type Props = {
  analysis?: AnalysisResponse
  selectedMp: number
  selectedVo: number
  onPickPoint: (mp: number, vo: number) => void
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b)
}

function matrixFromGrid(grid: GridRecord[], field: keyof GridRecord) {
  const mps = uniqueSorted(grid.map((d) => d.mp))
  const vos = uniqueSorted(grid.map((d) => d.vo))
  const matrix = grid.map((d) => [d.mp, d.vo, Number(d[field])])
  return { mps, vos, matrix }
}

export default function ChartsPanel({ analysis, selectedMp, selectedVo, onPickPoint }: Props) {
  if (!analysis) {
    return <PanelCard title="图表区"><div className="compact-note">请先点击“更新结果”。</div></PanelCard>
  }

  const { grid, selected, pareto_records } = analysis
  const scoreMap = matrixFromGrid(grid, 'overall_score')
  const tmjMap = matrixFromGrid(grid, 'tmj')
  const pdlMap = matrixFromGrid(grid, 'pdl_lower')

  const limitingFactorMap = {
    'OK': 0,
    '关节盘应力': 1,
    '下前牙PDL': 2,
    '上前牙PDL': 3,
    '前伸比例': 4,
    '开口量': 5,
  } as Record<string, number>

  const limitingData = grid.map((g) => [g.mp, g.vo, limitingFactorMap[g.limiting_factor.split(' / ')[0]] ?? 6])

  const handleClick = (params: any) => {
    if (Array.isArray(params?.value) && params.value.length >= 2) {
      onPickPoint(Number(params.value[0]), Number(params.value[1]))
    }
  }

  const baseHeatmap = (title: string, data: number[][], maxValue?: number, visualText?: [string, string]) => ({
    title: { text: title, left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    grid: { left: 48, right: 24, top: 42, bottom: 42 },
    xAxis: { type: 'category', data: scoreMap.mps, name: 'MP %', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    yAxis: { type: 'category', data: scoreMap.vos, name: 'VO mm', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    visualMap: {
      min: 0,
      max: maxValue ?? 1,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      text: visualText,
      calculable: true,
      textStyle: { color: '#cfd7f4' },
    },
    series: [{ type: 'heatmap', data, label: { show: true, formatter: (p: any) => Number(p.value[2]).toFixed(2), color: '#08111f', fontSize: 10 } }],
    backgroundColor: 'transparent'
  })

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '安全性', max: 1 },
        { name: '推进效率', max: 1 },
        { name: '舒适度', max: 1 },
        { name: '上下牙平衡', max: 1 },
      ],
      axisName: { color: '#dfe6ff' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.01)'] } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [selected.score_safety, selected.score_effectiveness, selected.score_comfort, selected.score_balance],
        name: '当前方案'
      }]
    }],
    backgroundColor: 'transparent'
  }

  const paretoOption = {
    title: { text: 'Pareto 风格散点图', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    grid: { left: 56, right: 20, top: 42, bottom: 46 },
    xAxis: { type: 'value', name: '治疗推进代理（MP %）', nameTextStyle: { color: '#cfd7f4' }, axisLabel: { color: '#cfd7f4' } },
    yAxis: { type: 'value', name: '安全代理（TMJ MPa）', nameTextStyle: { color: '#cfd7f4' }, axisLabel: { color: '#cfd7f4' } },
    visualMap: {
      min: 0,
      max: 1,
      dimension: 2,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      text: ['高分', '低分'],
      textStyle: { color: '#cfd7f4' },
    },
    series: [{
      type: 'scatter',
      symbolSize: (val: number[]) => 8 + val[2] * 16,
      data: pareto_records.map((d: any) => [d.effectiveness_proxy, d.tmj, d.overall_score, d.mp, d.vo]),
      encode: { tooltip: [0, 1, 2, 3, 4] }
    }],
    backgroundColor: 'transparent'
  }

  const trendOption = {
    title: { text: '单参数趋势图（固定 VO 为当前值）', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { top: 8, right: 10, textStyle: { color: '#dfe6ff' } },
    grid: { left: 56, right: 20, top: 42, bottom: 46 },
    xAxis: { type: 'category', data: scoreMap.mps, axisLabel: { color: '#cfd7f4' } },
    yAxis: { type: 'value', axisLabel: { color: '#cfd7f4' } },
    series: [
      { name: 'TMJ', type: 'line', smooth: true, data: grid.filter((g) => Math.abs(g.vo - selectedVo) < 1e-6).map((g) => [g.mp, g.tmj]) },
      { name: '下前牙 PDL', type: 'line', smooth: true, data: grid.filter((g) => Math.abs(g.vo - selectedVo) < 1e-6).map((g) => [g.mp, g.pdl_lower]) },
      { name: '综合评分', type: 'line', smooth: true, data: grid.filter((g) => Math.abs(g.vo - selectedVo) < 1e-6).map((g) => [g.mp, g.overall_score]) },
    ],
    backgroundColor: 'transparent'
  }

  return (
    <div className="chart-grid">
      <PanelCard title="整体评分热力图">
        <ReactECharts option={baseHeatmap('整体评分热力图', scoreMap.matrix, 1, ['高分', '低分'])} onEvents={{ click: handleClick }} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="限制因子地图">
        <ReactECharts option={baseHeatmap('限制因子地图', limitingData, 6, ['受限', 'OK'])} onEvents={{ click: handleClick }} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="TMJ 等值热力图">
        <ReactECharts option={baseHeatmap('TMJ 应力响应图', tmjMap.matrix, Math.max(...grid.map((d) => d.tmj)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="下前牙 PDL 等值热力图">
        <ReactECharts option={baseHeatmap('下前牙 PDL 响应图', pdlMap.matrix, Math.max(...grid.map((d) => d.pdl_lower)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="雷达图">
        <ReactECharts option={radarOption} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="Pareto 风格散点图">
        <ReactECharts option={paretoOption} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="单参数趋势图">
        <ReactECharts option={trendOption} style={{ height: 320 }} />
      </PanelCard>
      <PanelCard title="当前点数据">
        <div className="selected-table">
          <div>MP：{selectedMp.toFixed(1)}%</div>
          <div>VO：{selectedVo.toFixed(2)} mm</div>
          <div>TMJ：{selected.tmj.toFixed(2)} MPa</div>
          <div>下前牙 PDL：{selected.pdl_lower.toFixed(2)} kPa</div>
          <div>上前牙 PDL：{selected.pdl_upper.toFixed(2)} kPa</div>
          <div>综合评分：{selected.overall_score.toFixed(3)}</div>
          <div>限制因子：{selected.limiting_factor}</div>
          <div>可行性：{selected.is_feasible ? '可行' : '受限'}</div>
        </div>
      </PanelCard>
    </div>
  )
}
