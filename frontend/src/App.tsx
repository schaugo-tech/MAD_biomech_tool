import { useEffect, useMemo, useState } from 'react'
import ChartsPanel from './components/ChartsPanel'
import ControlPanel from './components/ControlPanel'
import InsightCard from './components/InsightCard'
import { fetchRecommendMeta, previewRecommend } from './utils/api'
import type { FrontendInputs, RecommendV1Response } from './types'

const defaultInputs: FrontendInputs = {
  treatment_need: { ahi: 28, symptom_severity: 'moderate', complaint_strength: 'high' },
  tmj_sensitivity: { pain_vas: 3, joint_state: 'click', mouth_opening_state: 'normal' },
  periodontal: { mobility_state: 'stable', bone_loss_state: 'low' },
  occlusal_need: { deep_overbite: true, occlusal_interference: true, anterior_crossbite: false },
}

export default function App() {
  const [meta, setMeta] = useState<any>(null)
  const [inputs, setInputs] = useState<FrontendInputs>(defaultInputs)
  const [result, setResult] = useState<RecommendV1Response | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mpGrid = useMemo(() => Array.from({ length: 21 }, (_, i) => 50 + i), [])
  const voGrid = useMemo(() => Array.from({ length: 17 }, (_, i) => Number((3 + i * 0.25).toFixed(2))), [])

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await previewRecommend({ inputs, mp_grid: mpGrid, vo_grid: voGrid })
      setResult(data)
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message
      setError(detail ? `推荐计算失败：${detail}` : '推荐计算失败')
      setResult(undefined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendMeta().then(setMeta).catch((e) => setError(`meta 读取失败：${e.message}`))
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">MAD V1 Recommendation Engine</div>
          <h1>MAD 推荐引擎（前端仅输入，后端统一推荐）</h1>
          <p>已切换为 d/j/p/o 映射 + 收益减风险引擎。前端不再本地拼推荐逻辑，只展示后端 payload。</p>
        </div>
        <div className="header-note">
          <div>引擎版本：{meta?.engine_version ?? '读取中...'}</div>
          {meta?.data_file ? <div className="header-sub">数据源：{meta.data_file}</div> : null}
          {error ? <div className="header-error">{error}</div> : null}
        </div>
      </header>

      <main className="app-grid">
        <aside className="left-col">
          <ControlPanel inputs={inputs} loading={loading} onInputsChange={setInputs} onAnalyze={run} onReset={() => setInputs(defaultInputs)} />
        </aside>
        <section className="center-col">
          <ChartsPanel data={result} />
        </section>
        <aside className="right-col">
          <InsightCard data={result} />
        </aside>
      </main>
    </div>
  )
}
