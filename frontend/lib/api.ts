import axios from 'axios'

const http = axios.create({ baseURL: '/api/retina' })

// Cases
export const getCases    = (p?: any) => http.get('/cases', { params: p }).then(r => r.data)
export const getCase     = (id: string) => http.get(`/cases/${id}`).then(r => r.data)
export const getCaseStats= () => http.get('/cases/stats').then(r => r.data)
export const deleteCase  = (id: string) => http.delete(`/cases/${id}`)

// Analyze
export const analyze = (form: FormData) => http.post('/analyze', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)

// Progression
export const getProgression = (patientId: string) =>
  http.post('/progression', { patient_id: patientId }).then(r => r.data)

// Copilot
export const askCopilot = (caseId: string, question: string) =>
  http.post('/copilot', { case_id: caseId, question }).then(r => r.data)

// Referrals
export const getReferrals      = (p?: any) => http.get('/referrals', { params: p }).then(r => r.data)
export const getReferralStats  = () => http.get('/referrals/stats').then(r => r.data)
export const createReferral    = (body: any) => http.post('/referrals', body).then(r => r.data)
export const updateReferral    = (id: string, body: any) => http.patch(`/referrals/${id}`, body).then(r => r.data)

// Passport
export const createPassport = (body: any) => http.post('/passport', body).then(r => r.data)
export const getPassport    = (token: string) => http.get(`/passport/${token}`).then(r => r.data)
export const revokePassport = (token: string) => http.delete(`/passport/${token}`)

// Search
export const searchSimilar = (form: FormData) => http.post('/search', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)

// Explain
export const explainCase = (form: FormData) => http.post('/explain', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)

// Report PDF
export const downloadPdf = (form: FormData) => http.post('/report/pdf', form, {
  responseType: 'blob',
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)
