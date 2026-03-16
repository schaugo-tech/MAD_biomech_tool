import axios from 'axios'
import type { AnalysisRequest, AnalysisResponse } from '../types'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

export async function fetchMeta() {
  const { data } = await api.get('/study/meta')
  return data
}

export async function analyzeStudy(payload: AnalysisRequest) {
  const { data } = await api.post<AnalysisResponse>('/study/analyze', payload)
  return data
}

export async function exportReport(analysis: AnalysisResponse) {
  const { data } = await api.post('/study/report', { analysis }, { responseType: 'text' })
  return data
}
