import type { FrontendInputs } from '../types'
import PanelCard from './PanelCard'

type Props = {
  inputs: FrontendInputs
  loading: boolean
  onInputsChange: (next: FrontendInputs) => void
  onAnalyze: () => void
  onReset: () => void
}

export default function ControlPanel({ inputs, loading, onInputsChange, onAnalyze, onReset }: Props) {
  return (
    <div className="control-stack">
      <PanelCard title="治疗需求强度（d）">
        <label className="field">
          <span>AHI：{inputs.treatment_need.ahi ?? 28}</span>
          <input type="range" min={5} max={60} step={1} value={inputs.treatment_need.ahi ?? 28} onChange={(e) => onInputsChange({ ...inputs, treatment_need: { ...inputs.treatment_need, ahi: Number(e.target.value) } })} />
        </label>
        <label className="field">
          <span>症状严重度</span>
          <select value={inputs.treatment_need.symptom_severity ?? 'moderate'} onChange={(e) => onInputsChange({ ...inputs, treatment_need: { ...inputs.treatment_need, symptom_severity: e.target.value as any } })}>
            <option value="mild">mild</option><option value="moderate">moderate</option><option value="severe">severe</option>
          </select>
        </label>
        <label className="field">
          <span>主诉强度</span>
          <select value={inputs.treatment_need.complaint_strength ?? 'medium'} onChange={(e) => onInputsChange({ ...inputs, treatment_need: { ...inputs.treatment_need, complaint_strength: e.target.value as any } })}>
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        </label>
      </PanelCard>

      <PanelCard title="关节敏感度（j）">
        <label className="field">
          <span>疼痛 VAS：{inputs.tmj_sensitivity.pain_vas ?? 3}</span>
          <input type="range" min={0} max={10} step={1} value={inputs.tmj_sensitivity.pain_vas ?? 3} onChange={(e) => onInputsChange({ ...inputs, tmj_sensitivity: { ...inputs.tmj_sensitivity, pain_vas: Number(e.target.value) } })} />
        </label>
        <label className="field">
          <span>关节状态</span>
          <select value={inputs.tmj_sensitivity.joint_state ?? 'click'} onChange={(e) => onInputsChange({ ...inputs, tmj_sensitivity: { ...inputs.tmj_sensitivity, joint_state: e.target.value as any } })}>
            <option value="none">none</option><option value="click">click</option><option value="lock">lock</option>
          </select>
        </label>
        <label className="field">
          <span>开口状态</span>
          <select value={inputs.tmj_sensitivity.mouth_opening_state ?? 'normal'} onChange={(e) => onInputsChange({ ...inputs, tmj_sensitivity: { ...inputs.tmj_sensitivity, mouth_opening_state: e.target.value as any } })}>
            <option value="normal">normal</option><option value="mildly_limited">mildly_limited</option><option value="limited">limited</option>
          </select>
        </label>
      </PanelCard>

      <PanelCard title="前牙牙周敏感度（p）">
        <label className="field"><span>前牙松动度</span>
          <select value={inputs.periodontal.mobility_state ?? 'stable'} onChange={(e) => onInputsChange({ ...inputs, periodontal: { ...inputs.periodontal, mobility_state: e.target.value as any } })}>
            <option value="stable">stable</option><option value="mild">mild</option><option value="obvious">obvious</option>
          </select>
        </label>
        <label className="field"><span>骨丧失状态</span>
          <select value={inputs.periodontal.bone_loss_state ?? 'none'} onChange={(e) => onInputsChange({ ...inputs, periodontal: { ...inputs.periodontal, bone_loss_state: e.target.value as any } })}>
            <option value="none">none</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        </label>
      </PanelCard>

      <PanelCard title="咬合抬高需求（o）">
        <label className="field"><span><input type="checkbox" checked={inputs.occlusal_need.deep_overbite} onChange={(e) => onInputsChange({ ...inputs, occlusal_need: { ...inputs.occlusal_need, deep_overbite: e.target.checked } })} /> 深覆牙合</span></label>
        <label className="field"><span><input type="checkbox" checked={inputs.occlusal_need.occlusal_interference} onChange={(e) => onInputsChange({ ...inputs, occlusal_need: { ...inputs.occlusal_need, occlusal_interference: e.target.checked } })} /> 咬合干扰</span></label>
        <label className="field"><span><input type="checkbox" checked={inputs.occlusal_need.anterior_crossbite} onChange={(e) => onInputsChange({ ...inputs, occlusal_need: { ...inputs.occlusal_need, anterior_crossbite: e.target.checked } })} /> 前牙反牙合</span></label>
      </PanelCard>

      <div className="button-row">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={loading}>{loading ? '计算中…' : '更新推荐'}</button>
        <button className="btn" onClick={onReset}>重置</button>
      </div>
    </div>
  )
}
