import type { ConstraintConfig, FormulaConfig, WeightConfig } from '../types'
import PanelCard from './PanelCard'

type Props = {
  solvedMp: number
  solvedVo: number
  constraints: ConstraintConfig
  weights: WeightConfig
  formulas: FormulaConfig
  loading: boolean
  onConstraintChange: (key: keyof ConstraintConfig, value: number) => void
  onWeightChange: (key: keyof WeightConfig, value: number) => void
  onFormulaChange: (key: keyof FormulaConfig, value: number) => void
  onAnalyze: () => void
  onReset: () => void
}

export default function ControlPanel(props: Props) {
  const {
    solvedMp,
    solvedVo,
    constraints,
    weights,
    formulas,
    loading,
    onConstraintChange,
    onWeightChange,
    onFormulaChange,
    onAnalyze,
    onReset,
  } = props

  return (
    <div className="control-stack">
      <PanelCard title="研究场景">
        <div className="compact-note">当前版本固定为 MAD 生物力学设计场景。后续可把这里扩展成多课题入口。</div>
      </PanelCard>

      <PanelCard title="求解输出参数（由数据与规则自动计算）">
        <div className="metric-grid">
          <div className="metric-box"><span>推荐 MP 前伸比例</span><strong>{solvedMp.toFixed(1)}%</strong></div>
          <div className="metric-box"><span>推荐 VO 开口量</span><strong>{solvedVo.toFixed(2)} mm</strong></div>
        </div>
        <div className="compact-note">逻辑上：权重（主诉）+ 边界约束（诊断）+ 公式（取舍偏好）作为前提，MP/VO 为求解结果。</div>
      </PanelCard>

      <PanelCard title="边界约束参数（诊断前提）">
        <label className="field">
          <span>TMJ 最大允许应力：{constraints.tmj_max.toFixed(2)} MPa</span>
          <input type="range" min={2.5} max={6.5} step={0.1} value={constraints.tmj_max} onChange={(e) => onConstraintChange('tmj_max', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>下前牙 PDL 上限：{constraints.pdl_lower_max.toFixed(2)} kPa</span>
          <input type="range" min={4} max={8.5} step={0.1} value={constraints.pdl_lower_max} onChange={(e) => onConstraintChange('pdl_lower_max', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>上前牙 PDL 上限：{constraints.pdl_upper_max.toFixed(2)} kPa</span>
          <input type="range" min={4} max={8.5} step={0.1} value={constraints.pdl_upper_max} onChange={(e) => onConstraintChange('pdl_upper_max', Number(e.target.value))} />
        </label>
      </PanelCard>

      <PanelCard title="综合评分权重（主诉前提）">
        <label className="field">
          <span>安全性：{weights.safety.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.safety} onChange={(e) => onWeightChange('safety', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>治疗效果（MP）：{weights.effectiveness.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.effectiveness} onChange={(e) => onWeightChange('effectiveness', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>治疗可行性（VO）：{weights.feasibility.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.feasibility} onChange={(e) => onWeightChange('feasibility', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>上下牙平衡：{weights.balance.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.balance} onChange={(e) => onWeightChange('balance', Number(e.target.value))} />
        </label>
      </PanelCard>

      <PanelCard title="公式参数（非单调取舍）">
        <div className="compact-note">
          MP 增益指数调高＝治疗推进更激进；VO 增益指数调高＝治疗可行性更激进；安全性敏感指数调高＝系统对高应力更保守；冲突惩罚强度和风险惩罚指数越高，越会压低“高推进但高风险”的方案。
        </div>
        <label className="field">
          <span>MP 增益曲线指数：{formulas.mp_gain_gamma.toFixed(2)}</span>
          <input type="range" min={0.6} max={2.2} step={0.05} value={formulas.mp_gain_gamma} onChange={(e) => onFormulaChange('mp_gain_gamma', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>VO 增益曲线指数：{formulas.vo_gain_gamma.toFixed(2)}</span>
          <input type="range" min={0.6} max={2.2} step={0.05} value={formulas.vo_gain_gamma} onChange={(e) => onFormulaChange('vo_gain_gamma', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>安全性敏感指数：{formulas.safety_gamma.toFixed(2)}</span>
          <input type="range" min={0.6} max={2.5} step={0.05} value={formulas.safety_gamma} onChange={(e) => onFormulaChange('safety_gamma', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>冲突惩罚强度：{formulas.tradeoff_strength.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={formulas.tradeoff_strength} onChange={(e) => onFormulaChange('tradeoff_strength', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>风险惩罚指数：{formulas.risk_gamma.toFixed(2)}</span>
          <input type="range" min={0.8} max={3.0} step={0.05} value={formulas.risk_gamma} onChange={(e) => onFormulaChange('risk_gamma', Number(e.target.value))} />
        </label>
      </PanelCard>

      <div className="button-row">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={loading}>{loading ? '更新中…' : '更新结果'}</button>
        <button className="btn" onClick={onReset}>重置</button>
      </div>
    </div>
  )
}
