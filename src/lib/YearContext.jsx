import { createContext, useContext, useState, useEffect } from 'react'
import { fetchCurrentYear, updateCurrentYear } from './database'

const YearContext = createContext(null)

export function YearProvider({ children }) {
  const [currentYear, setCurrentYear] = useState(null)
  const [yearLoading, setYearLoading] = useState(true)

  useEffect(() => {
    fetchCurrentYear()
      .then((year) => setCurrentYear(year))
      .catch(() => setCurrentYear(new Date().getFullYear()))
      .finally(() => setYearLoading(false))
  }, [])

  const advanceYear = async () => {
    const next = currentYear + 1
    await updateCurrentYear(next)
    setCurrentYear(next)
    return next
  }

  return (
    <YearContext.Provider value={{ currentYear, yearLoading, advanceYear }}>
      {children}
    </YearContext.Provider>
  )
}

export function useYear() {
  return useContext(YearContext)
}
