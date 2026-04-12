import type { RecommendV1Response } from '../types'
import PanelCard from './PanelCard'

type Props = { data?: RecommendV1Response }

export default function InsightCard({ data }: Props) {
  if (!data) return <PanelCard title="推荐摘要"><div className="compact-note">等待计算。</div></PanelCard>

  const { best, alternatives, scalars, status } = data

  return (
    <div className="control-stack">
      <PanelCard title="推荐结果">
        <div className="metric-grid">
          <div className="metric-box"><span>推荐 MP</span><strong>{best.mp.toFixed(1)}%</strong></div>
          <div className="metric-box"><span>推荐 VO</span><strong>{best.vo.toFixed(2)} mm</strong></div>
          <div className="metric-box"><span>综合得分</span><strong>{best.utility.toFixed(3)}</strong></div>
          <div className="metric-box"><span>状态</span><strong>{status}</strong></div>
        </div>
      </PanelCard>

      <PanelCard title="后台连续参数 (d/j/p/o)">
        <ul className="scope-list">
          <li>d（治疗需求强度）= {scalars.d.toFixed(3)}</li>
          <li>j（关节敏感度）= {scalars.j.toFixed(3)}</li>
          <li>p（前牙牙周敏感度）= {scalars.p.toFixed(3)}</li>
          <li>o（咬合抬高需求）= {scalars.o.toFixed(3)}</li>
          <li>MP 目标中心 = {scalars.mp_target_pct.toFixed(2)}%</li>
          <li>VO 目标中心 = {scalars.vo_target_mm.toFixed(2)} mm（{scalars.vo_need_label}）</li>
        </ul>
      </PanelCard>

      <PanelCard title="备选点">
        <div className="candidate-list">
          {alternatives.map((c, idx) => (
            <div key={`${c.mp}-${c.vo}-${idx}`} className="candidate-item">
              <div><strong>备选 {idx + 1}</strong></div>
              <div>MP {c.mp.toFixed(1)}% / VO {c.vo.toFixed(2)} mm</div>
              <div>score {c.utility.toFixed(3)}</div>
              <div>限制因子：{c.limit_factor}</div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  )
}
