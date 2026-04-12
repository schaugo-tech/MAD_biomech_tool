import ReactECharts from 'echarts-for-react'
import type { RecommendV1Response } from '../types'
import PanelCard from './PanelCard'

type Props = {
  data?: RecommendV1Response
  selectedMp?: number
  selectedVo?: number
}

type Triple = [number, number, number]

const chartTheme = {
  axisText: '#dbe7ff',
  axisLine: '#93a6cb',
  splitLine: 'rgba(152,175,214,0.26)',
  background: 'transparent',
}

function estimateZ(surface: Triple[], mp: number, vo: number): number {
  const exact = surface.find((d) => Math.abs(d[0] - mp) < 1e-6 && Math.abs(d[1] - vo) < 1e-6)
  if (exact) return exact[2]

  const nearest = [...surface]
    .sort((a, b) => ((a[0] - mp) ** 2 + (a[1] - vo) ** 2) - ((b[0] - mp) ** 2 + (b[1] - vo) ** 2))
    .slice(0, 6)

  let num = 0
  let den = 0
  nearest.forEach((p) => {
    const dist = Math.sqrt((p[0] - mp) ** 2 + (p[1] - vo) ** 2)
    const w = 1 / Math.max(dist, 1e-6)
    num += w * p[2]
    den += w
  })
  return den > 0 ? num / den : 0
}

function buildSurfaceOption(title: string, zName: string, data: Triple[], selected: Triple) {
  const zValues = data.map((d) => d[2])
  const zMin = Math.min(...zValues)
  const zMax = Math.max(...zValues)

  return {
    title: { text: title, left: 8, top: 4, textStyle: { color: '#e5eeff', fontSize: 14, fontWeight: 600 } },
    tooltip: {
      formatter: (p: any) => {
        const value: Triple = p.value ?? p.data?.value ?? [0, 0, 0]
        return `MP: ${Number(value[0]).toFixed(1)}%<br/>VO: ${Number(value[1]).toFixed(2)} mm<br/>${zName}: ${Number(value[2]).toFixed(4)}`
      },
    },
    visualMap: {
      show: true,
      min: zMin,
      max: zMax,
      calculable: true,
      orient: 'vertical',
      right: 8,
      top: 40,
      textStyle: { color: chartTheme.axisText },
      inRange: {
        color: ['#224f9b', '#2d8cff', '#3bd2ff', '#8bf094', '#f6d24f'],
      },
    },
    xAxis3D: {
      type: 'value',
      name: 'MP(%)',
      axisLabel: { color: chartTheme.axisText },
      nameTextStyle: { color: chartTheme.axisText },
      axisLine: { lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
    },
    yAxis3D: {
      type: 'value',
      name: 'VO(mm)',
      axisLabel: { color: chartTheme.axisText },
      nameTextStyle: { color: chartTheme.axisText },
      axisLine: { lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
    },
    zAxis3D: {
      type: 'value',
      name: zName,
      axisLabel: { color: chartTheme.axisText },
      nameTextStyle: { color: chartTheme.axisText },
      axisLine: { lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
    },
    grid3D: {
      boxWidth: 120,
      boxDepth: 95,
      boxHeight: 75,
      environment: chartTheme.background,
      axisPointer: { show: true, lineStyle: { color: '#ffffff' } },
      viewControl: {
        projection: 'orthographic',
        alpha: 22,
        beta: 45,
        distance: 180,
        rotateSensitivity: 0,
        zoomSensitivity: 0,
        panSensitivity: 0,
        autoRotate: false,
      },
      light: {
        main: { intensity: 1.05, shadow: false },
        ambient: { intensity: 0.55 },
      },
    },
    series: [
      {
        type: 'surface',
        name: title,
        data,
        wireframe: { show: false },
        shading: 'lambert',
        itemStyle: { opacity: 0.96 },
      },
      {
        type: 'scatter3D',
        name: '当前选择点',
        data: [selected],
        symbol: 'diamond',
        symbolSize: 15,
        itemStyle: { color: '#ff5f6d', borderColor: '#fff', borderWidth: 1.4 },
        label: {
          show: true,
          formatter: '当前选择',
          color: '#ffe8ec',
          backgroundColor: 'rgba(0,0,0,0.45)',
          padding: [2, 6],
          borderRadius: 3,
        },
      },
    ],
  }
}

export default function ChartsPanel({ data, selectedMp, selectedVo }: Props) {
  if (!data) return <PanelCard title="图表区"><div className="compact-note">请先点击“更新推荐”。</div></PanelCard>

  const surface3d = data.charts.surface3d
  const currentMp = selectedMp ?? data.best.mp
  const currentVo = selectedVo ?? data.best.vo

  const selectedUtility: Triple = [currentMp, currentVo, estimateZ(surface3d.utility, currentMp, currentVo)]
  const selectedTmj: Triple = [currentMp, currentVo, estimateZ(surface3d.tmj, currentMp, currentVo)]
  const selectedPdl: Triple = [currentMp, currentVo, estimateZ(surface3d.pdl, currentMp, currentVo)]

  const utility3d = buildSurfaceOption('综合得分 3D 拟合曲面', '综合得分', surface3d.utility, selectedUtility)
  const tmj3d = buildSurfaceOption('TMJ 风险 3D 拟合曲面', 'TMJ 风险', surface3d.tmj, selectedTmj)
  const pdl3d = buildSurfaceOption('前牙 PDL 风险 3D 拟合曲面', '前牙 PDL 风险', surface3d.pdl, selectedPdl)

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
      <PanelCard title="综合得分 3D"><ReactECharts option={utility3d} style={{ height: 380 }} /></PanelCard>
      <PanelCard title="TMJ 风险 3D"><ReactECharts option={tmj3d} style={{ height: 380 }} /></PanelCard>
      <PanelCard title="前牙 PDL 风险 3D"><ReactECharts option={pdl3d} style={{ height: 380 }} /></PanelCard>
      <PanelCard title="雷达图"><ReactECharts option={radarOption} style={{ height: 320 }} /></PanelCard>
    </div>
  )
}
