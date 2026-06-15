import type { OMDBMovie } from './types'

export async function fetchMovieData(imdbId: string, apiKey: string): Promise<OMDBMovie> {
  const url = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}&plot=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error('خطا در ارتباط با سرور')
  const data: OMDBMovie = await res.json()
  if (data.Response === 'False') throw new Error(data.Error || 'فیلم پیدا نشد')
  return data
}

export async function translateToFarsi(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fa`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Translation failed')
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText as string
    }
    throw new Error('Bad response')
  } catch {
    return ''
  }
}

export function buildVideoPageUrl(videoCode: string): string {
  return `https://www.imdb.com/video/${videoCode}`
}

export function buildEmbedUrl(videoCode: string): string {
  return `https://www.imdb.com/video/imdb/${videoCode}/imdb/embed`
}

export function buildAltEmbedUrl(videoCode: string): string {
  return `https://www.imdb.com/videoembed/${videoCode}`
}

export function buildIframeCode(videoCode: string): string {
  return `<iframe src="${buildEmbedUrl(videoCode)}" width="854" height="480" allowfullscreen allow="fullscreen"></iframe>`
}

export function buildShortcode(videoCode: string, title: string): string {
  return `[imdb_video id="${videoCode}" title="${title}" width="854" height="480"]`
}

export function getPosterVariants(posterUrl: string): string[] {
  if (!posterUrl || posterUrl === 'N/A') return []
  const base = posterUrl.replace(/_V1_.*\.jpg$/, '_V1_')
  return [
    base + 'SX300.jpg',
    base + 'SX600.jpg',
    base + 'SX1080.jpg',
    base + 'FMjpg_UX1080_.jpg',
  ]
}
