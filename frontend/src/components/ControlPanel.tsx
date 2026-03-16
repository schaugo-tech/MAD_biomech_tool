import type { ConstraintConfig, WeightConfig } from '../types'
import PanelCard from './PanelCard'

type Props = {
  selectedMp: number
  selectedVo: number
  constraints: ConstraintConfig
  weights: WeightConfig
  loading: boolean
  onSelectedMpChange: (v: number) => void
  onSelectedVoChange: (v: number) => void
  onConstraintChange: (key: keyof ConstraintConfig, value: number) => void
  onWeightChange: (key: keyof WeightConfig, value: number) => void
  onAnalyze: () => void
  onReset: () => void
}

export default function ControlPanel(props: Props) {
  const {
    selectedMp,
    selectedVo,
    constraints,
    weights,
    loading,
    onSelectedMpChange,
    onSelectedVoChange,
    onConstraintChange,
    onWeightChange,
    onAnalyze,
    onReset,
  } = props

  return (
    <div className="control-stack">
      <PanelCard title="研究场景">
        <div className="compact-note">当前版本固定为 MAD 生物力学设计场景。后续可把这里扩展成多课题入口。</div>
      </PanelCard>

      <PanelCard title="设计输出参数">
        <label className="field">
          <span>MP 前伸比例：{selectedMp.toFixed(1)}%</span>
          <input type="range" min={50} max={70} step={1} value={selectedMp} onChange={(e) => onSelectedMpChange(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>VO 开口量：{selectedVo.toFixed(2)} mm</span>
          <input type="range" min={3} max={7} step={0.25} value={selectedVo} onChange={(e) => onSelectedVoChange(Number(e.target.value))} />
        </label>
      </PanelCard>

      <PanelCard title="边界约束参数">
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

      <PanelCard title="综合评分权重">
        <label className="field">
          <span>安全性：{weights.safety.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.safety} onChange={(e) => onWeightChange('safety', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>治疗推进：{weights.effectiveness.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.effectiveness} onChange={(e) => onWeightChange('effectiveness', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>舒适度：{weights.comfort.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.comfort} onChange={(e) => onWeightChange('comfort', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>上下牙平衡：{weights.balance.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.05} value={weights.balance} onChange={(e) => onWeightChange('balance', Number(e.target.value))} />
        </label>
        <div className="compact-note">这里不强行锁死。先给你一个可以拧来拧去的评分台，后面再收敛。</div>
      </PanelCard>

      <div className="button-row">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={loading}>{loading ? '更新中…' : '更新结果'}</button>
        <button className="btn" onClick={onReset}>重置</button>
      </div>
    </div>
  )
}
