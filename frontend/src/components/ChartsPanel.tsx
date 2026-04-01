import ReactECharts from 'echarts-for-react'
import type { RecommendV1Response } from '../types'
import PanelCard from './PanelCard'

type Props = { data?: RecommendV1Response }

const base3D = {
  grid3D: {
    boxWidth: 120,
    boxDepth: 90,
    viewControl: { projection: 'perspective' },
    light: { main: { intensity: 1.2 }, ambient: { intensity: 0.55 } },
  },
  xAxis3D: { type: 'value', name: 'MP(%)' },
  yAxis3D: { type: 'value', name: 'VO(mm)' },
}

export default function ChartsPanel({ data }: Props) {
  if (!data) return <PanelCard title="图表区"><div className="compact-note">请先点击“更新推荐”。</div></PanelCard>

  const surface3d = data.charts.surface3d

  const utility3d = data.option_templates?.utility_surface3d_option ?? {
    ...base3D,
    title: { text: '综合得分 3D 曲面', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    zAxis3D: { type: 'value', name: '综合得分' },
    series: [
      { type: 'surface', name: '综合得分', data: surface3d.utility, wireframe: { show: true } },
      { type: 'scatter3D', name: '推荐/备选', data: surface3d.recommend_points.utility, symbolSize: 11 },
    ],
    backgroundColor: 'transparent',
  }

  const tmj3d = data.option_templates?.tmj_surface3d_option ?? {
    ...base3D,
    title: { text: 'TMJ 风险 3D 曲面', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    zAxis3D: { type: 'value', name: 'TMJ 风险' },
    series: [
      { type: 'surface', name: 'TMJ 风险', data: surface3d.tmj, wireframe: { show: true } },
      { type: 'scatter3D', name: '推荐/备选', data: surface3d.recommend_points.tmj, symbolSize: 11 },
    ],
    backgroundColor: 'transparent',
  }

  const pdl3d = data.option_templates?.pdl_surface3d_option ?? {
    ...base3D,
    title: { text: '前牙 PDL 风险 3D 曲面', left: 10, top: 6, textStyle: { color: '#dfe6ff', fontSize: 14 } },
    zAxis3D: { type: 'value', name: '前牙 PDL 风险' },
    series: [
      { type: 'surface', name: '前牙 PDL 风险', data: surface3d.pdl, wireframe: { show: true } },
      { type: 'scatter3D', name: '推荐/备选', data: surface3d.recommend_points.pdl, symbolSize: 11 },
    ],
    backgroundColor: 'transparent',
  }

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
      <PanelCard title="综合得分 3D"><ReactECharts option={utility3d} style={{ height: 360 }} /></PanelCard>
      <PanelCard title="TMJ 风险 3D"><ReactECharts option={tmj3d} style={{ height: 360 }} /></PanelCard>
      <PanelCard title="前牙 PDL 风险 3D"><ReactECharts option={pdl3d} style={{ height: 360 }} /></PanelCard>
      <PanelCard title="雷达图"><ReactECharts option={radarOption} style={{ height: 320 }} /></PanelCard>
    </div>
  )
}
