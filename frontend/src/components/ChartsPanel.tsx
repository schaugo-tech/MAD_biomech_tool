import ReactECharts from 'echarts-for-react'
import type { RecommendV1Response } from '../types'
import PanelCard from './PanelCard'

type Props = { data?: RecommendV1Response }

export default function ChartsPanel({ data }: Props) {
  if (!data) return <PanelCard title="图表区"><div className="compact-note">请先点击“更新推荐”。</div></PanelCard>

  const utility = data.charts.heatmaps.utility
  const limits = data.charts.heatmaps.limit_factor
  const mpCurve = data.charts.curves.fix_vo_vary_mp
  const voCurve = data.charts.curves.fix_mp_vary_vo

  const baseHeat = (title: string, rows: [number, number, number][], max: number, min: number, text: [string, string]) => ({
    title: { text: title, left: 10, top: 2, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    grid: { left: 62, right: 24, top: 66, bottom: 46 },
    xAxis: { type: 'category', name: 'MP %', data: [...new Set(rows.map((r) => r[0]))] },
    yAxis: { type: 'category', name: 'VO mm', data: [...new Set(rows.map((r) => r[1]))] },
    visualMap: { min, max, orient: 'horizontal', left: 'center', bottom: 2, text, calculable: true, textStyle: { color: '#cfd7f4' } },
    tooltip: { formatter: (p: any) => `MP ${p.value[0]}%<br/>VO ${p.value[1]} mm<br/>值 ${Number(p.value[2]).toFixed(3)}` },
    series: [{ type: 'heatmap', data: rows }],
    backgroundColor: 'transparent',
  })

  const curveOption = (title: string, xName: string, points: { mp: number; vo: number; utility: number; r_tmj: number; r_pdl: number }[], xField: 'mp' | 'vo') => ({
    title: { text: title, left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    legend: { top: 8, right: 10, textStyle: { color: '#dfe6ff' } },
    grid: { left: 56, right: 24, top: 44, bottom: 44 },
    xAxis: { type: 'value', name: xName },
    yAxis: { type: 'value', name: '值' },
    series: [
      { name: '综合得分', type: 'line', smooth: true, data: points.map((p) => [p[xField], p.utility]) },
      { name: 'TMJ风险', type: 'line', smooth: true, data: points.map((p) => [p[xField], p.r_tmj]) },
      { name: 'PDL风险', type: 'line', smooth: true, data: points.map((p) => [p[xField], p.r_pdl]) },
    ],
    backgroundColor: 'transparent',
  })

  const radarIndicators = Object.keys(data.charts.radar[0]?.values ?? {}).map((k) => ({ name: k, max: 1 }))
  const radarOption = {
    title: { text: '推荐点 vs 备选点（雷达）', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    tooltip: {},
    legend: { top: 8, right: 10, textStyle: { color: '#dfe6ff' } },
    radar: { indicator: radarIndicators },
    series: [{ type: 'radar', data: data.charts.radar.map((r) => ({ name: r.name, value: Object.values(r.values) })) }],
    backgroundColor: 'transparent',
  }

  return (
    <div className="chart-grid">
      <PanelCard title="主决策热力图"><ReactECharts option={baseHeat('Utility', utility, Math.max(...utility.map((d) => d[2])), Math.min(...utility.map((d) => d[2])), ['高', '低'])} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="限制因子热力图"><ReactECharts option={baseHeat('Limit Factor', limits, 2, 0, ['pdl', 'feasible'])} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="局部响应：固定 VO 看 MP"><ReactECharts option={curveOption('固定 VO 看 MP 变化', 'MP %', mpCurve as any, 'mp')} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="局部响应：固定 MP 看 VO"><ReactECharts option={curveOption('固定 MP 看 VO 变化', 'VO mm', voCurve as any, 'vo')} style={{ height: 320 }} /></PanelCard>
      <PanelCard title="雷达图"><ReactECharts option={radarOption} style={{ height: 320 }} /></PanelCard>
    </div>
  )
}
