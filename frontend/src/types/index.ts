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
  comfort: number
  balance: number
}

export type AnalysisRequest = {
  constraints: ConstraintConfig
  weights: WeightConfig
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
  score_comfort: number
  score_balance: number
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
