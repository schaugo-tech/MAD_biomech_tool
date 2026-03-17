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

function denseMatrix(grid: GridRecord[], field: keyof GridRecord) {
  const mps = uniqueSorted(grid.map((d) => d.mp))
  const vos = uniqueSorted(grid.map((d) => d.vo))
  const lookup = new Map(grid.map((d) => [`${d.mp}_${d.vo}`, Number(d[field])]))
  const matrix: number[][] = []
  for (let y = 0; y < vos.length; y += 1) {
    for (let x = 0; x < mps.length; x += 1) {
      const val = lookup.get(`${mps[x]}_${vos[y]}`)
      matrix.push([x, y, val ?? 0])
    }
  }
  return { mps, vos, matrix }
}

export default function ChartsPanel({ analysis, selectedMp, selectedVo, onPickPoint }: Props) {
  if (!analysis) return <PanelCard title="图表区"><div className="compact-note">请先点击“更新结果”。</div></PanelCard>

  const { grid, selected, raw_records } = analysis
  const scoreMap = denseMatrix(grid, 'overall_score')
  const tmjMap = denseMatrix(grid, 'tmj')
  const pdlMap = denseMatrix(grid, 'pdl_lower')
  const topRows = [...grid].sort((a, b) => b.overall_score - a.overall_score).slice(0, 10)

  const limitingFactorMap = { OK: 0, 关节盘应力: 1, 下前牙PDL: 2, 上前牙PDL: 3, 前伸比例: 4, 开口量: 5 } as Record<string, number>
  const limitLookup = new Map(grid.map((g) => [`${g.mp}_${g.vo}`, limitingFactorMap[g.limiting_factor.split(' / ')[0]] ?? 6]))
  const limitingData: number[][] = []
  for (let y = 0; y < scoreMap.vos.length; y += 1) {
    for (let x = 0; x < scoreMap.mps.length; x += 1) {
      limitingData.push([x, y, limitLookup.get(`${scoreMap.mps[x]}_${scoreMap.vos[y]}`) ?? 0])
    }
  }

  const decodePoint = (x: number, y: number) => [scoreMap.mps[x], scoreMap.vos[y]]
  const handleClick = (params: any) => {
    if (!Array.isArray(params?.value)) return
    const [x, y] = params.value
    const [mp, vo] = decodePoint(Number(x), Number(y))
    if (mp != null && vo != null) onPickPoint(mp, vo)
  }

  const baseHeatmap = (title: string, data: number[][], maxValue: number, minValue = 0, visualText?: [string, string]) => ({
    title: { text: title, left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const [x, y, v] = p.value
        const mp = scoreMap.mps[x]
        const vo = scoreMap.vos[y]
        return `MP ${mp}%<br/>VO ${vo} mm<br/>值 ${Number(v).toFixed(3)}`
      },
    },
    grid: { left: 54, right: 24, top: 44, bottom: 46 },
    xAxis: { type: 'category', data: scoreMap.mps, name: 'MP %', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    yAxis: { type: 'category', data: scoreMap.vos, name: 'VO mm', axisLabel: { color: '#cfd7f4' }, nameTextStyle: { color: '#cfd7f4' } },
    visualMap: { min: minValue, max: maxValue, orient: 'horizontal', left: 'center', bottom: 2, text: visualText, calculable: true, textStyle: { color: '#cfd7f4' } },
    series: [{ type: 'heatmap', data, label: { show: true, formatter: (p: any) => Number(p.value[2]).toFixed(2), color: '#08111f', fontSize: 9 } }],
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

  return (
    <div className="chart-grid">
      <PanelCard title="整体评分热力图"><ReactECharts option={baseHeatmap('整体评分热力图', scoreMap.matrix, 1, 0, ['高分', '低分'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="限制因子地图"><ReactECharts option={baseHeatmap('限制因子地图', limitingData, 6, 0, ['受限', 'OK'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="TMJ 应力响应图"><ReactECharts option={baseHeatmap('TMJ 应力响应图', tmjMap.matrix, Math.max(...grid.map((d) => d.tmj)), Math.min(...grid.map((d) => d.tmj)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="下前牙 PDL 等值热力图"><ReactECharts option={baseHeatmap('下前牙 PDL 响应图', pdlMap.matrix, Math.max(...grid.map((d) => d.pdl_lower)), Math.min(...grid.map((d) => d.pdl_lower)), ['高', '低'])} onEvents={{ click: handleClick }} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="3D 响应面：综合评分"><Surface3DChart grid={grid} field="overall_score" title="Overall score surface" /></PanelCard>
      <PanelCard title="3D 响应面：TMJ"><Surface3DChart grid={grid} field="tmj" title="TMJ stress surface" /></PanelCard>
      <PanelCard title="原始实验点-拟合对比"><ReactECharts option={fitVsRawOption} style={{ height: 320 }} /></PanelCard>

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
