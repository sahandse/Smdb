import type { AppState } from './types'
import {
  fetchMovieData,
  translateToFarsi,
  buildMp4Url,
  buildVideoPageUrl,
  buildEmbedUrl,
  buildAltEmbedUrl,
  buildIframeCode,
  buildShortcode,
  getPosterVariants,
} from './api'
import { translateGenres, translateCountries, translateLanguages } from './translations'
import { generateTelegramPng, generateInstagramPng, downloadPng } from './canvas-cards'

// ─── State ────────────────────────────────────────────────────────────────────

const state: AppState = {
  imdbCode: '',
  videoCode: '',
  apiKey: localStorage.getItem('smdb_apiKey') || '',
  movie: null,
  persianPlot: '',
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
// Declared as let so they can be assigned after DOMContentLoaded fires,
// since vite-plugin-singlefile places the script in <head>.

let inputImdb:   HTMLInputElement
let inputVideo:  HTMLInputElement
let inputApiKey: HTMLInputElement
let btnFetch:    HTMLButtonElement
let btnReset:    HTMLButtonElement
let resultsEl:   HTMLElement
let loadingEl:   HTMLElement
let errorEl:     HTMLElement
let errorText:   HTMLElement
let statusEl:    HTMLElement

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function copyText(text: string, btn?: HTMLElement | null) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.innerHTML
      btn.innerHTML = '✓ کپی'
      btn.classList.add('copied')
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied') }, 1800)
    }
  })
}

function showError(msg: string) {
  errorText.textContent = msg
  errorEl.style.display = 'block'
}
function hideError() { errorEl.style.display = 'none' }

function setStatus(msg: string) { statusEl.textContent = msg; statusEl.style.display = msg ? 'block' : 'none' }

function setLoading(on: boolean) {
  loadingEl.style.display = on ? 'flex' : 'none'
  btnFetch.disabled = on
}

function stars(rating: string): string {
  const r = parseFloat(rating) / 2
  return [1,2,3,4,5].map(i => i <= Math.round(r) ? '★' : '☆').join('')
}

// copy block html helper
function cb(id: string, text: string, rawText?: string): string {
  const escaped = esc(text)
  const dataRaw = rawText ? ` data-raw="${esc(rawText)}"` : ''
  return `<div class="copy-block"><span id="${id}" class="cb-text">${escaped}</span><button class="copy-btn" data-copy="${id}"${dataRaw}>کپی</button></div>`
}

// ─── Persian intro ────────────────────────────────────────────────────────────

function buildPersianIntro(): string {
  const m = state.movie!
  const genreFa = translateGenres(m.Genre)
  const countryFa = translateCountries(m.Country)
  const langFa = translateLanguages(m.Language)
  return `🎬 معرفی فیلم: ${m.Title} (${m.Year})

📌 ژانر: ${genreFa}
🎭 کارگردان: ${m.Director}
✍️ نویسنده: ${m.Writer}
🌍 کشور: ${countryFa}
🗣️ زبان: ${langFa}
⏱️ مدت زمان: ${m.Runtime}
⭐ امتیاز IMDb: ${m.imdbRating}/10 (${m.imdbVotes} رای)
🏆 جوایز: ${m.Awards}

📖 خلاصه داستان:
${state.persianPlot || m.Plot}

🎭 بازیگران:
${m.Actors.split(', ').map(a => `• ${a}`).join('\n')}

#فیلم #سینما #IMDb #${m.Title.replace(/\s+/g, '_')}`
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(mp4Url: string) {
  const m = state.movie!
  const vc = state.videoCode
  const videoPageUrl  = buildVideoPageUrl(vc)
  const embedUrl      = buildEmbedUrl(vc)
  const altEmbedUrl   = buildAltEmbedUrl(vc)
  const iframeCode    = buildIframeCode(vc, m.Title)
  const shortcode     = buildShortcode(vc, m.Title)
  const posterVariants = getPosterVariants(m.Poster)
  const genreFa       = translateGenres(m.Genre)
  const countryFa     = translateCountries(m.Country)
  const langFa        = translateLanguages(m.Language)
  const persianIntro  = buildPersianIntro()
  const actors        = m.Actors.split(', ')

  const hasPoster = m.Poster && m.Poster !== 'N/A'

  resultsEl.innerHTML = `

  <!-- ── MOVIE CARD ─────────────────────────────────────── -->
  <section class="card movie-card">
    <div class="movie-hero">
      ${hasPoster ? `
      <div class="poster-wrap">
        <img id="main-poster" src="${esc(m.Poster)}" alt="${esc(m.Title)}" class="main-poster">
        <a href="${esc(m.Poster)}" download="${esc(m.Title.replace(/\s+/g,'_'))}_poster.jpg"
          class="dl-overlay" title="دانلود پوستر">⬇ دانلود</a>
      </div>` : ''}
      <div class="movie-meta">
        <div class="rating-badge">${esc(m.imdbRating)} <span class="stars">${stars(m.imdbRating)}</span></div>

        <h1 class="movie-title">${esc(m.Title)}</h1>
        <div class="section-label">📋 عنوان فیلم</div>
        ${cb('copy-title-en', m.Title)}

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">📅 سال</span>${cb('copy-year', m.Year)}</div>
          <div class="meta-item"><span class="meta-label">⏱ مدت</span>${cb('copy-runtime', m.Runtime)}</div>
          <div class="meta-item"><span class="meta-label">🎭 ژانر</span>${cb('copy-genre', genreFa)}</div>
          <div class="meta-item"><span class="meta-label">🌍 کشور</span>${cb('copy-country', countryFa)}</div>
          <div class="meta-item"><span class="meta-label">🗣 زبان</span>${cb('copy-lang', langFa)}</div>
          <div class="meta-item"><span class="meta-label">⭐ امتیاز</span>${cb('copy-rating', `${m.imdbRating}/10 (${m.imdbVotes} رای)`)}</div>
          <div class="meta-item"><span class="meta-label">🎬 کارگردان</span>${cb('copy-dir', m.Director)}</div>
          <div class="meta-item"><span class="meta-label">✍ نویسنده</span>${cb('copy-writer', m.Writer)}</div>
          <div class="meta-item"><span class="meta-label">🏆 جوایز</span>${cb('copy-awards', m.Awards)}</div>
          ${m.BoxOffice && m.BoxOffice !== 'N/A' ? `<div class="meta-item"><span class="meta-label">💰 گیشه</span>${cb('copy-box', m.BoxOffice)}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Plot EN + FA -->
    <div class="plot-section">
      <div class="plot-block">
        <div class="section-label">📖 خلاصه داستان (انگلیسی)</div>
        ${cb('copy-plot-en', m.Plot)}
      </div>
      ${state.persianPlot ? `
      <div class="plot-block">
        <div class="section-label">📖 خلاصه داستان (فارسی)</div>
        ${cb('copy-plot-fa', state.persianPlot)}
      </div>` : ''}
    </div>
  </section>

  <!-- ── TRAILER ────────────────────────────────────────── -->
  ${vc ? `
  <section class="card">
    <h2 class="card-title">🎬 تیزر / تریلر</h2>
    <div class="video-wrap">
      <iframe src="${esc(embedUrl)}" allowfullscreen allow="fullscreen" title="${esc(m.Title)} trailer"></iframe>
    </div>
    <div class="video-actions">
      <a href="${esc(videoPageUrl)}" target="_blank" class="action-btn">🔗 صفحه ویدئو IMDb</a>
      <a href="${esc(videoPageUrl)}" target="_blank" class="action-btn">⬇ دانلود تیزر</a>
    </div>
  </section>` : ''}

  <!-- ── LINKS & CODES ──────────────────────────────────── -->
  ${vc ? `
  <section class="card">
    <h2 class="card-title">🔗 لینک‌ها و کدها</h2>
    <div class="links-grid">

      <div class="link-item">
        <div class="link-label">📄 صفحه ویدئو IMDb</div>
        ${cb('lnk-video-page', videoPageUrl)}
      </div>

      <div class="link-item">
        <div class="link-label">🔗 لینک Embed رسمی</div>
        ${cb('lnk-embed', embedUrl)}
      </div>

      <div class="link-item">
        <div class="link-label">🔄 Embed جایگزین</div>
        ${cb('lnk-alt-embed', altEmbedUrl)}
      </div>

      <div class="link-item">
        <div class="link-label">📹 لینک مستقیم MP4</div>
        ${mp4Url
          ? cb('lnk-mp4', mp4Url)
          : `<div class="copy-block"><span class="cb-text link-note">لینک MP4 پیدا نشد — از دستور زیر استفاده کنید:</span></div>
             ${cb('lnk-mp4-cmd', `yt-dlp ${videoPageUrl}`)}`}
      </div>

      <div class="link-item full-width">
        <div class="link-label">🖼 کد iframe برای سایت</div>
        <div class="copy-block">
          <code id="lnk-iframe" class="cb-text code-val">${esc(iframeCode)}</code>
          <button class="copy-btn" data-copy="lnk-iframe" data-raw="${esc(iframeCode)}">کپی کد</button>
        </div>
      </div>

      <div class="link-item full-width">
        <div class="link-label">⚡ شورت‌کد (Shortcode)</div>
        ${cb('lnk-shortcode', shortcode)}
      </div>

    </div>
  </section>` : ''}

  <!-- ── CAST ──────────────────────────────────────────── -->
  <section class="card">
    <h2 class="card-title">🎭 بازیگران <span class="hint">(کلیک = کپی)</span></h2>
    <div class="cast-grid">
      ${actors.map(a => `
        <button class="actor-chip" data-name="${esc(a)}" title="کپی نام">
          <span class="actor-avatar">${esc(a.charAt(0))}</span>
          <span>${esc(a)}</span>
        </button>`).join('')}
    </div>
    <div class="section-label mt-1">کپی همه بازیگران</div>
    ${cb('copy-all-actors', m.Actors)}
  </section>

  <!-- ── GALLERY ────────────────────────────────────────── -->
  ${posterVariants.length ? `
  <section class="card">
    <h2 class="card-title">🖼 گالری تصاویر</h2>
    <div class="gallery-grid">
      ${posterVariants.map((url, i) => {
        const labels = ['کوچک (300px)', 'متوسط (600px)', 'بزرگ (1080px)', 'اصلی (HD)']
        return `
        <div class="gallery-item">
          <img src="${esc(url)}" alt="${esc(m.Title)} ${i+1}" class="gallery-img"
            onerror="this.parentElement.style.display='none'" loading="lazy">
          <div class="gallery-actions">
            <span class="gallery-label">${labels[i] || `تصویر ${i+1}`}</span>
            <a href="${esc(url)}" download="${esc(m.Title.replace(/\s+/g,'_'))}_${i+1}.jpg"
              class="dl-btn" target="_blank">⬇</a>
          </div>
          <div class="gallery-url-row">
            ${cb(`g-url-${i}`, url)}
          </div>
        </div>`
      }).join('')}
    </div>
    <div class="gallery-more">
      <a href="https://www.imdb.com/title/${esc(m.imdbID)}/mediaindex" target="_blank" class="action-btn">
        📸 گالری کامل در IMDb
      </a>
    </div>
  </section>` : ''}

  <!-- ── PERSIAN INTRO ─────────────────────────────────── -->
  <section class="card">
    <h2 class="card-title">📝 متن معرفی فارسی</h2>
    <div class="copy-block">
      <pre id="copy-persian-intro" class="cb-text pre-text">${esc(persianIntro)}</pre>
      <button class="copy-btn" data-copy="copy-persian-intro">کپی متن</button>
    </div>
  </section>

  <!-- ── SOCIAL CARDS ──────────────────────────────────── -->
  <section class="card">
    <h2 class="card-title">📲 کارت شبکه‌های اجتماعی (فارسی · PNG)</h2>

    <div class="social-section">
      <div class="social-label">📬 تلگرام (1280×640)</div>
      <div id="tg-preview" class="card-preview">
        <div class="card-preview-inner tg-card">
          <div class="tg-left">
            ${hasPoster ? `<img src="${esc(m.Poster)}" alt="poster" class="tg-poster">` : ''}
          </div>
          <div class="tg-right">
            <div class="tg-rating">⭐ ${esc(m.imdbRating)}/10</div>
            <div class="tg-title">${esc(m.Title)}</div>
            <div class="tg-sub">${esc(m.Year)} · ${esc(genreFa)}</div>
            <div class="tg-meta">🎬 ${esc(m.Director)}</div>
            <div class="tg-meta">🎭 ${esc(actors.slice(0,3).join(' · '))}</div>
            <div class="tg-plot">${esc((state.persianPlot || m.Plot).substring(0,200))}...</div>
          </div>
        </div>
      </div>
      <div class="social-actions">
        <button class="action-btn" id="dl-tg-png">⬇ دانلود PNG تلگرام</button>
        <button class="copy-btn" id="copy-tg-text">کپی متن فارسی</button>
      </div>
    </div>

    <div class="social-section">
      <div class="social-label">📸 اینستاگرام (1080×1080)</div>
      <div id="ig-preview" class="card-preview">
        <div class="card-preview-inner ig-card">
          ${hasPoster ? `
          <div class="ig-bg" style="background-image:url('${esc(m.Poster)}')"></div>
          <div class="ig-overlay"></div>` : ''}
          <div class="ig-content">
            <div class="ig-rating">⭐ ${esc(m.imdbRating)}</div>
            <div class="ig-title">${esc(m.Title)}</div>
            <div class="ig-year">${esc(m.Year)} | ${esc(genreFa)}</div>
            <div class="ig-dir">کارگردان: ${esc(m.Director)}</div>
            <div class="ig-actors">${esc(actors.slice(0,3).join(' · '))}</div>
            <div class="ig-brand">SMDB</div>
          </div>
        </div>
      </div>
      <div class="social-actions">
        <button class="action-btn" id="dl-ig-png">⬇ دانلود PNG اینستاگرام</button>
      </div>
    </div>

  </section>

  `

  resultsEl.style.display = 'block'
  bindEvents()
}

// ─── Bind events ──────────────────────────────────────────────────────────────

function bindEvents() {
  // Generic copy buttons
  document.querySelectorAll<HTMLButtonElement>('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copy!
      const rawEncoded = btn.dataset.raw
      const text = rawEncoded ? rawEncoded : (document.getElementById(id)?.textContent?.trim() ?? '')
      copyText(text, btn)
    })
  })

  // Actor chips
  document.querySelectorAll<HTMLButtonElement>('.actor-chip').forEach(chip => {
    chip.addEventListener('click', () => copyText(chip.dataset.name ?? '', chip))
  })

  // Gallery lightbox
  document.querySelectorAll<HTMLImageElement>('.gallery-img').forEach(img => {
    img.addEventListener('click', () => {
      const lb = document.createElement('div')
      lb.className = 'lightbox'
      lb.innerHTML = `<div class="lb-inner"><img src="${img.src}" alt=""><button class="lb-close">✕</button></div>`
      document.body.appendChild(lb)
      lb.addEventListener('click', e => {
        if (e.target === lb || (e.target as HTMLElement).classList.contains('lb-close'))
          document.body.removeChild(lb)
      })
    })
  })

  // Social card – copy text
  document.getElementById('copy-tg-text')?.addEventListener('click', e => {
    copyText(buildPersianIntro(), e.currentTarget as HTMLElement)
  })

  // Social card – download PNG Telegram
  document.getElementById('dl-tg-png')?.addEventListener('click', async () => {
    const btn = document.getElementById('dl-tg-png') as HTMLButtonElement
    btn.textContent = '⏳ در حال ساخت...'
    btn.disabled = true
    try {
      const dataUrl = await generateTelegramPng(state.movie!, state.persianPlot)
      downloadPng(dataUrl, `${state.movie!.Title.replace(/\s+/g,'_')}_telegram.png`)
    } catch (e) {
      alert('خطا در ساخت تصویر: ' + String(e))
    } finally {
      btn.textContent = '⬇ دانلود PNG تلگرام'
      btn.disabled = false
    }
  })

  // Social card – download PNG Instagram
  document.getElementById('dl-ig-png')?.addEventListener('click', async () => {
    const btn = document.getElementById('dl-ig-png') as HTMLButtonElement
    btn.textContent = '⏳ در حال ساخت...'
    btn.disabled = true
    try {
      const dataUrl = await generateInstagramPng(state.movie!, state.persianPlot)
      downloadPng(dataUrl, `${state.movie!.Title.replace(/\s+/g,'_')}_instagram.png`)
    } catch (e) {
      alert('خطا در ساخت تصویر: ' + String(e))
    } finally {
      btn.textContent = '⬇ دانلود PNG اینستاگرام'
      btn.disabled = false
    }
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function handleFetch() {
  hideError()
  const imdb   = inputImdb.value.trim()
  const video  = inputVideo.value.trim()
  const apiKey = inputApiKey.value.trim()

  if (!imdb)   { showError('کد IMDb را وارد کنید (مثال: tt0133093)'); return }
  if (!apiKey) { showError('کلید API OMDB را وارد کنید — رایگان از omdbapi.com'); return }

  state.imdbCode  = imdb
  state.videoCode = video
  state.apiKey    = apiKey
  localStorage.setItem('smdb_apiKey', apiKey)

  setLoading(true)
  resultsEl.style.display = 'none'
  resultsEl.innerHTML = ''
  setStatus('در حال دریافت اطلاعات فیلم...')

  try {
    state.movie = await fetchMovieData(imdb, apiKey)
    setStatus('در حال ترجمه خلاصه به فارسی...')
    if (state.movie.Plot && state.movie.Plot !== 'N/A') {
      state.persianPlot = await translateToFarsi(state.movie.Plot.substring(0, 500))
    }

    const mp4Url = video ? buildMp4Url(video) : ''

    setStatus('')
    render(mp4Url)
  } catch (err) {
    showError(err instanceof Error ? err.message : 'خطای ناشناخته')
  } finally {
    setLoading(false)
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function handleReset() {
  inputImdb.value  = ''
  inputVideo.value = ''
  state.movie      = null
  state.persianPlot = ''
  resultsEl.style.display = 'none'
  resultsEl.innerHTML = ''
  hideError()
  setStatus('')
  inputImdb.focus()
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  inputImdb    = document.getElementById('input-imdb')   as HTMLInputElement
  inputVideo   = document.getElementById('input-video')  as HTMLInputElement
  inputApiKey  = document.getElementById('input-apikey') as HTMLInputElement
  btnFetch     = document.getElementById('btn-fetch')    as HTMLButtonElement
  btnReset     = document.getElementById('btn-reset')    as HTMLButtonElement
  resultsEl    = document.getElementById('results')      as HTMLElement
  loadingEl    = document.getElementById('loading')      as HTMLElement
  errorEl      = document.getElementById('error-msg')    as HTMLElement
  errorText    = document.getElementById('error-text')   as HTMLElement
  statusEl     = document.getElementById('status-msg')   as HTMLElement

  inputApiKey.value = state.apiKey

  btnFetch.addEventListener('click', handleFetch)
  btnReset.addEventListener('click', handleReset)
  inputImdb.addEventListener('keydown',   e => { if (e.key === 'Enter') inputVideo.focus() })
  inputVideo.addEventListener('keydown',  e => { if (e.key === 'Enter') handleFetch() })
  inputApiKey.addEventListener('keydown', e => { if (e.key === 'Enter') handleFetch() })
})
