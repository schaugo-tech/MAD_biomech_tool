export type TreatmentNeedInput = {
  ahi?: number
  symptom_severity?: 'mild' | 'moderate' | 'severe'
  complaint_strength?: 'low' | 'medium' | 'high'
}

export type TMJSensitivityInput = {
  pain_vas?: number
  joint_state?: 'none' | 'click' | 'lock'
  mouth_opening_mm?: number
  mouth_opening_state?: 'normal' | 'mildly_limited' | 'limited'
}

export type PeriodontalInput = {
  mobility_state?: 'stable' | 'mild' | 'obvious'
  bone_loss_state?: 'low' | 'medium' | 'high'
}

export type OcclusalNeedInput = {
  deep_overbite: boolean
  occlusal_interference: boolean
  anterior_crossbite: boolean
}

export type FrontendInputs = {
  treatment_need: TreatmentNeedInput
  tmj_sensitivity: TMJSensitivityInput
  periodontal: PeriodontalInput
  occlusal_need: OcclusalNeedInput
}

export type RecommendV1Request = {
  inputs: FrontendInputs
  mp_grid?: number[]
  vo_grid?: number[]
}

export type RecommendPoint = {
  mp: number
  vo: number
  utility: number
  benefit_mp: number
  benefit_vo: number
  r_tmj: number
  r_pdl: number
  feasible: boolean
  limit_factor: 'feasible' | 'tmj' | 'pdl'
}

export type RecommendV1Response = {
  status: string
  scalars: { d: number; j: number; p: number; o: number }
  best: RecommendPoint
  alternatives: RecommendPoint[]
  charts: {
    best: RecommendPoint
    alternatives: RecommendPoint[]
    heatmaps: {
      utility: [number, number, number][]
      limit_factor: [number, number, number][]
    }
    radar: Array<{
      name: string
      mp: number
      vo: number
      values: Record<string, number>
    }>
    curves: {
      fix_vo_vary_mp: RecommendPoint[]
      fix_mp_vary_vo: RecommendPoint[]
    }
  }
  meta: any
}
