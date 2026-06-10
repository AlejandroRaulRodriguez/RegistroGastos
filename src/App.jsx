import { useEffect, useState } from 'react'
import './App.css'
import {
  createExpense,
  deleteExpense,
  getCategories,
  getExpenses,
  updateExpense,
} from './services/gastos'

const emptyForm = {
  descripcion: '',
  categoria: 'Comida',
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  notas: '',
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const App = () => {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')

  const loadData = async () => {
    try {
      setLoading(true)
      const [expensesData, categoriesData] = await Promise.all([getExpenses(), getCategories()])
      setExpenses(expensesData.sort((left, right) => right.fecha.localeCompare(left.fecha)))
      setCategories(categoriesData)
      setError('')
    } catch {
      setError('No se pudo conectar con json-server. Ejecuta npm run server en otro terminal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadData()
    })
  }, [])

  const filteredExpenses =
    categoryFilter === 'Todas' ? expenses : expenses.filter((expense) => expense.categoria === categoryFilter)

  const total = expenses.reduce((sum, expense) => sum + Number(expense.monto), 0)
  const highestExpense = expenses.reduce((highest, expense) => {
    const amount = Number(expense.monto)

    if (!highest || amount > highest.monto) {
      return {
        descripcion: expense.descripcion,
        monto: amount,
      }
    }

    return highest
  }, null)

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const amount = Number(form.monto)

    if (!form.descripcion.trim() || !form.fecha || Number.isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Completá descripción, monto positivo y fecha.' })
      return
    }

    const payload = {
      descripcion: form.descripcion.trim(),
      categoria: form.categoria,
      monto: amount,
      fecha: form.fecha,
      notas: form.notas.trim(),
    }

    try {
      setSaving(true)

      if (editingId) {
        const response = await updateExpense(editingId, payload)
        setExpenses((currentExpenses) =>
          currentExpenses.map((expense) => (expense.id === editingId ? response : expense)).sort((left, right) => right.fecha.localeCompare(left.fecha)),
        )
        setMessage({ type: 'success', text: 'Gasto actualizado correctamente.' })
      } else {
        const response = await createExpense(payload)
        setExpenses((currentExpenses) => [response, ...currentExpenses])
        setMessage({ type: 'success', text: 'Gasto registrado correctamente.' })
      }

      resetForm()
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar el gasto. Verificá que json-server esté activo.' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (expense) => {
    setEditingId(expense.id)
    setForm({
      descripcion: expense.descripcion,
      categoria: expense.categoria,
      monto: String(expense.monto),
      fecha: expense.fecha,
      notas: expense.notas ?? '',
    })
    setMessage(null)
  }

  const handleDelete = async (expenseId) => {
    const shouldDelete = window.confirm('¿Querés eliminar este gasto?')

    if (!shouldDelete) {
      return
    }

    try {
      await deleteExpense(expenseId)
      setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== expenseId))
      setMessage({ type: 'success', text: 'Gasto eliminado.' })

      if (editingId === expenseId) {
        resetForm()
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el gasto.' })
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Registro de gastos personales</p>
          <h1>Controlá y registra tus gastos con una interfaz clara y sencilla.</h1>
          <p className="hero-copy">
            Esta app guarda los gastos en json-server, y usa axios para crear, listar, editar y eliminar registros desde el navegador.
          </p>
        </div>

        <div className="stats-grid">
          <article>
            <span>Total acumulado</span>
            <strong>{currencyFormatter.format(total)}</strong>
          </article>
          <article>
            <span>Gasto más alto</span>
            <strong>
              {highestExpense ? currencyFormatter.format(highestExpense.monto) : currencyFormatter.format(0)}
            </strong>
            {highestExpense ? <small>{highestExpense.descripcion}</small> : null}
          </article>
          <article>
            <span>Registros</span>
            <strong>{expenses.length}</strong>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{editingId ? 'Editar gasto' : 'Nuevo gasto'}</p>
              <h2>{editingId ? 'Actualizá el registro seleccionado' : 'Cargá un gasto nuevo'}</h2>
            </div>
            {editingId ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancelar edición
              </button>
            ) : null}
          </div>

          <label>
            Descripción
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Supermercado del viernes"
            />
          </label>

          <div className="split-fields">
            <label>
              Categoría
              <select name="categoria" value={form.categoria} onChange={handleChange}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Monto
              <input
                name="monto"
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={handleChange}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="split-fields">
            <label>
              Fecha
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </label>

            <label>
              Notas
              <input
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </label>
          </div>

          {message ? <p className={`status ${message.type}`}>{message.text}</p> : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Listado</p>
              <h2>Gastos registrados</h2>
            </div>

            <label className="filter-label">
              Filtrar
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="Todas">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p className="empty-state">Cargando gastos...</p> : null}
          {!loading && error ? <p className="status error">{error}</p> : null}
          {!loading && !error && filteredExpenses.length === 0 ? (
            <p className="empty-state">No hay gastos para mostrar con ese filtro.</p>
          ) : null}

          <div className="expenses-list">
            {filteredExpenses.map((expense) => (
              <article key={expense.id} className="expense-item">
                <div>
                  <div className="expense-topline">
                    <h3>{expense.descripcion}</h3>
                    <strong>{currencyFormatter.format(Number(expense.monto))}</strong>
                  </div>
                  <p>
                    {expense.categoria} · {dateFormatter.format(new Date(expense.fecha))}
                  </p>
                  {expense.notas ? <p className="expense-notes">{expense.notas}</p> : null}
                </div>

                <div className="expense-actions">
                  <button type="button" className="secondary-button" onClick={() => handleEdit(expense)}>
                    Editar
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(expense.id)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App