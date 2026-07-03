import { useState, useEffect, useCallback } from 'react'
import { parseCsvText } from '../utils/csvParser'

const CACHE_KEY = 'uklash_products_cache'
const CACHE_TS_KEY = 'uklash_products_cache_ts'
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

export function useProducts(sheetUrl) {
  const [products, setProducts] = useState([])
  const [productMap, setProductMap] = useState({})
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY)
        const cachedTs = localStorage.getItem(CACHE_TS_KEY)
        if (cached && cachedTs) {
          const age = Date.now() - parseInt(cachedTs, 10)
          if (age < CACHE_TTL_MS) {
            const { products: p, productMap: pm, headers: h } = parseCsvText(cached)
            setProducts(p)
            setProductMap(pm)
            setHeaders(h)
            setLastFetched(new Date(parseInt(cachedTs, 10)))
            setLoading(false)
            return
          }
        }
      }

      const res = await fetch(sheetUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()

      localStorage.setItem(CACHE_KEY, text)
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()))

      const { products: p, productMap: pm, headers: h } = parseCsvText(text)
      setProducts(p)
      setProductMap(pm)
      setHeaders(h)
      setLastFetched(new Date())
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { products: p, productMap: pm, headers: h } = parseCsvText(cached)
        setProducts(p)
        setProductMap(pm)
        setHeaders(h)
        setError('Using cached data — could not reach Google Sheets.')
      } else {
        setError(`Failed to load products: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [sheetUrl])

  useEffect(() => {
    if (sheetUrl) load()
  }, [sheetUrl, load])

  return { products, productMap, headers, loading, error, lastFetched, refresh: () => load(true) }
}
