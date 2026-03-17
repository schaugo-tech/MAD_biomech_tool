import { useEffect, useMemo, useState } from 'react'
import AnatomyScene from './components/AnatomyScene'
import ChartsPanel from './components/ChartsPanel'
import ControlPanel from './components/ControlPanel'
import InsightCard from './components/InsightCard'
import { analyzeStudy, exportReport, fetchMeta } from './utils/api'
import type { AnalysisResponse, ConstraintConfig, WeightConfig } from './types'

const defaultConstraints: ConstraintConfig = {
  tmj_max: 4.5,
  pdl_lower_max: 5.8,
  pdl_upper_max: 5.8,
  max_mp: 70,
  max_vo: 7,
}

const defaultWeights: WeightConfig = {
  safety: 0.45,
  effectiveness: 0.30,
  comfort: 0.15,
  balance: 0.10,
}

export default function App() {
  const [meta, setMeta] = useState<any>(null)
  const [selectedMp, setSelectedMp] = useState(60)
  const [selectedVo, setSelectedVo] = useState(5)
  const [constraints, setConstraints] = useState<ConstraintConfig>(defaultConstraints)
  const [weights, setWeights] = useState<WeightConfig>(defaultWeights)
  const [analysis, setAnalysis] = useState<AnalysisResponse | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMeta().then((data) => {
      setMeta(data)
      const defaults = data?.defaults
      if (defaults) {
        setSelectedMp(defaults.selected_mp)
        setSelectedVo(defaults.selected_vo)
        setConstraints(defaults.constraints)
        setWeights(defaults.weights)
      }
    })
  }, [])

  const normalizedWeights = useMemo(() => {
    const sum = weights.safety + weights.effectiveness + weights.comfort + weights.balance
    if (sum <= 0) return defaultWeights
    return {
      safety: weights.safety / sum,
      effectiveness: weights.effectiveness / sum,
      comfort: weights.comfort / sum,
      balance: weights.balance / sum,
    }
  }, [weights])

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const result = await analyzeStudy({
        constraints,
        weights: normalizedWeights,
        selected_mp: selectedMp,
        selected_vo: selectedVo,
        grid_step_mp: 1,
        grid_step_vo: 0.25,
      })
      setAnalysis(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = () => {
    setSelectedMp(60)
    setSelectedVo(5)
    setConstraints(defaultConstraints)
    setWeights(defaultWeights)
  }

  const onExport = async () => {
    if (!analysis) return
    const text = await exportReport(analysis)
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MAD_report_MP${selectedMp}_VO${selectedVo}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">apps.schaugo.com / 研究型工具原型</div>
          <h1>MAD 生物力学展示与决策工具</h1>
          <p>预置研究数据驱动的交互式工具：支持 3D 模型查看、MP/VO 调节、结果图联动、推荐方案输出、指标解释与基础报告导出。</p>
        </div>
        <div className="header-note">{meta?.study_name ?? '正在读取元信息...'}</div>
      </header>

      <main className="app-grid">
        <aside className="left-col">
          <ControlPanel
            selectedMp={selectedMp}
            selectedVo={selectedVo}
            constraints={constraints}
            weights={weights}
            loading={loading}
            onSelectedMpChange={setSelectedMp}
            onSelectedVoChange={setSelectedVo}
            onConstraintChange={(key, value) => setConstraints((prev) => ({ ...prev, [key]: value }))}
            onWeightChange={(key, value) => setWeights((prev) => ({ ...prev, [key]: value }))}
            onAnalyze={runAnalysis}
            onReset={reset}
          />
        </aside>

        <section className="center-col">
          <div className="scene-panel">
            <AnatomyScene selectedMp={selectedMp} selectedVo={selectedVo} />
          </div>
          <ChartsPanel analysis={analysis} selectedMp={selectedMp} selectedVo={selectedVo} onPickPoint={(mp, vo) => { setSelectedMp(mp); setSelectedVo(vo) }} />
        </section>

        <aside className="right-col">
          <InsightCard selected={analysis?.selected} candidates={analysis?.candidates ?? []} interpretation={analysis?.interpretation} onExport={onExport} />
        </aside>
      </main>
    </div>
  )
}
