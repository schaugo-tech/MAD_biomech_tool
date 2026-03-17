import type { GridRecord } from '../types'
import PanelCard from './PanelCard'

type Props = {
  selected?: GridRecord
  candidates: GridRecord[]
  interpretation?: {
    selected_text: string
    advice: string
    best_text: string
  }
  onExport: () => void
}

export default function InsightCard({ selected, candidates, interpretation, onExport }: Props) {
  return (
    <div className="control-stack">
      <PanelCard title="当前方案摘要" actions={<button className="btn" onClick={onExport}>导出报告</button>}>
        {selected ? (
          <div className="metric-grid">
            <div className="metric-box"><span>MP</span><strong>{selected.mp.toFixed(1)}%</strong></div>
            <div className="metric-box"><span>VO</span><strong>{selected.vo.toFixed(2)} mm</strong></div>
            <div className="metric-box"><span>综合评分</span><strong>{selected.overall_score.toFixed(3)}</strong></div>
            <div className="metric-box"><span>状态</span><strong>{selected.is_feasible ? '可行' : '受限'}</strong></div>
          </div>
        ) : <div className="compact-note">等待计算。</div>}
      </PanelCard>

      <PanelCard title="解释">
        <p>{interpretation?.selected_text}</p>
        <p>{interpretation?.advice}</p>
        <p>{interpretation?.best_text}</p>
      </PanelCard>

      <PanelCard title="推荐候选点">
        <div className="candidate-list">
          {candidates.map((c, idx) => (
            <div key={`${c.mp}-${c.vo}-${idx}`} className="candidate-item">
              <div><strong>候选 {idx + 1}</strong></div>
              <div>MP {c.mp.toFixed(1)}% / VO {c.vo.toFixed(2)} mm</div>
              <div>评分 {c.overall_score.toFixed(3)}</div>
              <div>限制因子：{c.limiting_factor}</div>
            </div>
          ))}
          {candidates.length === 0 ? <div className="compact-note">当前阈值下没有可行点。</div> : null}
        </div>
      </PanelCard>

      <PanelCard title="当前版本边界">
        <ul className="scope-list">
          <li>✅ 包含：3D 查看/拖动、图表联动、参数调节、报告导出。</li>
          <li>✅ 包含：基于预置研究数据的推荐方案与解释。</li>
          <li>❌ 暂不包含：用户系统、在线病例存储、多人协作。</li>
          <li>❌ 暂不包含：医院真实数据接入、复杂后台管理。</li>
        </ul>
      </PanelCard>
    </div>
  )
}
