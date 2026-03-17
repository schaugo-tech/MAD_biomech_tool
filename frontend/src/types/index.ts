export type ConstraintConfig = {
  tmj_max: number
  pdl_lower_max: number
  pdl_upper_max: number
  max_mp: number
  max_vo: number
}

export type WeightConfig = {
  safety: number
  effectiveness: number
  feasibility: number
  balance: number
}

export type FormulaConfig = {
  mp_gain_gamma: number
  vo_gain_gamma: number
  safety_gamma: number
  tradeoff_strength: number
  risk_gamma: number
}

export type AnalysisRequest = {
  constraints: ConstraintConfig
  weights: WeightConfig
  formulas: FormulaConfig
  selected_mp: number
  selected_vo: number
  grid_step_mp: number
  grid_step_vo: number
}

export type GridRecord = {
  mp: number
  vo: number
  tmj: number
  pdl_lower: number
  pdl_upper: number
  score_safety: number
  score_effectiveness: number
  score_feasibility: number
  score_balance: number
  score_tmj_minmax: number
  score_pdl_lower_minmax: number
  score_pdl_upper_minmax: number
  risk_index: number
  drive_index: number
  score_tradeoff_penalty: number
  overall_score: number
  constraint_tmj: boolean
  constraint_pdl_lower: boolean
  constraint_pdl_upper: boolean
  constraint_mp: boolean
  constraint_vo: boolean
  violation_count: number
  is_feasible: boolean
  limiting_factor: string
}

export type AnalysisResponse = {
  meta: any
  selected: GridRecord
  candidates: GridRecord[]
  grid: GridRecord[]
  raw_records: any[]
  pareto_records: any[]
  interpretation: {
    selected_text: string
    advice: string
    best_text: string
  }
}
