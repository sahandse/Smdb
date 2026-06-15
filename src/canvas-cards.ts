import type { OMDBMovie } from './types'
import { translateGenres, translateCountries, translateLanguages } from './translations'

const FA_FONT = 'Vazirmatn, Tahoma, Arial'

async function loadImgViaCors(url: string): Promise<HTMLImageElement | null> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url,
  ]
  for (const src of proxies) {
    const result = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const timer = setTimeout(() => resolve(null), 5000)
      img.onload = () => { clearTimeout(timer); resolve(img) }
      img.onerror = () => { clearTimeout(timer); resolve(null) }
      img.src = src
    })
    if (result) return result
  }
  return null
}

function rtlLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function generateTelegramPng(movie: OMDBMovie, persianPlot: string): Promise<string> {
  await document.fonts.ready

  const W = 1280, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // ── Background ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0d1117')
  bg.addColorStop(1, '#0a1a2f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // ── Gold accent bar left ─────────────────────────────────
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(0, 0, 6, H)

  // ── Poster (right side, faded) ──────────────────────────
  const poster = await loadImgViaCors(movie.Poster)
  if (poster) {
    ctx.save()
    const ph = H
    const pw = ph * (poster.width / poster.height)
    const px = W - pw - 20
    ctx.globalAlpha = 0.18
    ctx.drawImage(poster, px, 0, pw, ph)
    const fade = ctx.createLinearGradient(px, 0, W, 0)
    fade.addColorStop(0, '#0d1117')
    fade.addColorStop(0.4, 'transparent')
    ctx.globalAlpha = 1
    ctx.fillStyle = fade
    ctx.fillRect(px, 0, pw + 20, ph)
    ctx.restore()

    // Poster thumbnail (left)
    const th = 260, tw = th * (poster.width / poster.height)
    ctx.save()
    roundRect(ctx, 40, 50, tw, th, 10)
    ctx.clip()
    ctx.drawImage(poster, 40, 50, tw, th)
    ctx.restore()
    ctx.strokeStyle = '#f5c518'
    ctx.lineWidth = 2
    roundRect(ctx, 40, 50, tw, th, 10)
    ctx.stroke()
  }

  const textX = 420

  // ── Rating ──────────────────────────────────────────────
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#f5c518'
  ctx.font = `bold 28px ${FA_FONT}`
  ctx.fillText(`⭐ ${movie.imdbRating}/10  (${movie.imdbVotes} votes)`, textX, 80)

  // ── Title ───────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 50px ${FA_FONT}`
  ctx.fillText(movie.Title, textX, 140)

  // ── Year / Genre ────────────────────────────────────────
  const genreFa = translateGenres(movie.Genre)
  ctx.fillStyle = '#aaaaaa'
  ctx.font = `22px ${FA_FONT}`
  ctx.fillText(`${movie.Year}  |  ${genreFa}  |  ${movie.Runtime}`, textX, 178)

  // ── Meta ────────────────────────────────────────────────
  ctx.fillStyle = '#cccccc'
  ctx.font = `20px ${FA_FONT}`
  ctx.fillText(`🎬 ${movie.Director}`, textX, 215)
  const actors3 = movie.Actors.split(', ').slice(0, 3).join(' · ')
  ctx.fillText(`🎭 ${actors3}`, textX, 245)
  ctx.fillText(`🌍 ${translateCountries(movie.Country)}  ·  🗣 ${translateLanguages(movie.Language)}`, textX, 275)

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(245,197,24,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(textX, 295)
  ctx.lineTo(W - 60, 295)
  ctx.stroke()

  // ── Persian plot ─────────────────────────────────────────
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  const plot = persianPlot || movie.Plot
  ctx.fillStyle = '#b0b0b0'
  ctx.font = `19px ${FA_FONT}`
  const plotLines = rtlLines(ctx, plot, W - textX - 100)
  plotLines.slice(0, 6).forEach((line, i) => {
    ctx.fillText(line, W - 60, 325 + i * 30)
  })

  // ── Bottom bar ───────────────────────────────────────────
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(0, H - 44, W, 44)
  ctx.fillStyle = '#000'
  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.font = `bold 18px ${FA_FONT}`
  ctx.fillText(`SMDB  ·  sahandse.github.io/Smdb  ·  IMDb: ${movie.imdbID}`, W / 2, H - 16)

  return canvas.toDataURL('image/png')
}

export async function generateInstagramPng(movie: OMDBMovie, persianPlot: string): Promise<string> {
  await document.fonts.ready

  const S = 1080
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')!

  // ── Background ──────────────────────────────────────────
  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, S, S)

  const poster = await loadImgViaCors(movie.Poster)

  // ── Background poster (blurred overlay) ─────────────────
  if (poster) {
    ctx.save()
    ctx.globalAlpha = 0.22
    const scale = Math.max(S / poster.width, S / poster.height)
    const pw = poster.width * scale, ph = poster.height * scale
    ctx.drawImage(poster, (S - pw) / 2, (S - ph) / 2, pw, ph)
    ctx.restore()
    const ov = ctx.createLinearGradient(0, 0, 0, S)
    ov.addColorStop(0, 'rgba(0,0,0,0.75)')
    ov.addColorStop(0.5, 'rgba(0,0,0,0.45)')
    ov.addColorStop(1, 'rgba(0,0,0,0.92)')
    ctx.fillStyle = ov
    ctx.fillRect(0, 0, S, S)
  }

  // ── Gold top bar ────────────────────────────────────────
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(0, 0, S, 8)

  // ── Poster thumbnail ─────────────────────────────────────
  if (poster) {
    const th = 280, tw = th * (poster.width / poster.height)
    ctx.save()
    roundRect(ctx, 60, 40, tw, th, 10)
    ctx.clip()
    ctx.drawImage(poster, 60, 40, tw, th)
    ctx.restore()
    ctx.strokeStyle = '#f5c518'
    ctx.lineWidth = 3
    roundRect(ctx, 60, 40, tw, th, 10)
    ctx.stroke()
  }

  // ── Rating badge ─────────────────────────────────────────
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#f5c518'
  ctx.font = `bold 38px ${FA_FONT}`
  ctx.fillText(`⭐ ${movie.imdbRating}/10`, S - 60, 90)

  // ── Title ───────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 60px ${FA_FONT}`
  ctx.fillText(movie.Title, S - 60, 160)

  // ── Year & Genre ─────────────────────────────────────────
  const genreFa = translateGenres(movie.Genre)
  ctx.fillStyle = '#f5c518'
  ctx.font = `26px ${FA_FONT}`
  ctx.fillText(`${movie.Year}  ·  ${genreFa}  ·  ${movie.Runtime}`, S - 60, 200)

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(245,197,24,0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 360)
  ctx.lineTo(S - 60, 360)
  ctx.stroke()

  // ── Meta grid ────────────────────────────────────────────
  ctx.fillStyle = '#aaaaaa'
  ctx.font = `22px ${FA_FONT}`
  ctx.fillText(`🎬 کارگردان: ${movie.Director}`, S - 60, 400)
  ctx.fillText(`✍️ نویسنده: ${movie.Writer.split(',')[0].trim()}`, S - 60, 435)
  ctx.fillText(`🌍 کشور: ${translateCountries(movie.Country)}`, S - 60, 470)
  ctx.fillText(`🗣 زبان: ${translateLanguages(movie.Language)}`, S - 60, 505)
  ctx.fillText(`🏆 ${movie.Awards.substring(0, 60)}`, S - 60, 540)

  // ── Actors ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 565)
  ctx.lineTo(S - 60, 565)
  ctx.stroke()

  ctx.fillStyle = '#f5c518'
  ctx.font = `bold 24px ${FA_FONT}`
  ctx.fillText('بازیگران:', S - 60, 600)
  ctx.fillStyle = '#dddddd'
  ctx.font = `22px ${FA_FONT}`
  const actorsAll = movie.Actors.split(', ')
  actorsAll.slice(0, 4).forEach((a, i) => {
    ctx.fillText(`• ${a}`, S - 60, 632 + i * 34)
  })

  // ── Plot ──────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 780)
  ctx.lineTo(S - 60, 780)
  ctx.stroke()

  const plot = persianPlot || movie.Plot
  ctx.fillStyle = '#999999'
  ctx.font = `19px ${FA_FONT}`
  const plotLines = rtlLines(ctx, plot, S - 140)
  plotLines.slice(0, 4).forEach((line, i) => {
    ctx.fillText(line, S - 60, 810 + i * 30)
  })

  // ── Bottom branding ───────────────────────────────────────
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(0, S - 60, S, 60)
  ctx.fillStyle = '#000'
  ctx.font = `bold 22px ${FA_FONT}`
  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.fillText('SMDB  ·  sahandse.github.io/Smdb', S / 2, S - 20)

  return canvas.toDataURL('image/png')
}

export function downloadPng(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
