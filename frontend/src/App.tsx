import { useEffect, useMemo, useState } from 'react'
import AnatomyScene from './components/AnatomyScene'
import ChartsPanel from './components/ChartsPanel'
import ControlPanel from './components/ControlPanel'
import InsightCard from './components/InsightCard'
import { analyzeStudy, exportReport, fetchMeta } from './utils/api'
import type { AnalysisResponse, ConstraintConfig, FormulaConfig, WeightConfig } from './types'

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
  feasibility: 0.20,
  balance: 0.05,
}

const defaultFormulas: FormulaConfig = {
  mp_gain_gamma: 1.2,
  vo_gain_gamma: 1.1,
  safety_gamma: 1.35,
  tradeoff_strength: 0.30,
  risk_gamma: 1.5,
}

export default function App() {
  const [meta, setMeta] = useState<any>(null)
  const [selectedMp, setSelectedMp] = useState(60)
  const [selectedVo, setSelectedVo] = useState(5)
  const [constraints, setConstraints] = useState<ConstraintConfig>(defaultConstraints)
  const [weights, setWeights] = useState<WeightConfig>(defaultWeights)
  const [formulas, setFormulas] = useState<FormulaConfig>(defaultFormulas)
  const [analysis, setAnalysis] = useState<AnalysisResponse | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    fetchMeta()
      .then((data) => {
        setMeta(data)
        setMetaError(null)
        const defaults = data?.defaults
        if (defaults) {
          setSelectedMp(defaults.selected_mp)
          setSelectedVo(defaults.selected_vo)
          setConstraints(defaults.constraints)
          setWeights(defaults.weights)
          setFormulas(defaults.formulas ?? defaultFormulas)
        }
      })
      .catch((err) => {
        console.error(err)
        setMetaError('元信息读取失败，请确认后端 /api/study/meta 可访问。')
      })
  }, [])

  const normalizedWeights = useMemo(() => {
    const sum = weights.safety + weights.effectiveness + weights.feasibility + weights.balance
    if (sum <= 0) return defaultWeights
    return {
      safety: weights.safety / sum,
      effectiveness: weights.effectiveness / sum,
      feasibility: weights.feasibility / sum,
      balance: weights.balance / sum,
    }
  }, [weights])

  const runAnalysis = async () => {
    setLoading(true)
    setAnalysisError(null)
    try {
      const result = await analyzeStudy({
        constraints,
        weights: normalizedWeights,
        formulas,
        selected_mp: selectedMp,
        selected_vo: selectedVo,
        grid_step_mp: 1,
        grid_step_vo: 0.25,
      })
      setAnalysis(result)
    } catch (err) {
      console.error(err)
      setAnalysis(undefined)
      setAnalysisError('分析结果拉取失败，请确认后端 /api/study/analyze 正常。')
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
    setFormulas(defaultFormulas)
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
        <div className="header-note">
          <div>{meta?.study_name ?? '正在读取元信息...'}</div>
          {meta?.data_file ? <div className="header-sub">数据源：{meta.data_file}</div> : null}
          {meta?.fit_stats ? <div className="header-sub">拟合R²：TMJ {meta.fit_stats.tmj.r2.toFixed(3)} / PDL-L {meta.fit_stats.pdl_lower.r2.toFixed(3)} / PDL-U {meta.fit_stats.pdl_upper.r2.toFixed(3)}</div> : null}
          {metaError ? <div className="header-error">{metaError}</div> : null}
        </div>
      </header>

      <main className="app-grid">
        <aside className="left-col">
          <ControlPanel
            solvedMp={analysis?.selected?.mp ?? selectedMp}
            solvedVo={analysis?.selected?.vo ?? selectedVo}
            constraints={constraints}
            weights={weights}
            formulas={formulas}
            loading={loading}
            onConstraintChange={(key, value) => setConstraints((prev) => ({ ...prev, [key]: value }))}
            onWeightChange={(key, value) => setWeights((prev) => ({ ...prev, [key]: value }))}
            onFormulaChange={(key, value) => setFormulas((prev) => ({ ...prev, [key]: value }))}
            onAnalyze={runAnalysis}
            onReset={reset}
          />
        </aside>

        <section className="center-col">
          <div className="scene-panel">
            <AnatomyScene selectedMp={selectedMp} selectedVo={selectedVo} />
          </div>
          {analysisError ? <div className="panel-inline-error">{analysisError}</div> : null}
          <ChartsPanel analysis={analysis} selectedMp={selectedMp} selectedVo={selectedVo} onPickPoint={(mp, vo) => { setSelectedMp(mp); setSelectedVo(vo) }} />
        </section>

        <aside className="right-col">
          <InsightCard selected={analysis?.selected} candidates={analysis?.candidates ?? []} interpretation={analysis?.interpretation} onExport={onExport} />
        </aside>
      </main>
    </div>
  )
}
