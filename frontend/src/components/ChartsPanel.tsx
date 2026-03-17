import ReactECharts from 'echarts-for-react'
import type { AnalysisResponse, GridRecord } from '../types'
import PanelCard from './PanelCard'
import Surface3DChart from './Surface3DChart'

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
  if (!analysis) return <PanelCard title="图表区"><div className="compact-note">请先点击“更新结果”。</div></PanelCard>

  const { grid, selected, raw_records } = analysis
  const scoreMap = matrixFromGrid(grid, 'overall_score')
  const tmjMap = matrixFromGrid(grid, 'tmj')
  const pdlMap = matrixFromGrid(grid, 'pdl_lower')

  const topRows = [...grid].sort((a, b) => b.overall_score - a.overall_score).slice(0, 10)

  const limitingFactorMap = { OK: 0, 关节盘应力: 1, 下前牙PDL: 2, 上前牙PDL: 3, 前伸比例: 4, 开口量: 5 } as Record<string, number>
  const limitingData = grid.map((g) => [g.mp, g.vo, limitingFactorMap[g.limiting_factor.split(' / ')[0]] ?? 6])

  const handleClick = (params: any) => {
    if (Array.isArray(params?.value) && params.value.length >= 2) onPickPoint(Number(params.value[0]), Number(params.value[1]))
  }

  const baseHeatmap = (title: string, data: number[][], maxValue?: number, visualText?: [string, string]) => ({
    title: { text: title, left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    grid: { left: 48, right: 24, top: 42, bottom: 42 },
    xAxis: { type: 'category', data: scoreMap.mps, name: 'MP %', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    yAxis: { type: 'category', data: scoreMap.vos, name: 'VO mm', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    visualMap: { min: 0, max: maxValue ?? 1, orient: 'horizontal', left: 'center', bottom: 0, text: visualText, calculable: true, textStyle: { color: '#cfd7f4' } },
    series: [{ type: 'heatmap', data, label: { show: true, formatter: (p: any) => Number(p.value[2]).toFixed(2), color: '#08111f', fontSize: 10 } }],
    backgroundColor: 'transparent',
  })

  const fitVsRawOption = {
    title: { text: '原始实验点 vs 拟合面（TMJ）', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { top: 8, right: 10, textStyle: { color: '#dfe6ff' } },
    grid: { left: 56, right: 20, top: 42, bottom: 42 },
    xAxis: { type: 'value', name: 'MP %', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    yAxis: { type: 'value', name: 'TMJ MPa', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    series: [
      { name: '原始实验', type: 'scatter', symbolSize: 11, data: raw_records.map((r: any) => [r.mp, r.tmj]) },
      { name: '拟合网格', type: 'line', smooth: true, showSymbol: false, data: grid.filter((g) => Math.abs(g.vo - selectedVo) < 1e-6).map((g) => [g.mp, g.tmj]) },
    ],
    backgroundColor: 'transparent',
  }

  const parallelOption = {
    title: { text: '多指标平行坐标', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    parallelAxis: [
      { dim: 0, name: 'MP' },
      { dim: 1, name: 'VO' },
      { dim: 2, name: 'TMJ' },
      { dim: 3, name: 'PDL-L' },
      { dim: 4, name: 'PDL-U' },
      { dim: 5, name: 'Score' },
    ],
    parallel: { left: 45, right: 35, top: 46, bottom: 20, axisExpandable: true, axisLine: { lineStyle: { color: '#9fb0d4' } }, axisLabel: { color: '#cfd7f4' } },
    series: [{ type: 'parallel', lineStyle: { width: 1, opacity: 0.5 }, data: topRows.map((r) => [r.mp, r.vo, r.tmj, r.pdl_lower, r.pdl_upper, r.overall_score]) }],
    backgroundColor: 'transparent',
  }

  return (
    <div className="chart-grid">
      <PanelCard title="整体得分总览图"><ReactECharts option={baseHeatmap('整体评分热力图', scoreMap.matrix, 1, ['高分', '低分'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="限制因子地图"><ReactECharts option={baseHeatmap('限制因子地图', limitingData, 6, ['受限', 'OK'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="TMJ 等值热力图"><ReactECharts option={baseHeatmap('TMJ 应力响应图', tmjMap.matrix, Math.max(...grid.map((d) => d.tmj)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="下前牙 PDL 等值热力图"><ReactECharts option={baseHeatmap('下前牙 PDL 响应图', pdlMap.matrix, Math.max(...grid.map((d) => d.pdl_lower)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>

      <PanelCard title="3D 响应面：综合评分"><Surface3DChart grid={grid} field="overall_score" title="Overall score surface" /></PanelCard>
      <PanelCard title="3D 响应面：TMJ"><Surface3DChart grid={grid} field="tmj" title="TMJ stress surface" /></PanelCard>

      <PanelCard title="原始实验点-拟合对比"><ReactECharts option={fitVsRawOption} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="平行坐标（Top 10）"><ReactECharts option={parallelOption} style={{ height: 320 }} /></PanelCard>

      <PanelCard title="候选数据表（Top 10）">
        <div className="table-scroll">
          <table className="result-table">
            <thead><tr><th>#</th><th>MP%</th><th>VO(mm)</th><th>评分</th><th>TMJ</th><th>PDL下</th><th>PDL上</th><th>限制因子</th></tr></thead>
            <tbody>{topRows.map((r, idx) => <tr key={`${r.mp}-${r.vo}-${idx}`}><td>{idx + 1}</td><td>{r.mp.toFixed(1)}</td><td>{r.vo.toFixed(2)}</td><td>{r.overall_score.toFixed(3)}</td><td>{r.tmj.toFixed(2)}</td><td>{r.pdl_lower.toFixed(2)}</td><td>{r.pdl_upper.toFixed(2)}</td><td>{r.limiting_factor}</td></tr>)}</tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard title="当前点数据">
        <div className="selected-table">
          <div>MP：{selectedMp.toFixed(1)}%</div><div>VO：{selectedVo.toFixed(2)} mm</div>
          <div>TMJ：{selected.tmj.toFixed(2)} MPa</div><div>下前牙 PDL：{selected.pdl_lower.toFixed(2)} kPa</div>
          <div>上前牙 PDL：{selected.pdl_upper.toFixed(2)} kPa</div><div>综合评分：{selected.overall_score.toFixed(3)}</div>
          <div>限制因子：{selected.limiting_factor}</div><div>可行性：{selected.is_feasible ? '可行' : '受限'}</div>
        </div>
      </PanelCard>
    </div>
  )
}
