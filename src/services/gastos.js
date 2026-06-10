import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001',
})

export const getExpenses = async () => {
  const response = await api.get('/gastos')
  return response.data
}

export const getCategories = async () => {
  const response = await api.get('/categorias')
  return response.data.map((category) => category.nombre)
}

export const createExpense = async (expense) => {
  const response = await api.post('/gastos', expense)
  return response.data
}

export const updateExpense = async (expenseId, expense) => {
  const response = await api.put(`/gastos/${expenseId}`, expense)
  return response.data
}

export const deleteExpense = async (expenseId) => {
  await api.delete(`/gastos/${expenseId}`)
}
