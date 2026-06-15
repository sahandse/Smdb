import './style.css'
import type { AppState } from './types'
import {
  fetchMovieData,
  translateToFarsi,
  buildVideoPageUrl,
  buildEmbedUrl,
  buildAltEmbedUrl,
  buildIframeCode,
  buildShortcode,
  getPosterVariants,
} from './api'
import { translateGenres, translateCountries, translateLanguages } from './translations'

// ─── State ────────────────────────────────────────────────────────────────────

const state: AppState = {
  imdbCode: '',
  videoCode: '',
  apiKey: localStorage.getItem('smdb_apiKey') || '',
  movie: null,
  persianPlot: '',
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const inputImdb = document.getElementById('input-imdb') as HTMLInputElement
const inputVideo = document.getElementById('input-video') as HTMLInputElement
const inputApiKey = document.getElementById('input-apikey') as HTMLInputElement
const btnFetch = document.getElementById('btn-fetch') as HTMLButtonElement
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement
const resultsSection = document.getElementById('results') as HTMLElement
const loadingEl = document.getElementById('loading') as HTMLElement
const errorEl = document.getElementById('error-msg') as HTMLElement
const errorText = document.getElementById('error-text') as HTMLElement

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyText(text: string, btn?: HTMLElement | null) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.textContent || ''
      btn.textContent = '✓ کپی شد'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = orig
        btn.classList.remove('copied')
      }, 1800)
    }
  })
}

function showError(msg: string) {
  errorText.textContent = msg
  errorEl.style.display = 'block'
}

function hideError() {
  errorEl.style.display = 'none'
}

function setLoading(on: boolean) {
  loadingEl.style.display = on ? 'flex' : 'none'
  btnFetch.disabled = on
}

function stars(rating: string): string {
  const r = parseFloat(rating) / 2
  let out = ''
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '★'
    else if (r >= i - 0.5) out += '☆'
    else out += '☆'
  }
  return out
}

// ─── Build Persian description ────────────────────────────────────────────────

function buildPersianIntro(persianPlot: string): string {
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
${persianPlot || m.Plot}

🎭 بازیگران:
${m.Actors.split(', ')
  .map((a) => `• ${a}`)
  .join('\n')}

#فیلم #سینما #IMDb #${m.Title.replace(/\s+/g, '_')}`
}

// ─── Build social card HTML ───────────────────────────────────────────────────

function buildTelegramCard(): string {
  const m = state.movie!
  const genreFa = translateGenres(m.Genre)
  return `
<div class="social-card telegram-card">
  <div class="sc-header">
    <img src="${m.Poster}" alt="${m.Title}" class="sc-poster" onerror="this.style.display='none'">
    <div class="sc-info">
      <div class="sc-title">${m.Title}</div>
      <div class="sc-year">${m.Year} · ${genreFa}</div>
      <div class="sc-rating">⭐ ${m.imdbRating}/10</div>
      <div class="sc-director">🎬 ${m.Director}</div>
    </div>
  </div>
  <div class="sc-plot">${m.Plot.substring(0, 200)}${m.Plot.length > 200 ? '...' : ''}</div>
  <div class="sc-footer">
    <span>🎭 ${m.Actors.split(', ').slice(0, 3).join(' · ')}</span>
  </div>
  <div class="sc-brand">SMDB · sahandse.github.io/Smdb</div>
</div>`
}

function buildInstagramCard(): string {
  const m = state.movie!
  const genreFa = translateGenres(m.Genre)
  return `
<div class="social-card instagram-card">
  <div class="ig-bg" style="background-image: url('${m.Poster}')"></div>
  <div class="ig-overlay"></div>
  <div class="ig-content">
    <div class="ig-rating">⭐ ${m.imdbRating}</div>
    <div class="ig-title">${m.Title}</div>
    <div class="ig-year">${m.Year} | ${genreFa}</div>
    <div class="ig-director">کارگردان: ${m.Director}</div>
    <div class="ig-actors">${m.Actors.split(', ').slice(0, 3).join(' · ')}</div>
    <div class="ig-brand">SMDB</div>
  </div>
</div>`
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadCardAsImage(cardEl: HTMLElement, filename: string) {
  // Open card in new window for easy screenshot/print
  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <style>
      body{margin:0;padding:20px;background:#0f0f0f;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;}
      ${Array.from(document.styleSheets).flatMap(s => { try { return Array.from(s.cssRules).map(r => r.cssText) } catch { return [] } }).join('\n')}
    </style></head><body>${cardEl.outerHTML}
    <script>setTimeout(()=>window.print(),400)<\/script>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'width=600,height=500')
  if (!win) {
    alert(`برای دانلود "${filename}" روی کارت راست‌کلیک کرده و "Save image as" را انتخاب کنید.`)
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function downloadImage(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const m = state.movie!
  const vc = state.videoCode
  const videoPageUrl = buildVideoPageUrl(vc)
  const embedUrl = buildEmbedUrl(vc)
  const altEmbedUrl = buildAltEmbedUrl(vc)
  const iframeCode = buildIframeCode(vc)
  const shortcode = buildShortcode(vc, m.Title)
  const posterVariants = getPosterVariants(m.Poster)
  const genreFa = translateGenres(m.Genre)
  const countryFa = translateCountries(m.Country)
  const langFa = translateLanguages(m.Language)
  const persianIntro = buildPersianIntro(state.persianPlot)
  const actors = m.Actors.split(', ')

  resultsSection.innerHTML = `

  <!-- ── MOVIE CARD ─────────────────────────────── -->
  <section class="card movie-card">
    <div class="movie-hero">
      <div class="poster-wrap">
        <img id="main-poster" src="${m.Poster !== 'N/A' ? m.Poster : ''}"
          alt="${m.Title}" class="main-poster" onerror="this.src=''">
        <a href="${m.Poster !== 'N/A' ? m.Poster : '#'}" download="${m.Title.replace(/\s+/g,'_')}_poster.jpg"
          class="dl-overlay" title="دانلود پوستر">⬇ دانلود</a>
      </div>
      <div class="movie-meta">
        <div class="rating-badge">${m.imdbRating} <span class="stars">${stars(m.imdbRating)}</span></div>
        <h1 class="movie-title">${m.Title}</h1>
        <div class="movie-title-fa copy-block">
          <span id="title-fa-text">${m.Title} (${m.Year})</span>
          <button class="copy-btn" data-copy="title-fa-text">کپی</button>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">📅 سال</span><span>${m.Year}</span></div>
          <div class="meta-item"><span class="meta-label">⏱ مدت</span><span>${m.Runtime}</span></div>
          <div class="meta-item"><span class="meta-label">🎭 ژانر</span><span>${genreFa}</span></div>
          <div class="meta-item"><span class="meta-label">🌍 کشور</span><span>${countryFa}</span></div>
          <div class="meta-item"><span class="meta-label">🗣 زبان</span><span>${langFa}</span></div>
          <div class="meta-item"><span class="meta-label">🎬 کارگردان</span><span>${m.Director}</span></div>
          <div class="meta-item"><span class="meta-label">✍ نویسنده</span><span>${m.Writer}</span></div>
          <div class="meta-item"><span class="meta-label">🏆 جوایز</span><span>${m.Awards}</span></div>
          ${m.BoxOffice && m.BoxOffice !== 'N/A' ? `<div class="meta-item"><span class="meta-label">💰 گیشه</span><span>${m.BoxOffice}</span></div>` : ''}
        </div>
      </div>
    </div>

    <!-- Plot EN + FA -->
    <div class="plot-section">
      <div class="plot-block">
        <div class="section-label">📖 خلاصه داستان (انگلیسی)</div>
        <div class="plot-text copy-block">
          <span id="plot-en-text">${m.Plot}</span>
          <button class="copy-btn" data-copy="plot-en-text">کپی</button>
        </div>
      </div>
      ${state.persianPlot ? `
      <div class="plot-block">
        <div class="section-label">📖 خلاصه داستان (فارسی)</div>
        <div class="plot-text copy-block">
          <span id="plot-fa-text">${state.persianPlot}</span>
          <button class="copy-btn" data-copy="plot-fa-text">کپی</button>
        </div>
      </div>` : ''}
    </div>
  </section>

  <!-- ── TRAILER ─────────────────────────────────── -->
  ${vc ? `
  <section class="card">
    <h2 class="card-title">🎬 تیزر / تریلر</h2>
    <div class="video-wrap">
      <iframe src="${embedUrl}"
        allowfullscreen allow="fullscreen" title="${m.Title} trailer"></iframe>
    </div>
    <div class="video-actions">
      <a href="${videoPageUrl}" target="_blank" class="action-btn">🔗 صفحه ویدئو IMDb</a>
      <a href="${videoPageUrl}" download class="action-btn">⬇ دانلود تیزر</a>
    </div>
  </section>` : ''}

  <!-- ── LINKS & CODES ───────────────────────────── -->
  ${vc ? `
  <section class="card">
    <h2 class="card-title">🔗 لینک‌ها و کدها</h2>
    <div class="links-grid">

      <div class="link-item">
        <div class="link-label">📄 صفحه ویدئو IMDb</div>
        <div class="copy-block">
          <span id="link-video-page" class="link-val">${videoPageUrl}</span>
          <button class="copy-btn" data-copy="link-video-page">کپی</button>
        </div>
      </div>

      <div class="link-item">
        <div class="link-label">🔗 لینک Embed رسمی</div>
        <div class="copy-block">
          <span id="link-embed" class="link-val">${embedUrl}</span>
          <button class="copy-btn" data-copy="link-embed">کپی</button>
        </div>
      </div>

      <div class="link-item">
        <div class="link-label">🔄 Embed جایگزین IMDb</div>
        <div class="copy-block">
          <span id="link-alt-embed" class="link-val">${altEmbedUrl}</span>
          <button class="copy-btn" data-copy="link-alt-embed">کپی</button>
        </div>
      </div>

      <div class="link-item">
        <div class="link-label">📹 آدرس MP4 (از طریق ابزار)</div>
        <div class="copy-block">
          <span id="link-mp4" class="link-val link-note">IMDb لینک مستقیم MP4 ارائه نمی‌دهد — برای دانلود از yt-dlp یا 4K Video Downloader استفاده کنید: yt-dlp ${videoPageUrl}</span>
          <button class="copy-btn" data-copy="link-mp4">کپی دستور</button>
        </div>
      </div>

      <div class="link-item full-width">
        <div class="link-label">🖼 کد iframe برای سایت</div>
        <div class="copy-block">
          <span id="link-iframe" class="link-val code-val">${iframeCode.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
          <button class="copy-btn" data-copy="link-iframe" data-raw="${encodeURIComponent(iframeCode)}">کپی کد</button>
        </div>
      </div>

      <div class="link-item full-width">
        <div class="link-label">⚡ شورت‌کد (Shortcode)</div>
        <div class="copy-block">
          <span id="link-shortcode" class="link-val code-val">${shortcode}</span>
          <button class="copy-btn" data-copy="link-shortcode">کپی</button>
        </div>
      </div>

    </div>
  </section>` : ''}

  <!-- ── CAST ────────────────────────────────────── -->
  <section class="card">
    <h2 class="card-title">🎭 بازیگران <span class="hint">(کلیک = کپی)</span></h2>
    <div class="cast-grid">
      ${actors.map(a => `
        <button class="actor-chip" data-name="${a}" title="کپی نام">
          <span class="actor-avatar">${a.charAt(0)}</span>
          <span>${a}</span>
        </button>`).join('')}
    </div>
    <div class="copy-block mt-1">
      <span id="all-actors-text" class="link-val">${m.Actors}</span>
      <button class="copy-btn" data-copy="all-actors-text">کپی همه</button>
    </div>
  </section>

  <!-- ── GALLERY ─────────────────────────────────── -->
  ${posterVariants.length ? `
  <section class="card">
    <h2 class="card-title">🖼 گالری تصاویر</h2>
    <div class="gallery-grid">
      ${posterVariants.map((url, i) => {
        const labels = ['کوچک (300px)', 'متوسط (600px)', 'بزرگ (1080px)', 'اصلی (HD)']
        return `
        <div class="gallery-item">
          <img src="${url}" alt="${m.Title} image ${i + 1}" class="gallery-img"
            onerror="this.parentElement.style.display='none'" loading="lazy">
          <div class="gallery-actions">
            <span class="gallery-label">${labels[i] || `تصویر ${i+1}`}</span>
            <a href="${url}" download="${m.Title.replace(/\s+/g,'_')}_${i+1}.jpg"
              class="dl-btn" target="_blank">⬇</a>
          </div>
        </div>`
      }).join('')}
    </div>
    <div class="gallery-more">
      <a href="https://www.imdb.com/title/${m.imdbID}/mediaindex" target="_blank" class="action-btn">
        📸 مشاهده گالری کامل در IMDb
      </a>
    </div>
  </section>` : ''}

  <!-- ── PERSIAN INTRO ───────────────────────────── -->
  <section class="card">
    <h2 class="card-title">📝 متن معرفی فارسی</h2>
    <div class="persian-intro copy-block">
      <pre id="persian-intro-text" class="pre-text">${persianIntro}</pre>
      <button class="copy-btn" data-copy="persian-intro-text">کپی متن کامل</button>
    </div>
  </section>

  <!-- ── SOCIAL CARDS ────────────────────────────── -->
  <section class="card">
    <h2 class="card-title">📲 کارت معرفی برای شبکه‌های اجتماعی</h2>

    <div class="social-section">
      <div class="social-label">📬 کارت تلگرام</div>
      <div id="telegram-card-wrap">${buildTelegramCard()}</div>
      <div class="social-actions">
        <button class="action-btn" id="dl-telegram">⬇ دانلود کارت تلگرام</button>
        <button class="copy-btn" id="copy-telegram-text">کپی متن</button>
      </div>
    </div>

    <div class="social-section">
      <div class="social-label">📸 کارت اینستاگرام</div>
      <div id="instagram-card-wrap">${buildInstagramCard()}</div>
      <div class="social-actions">
        <button class="action-btn" id="dl-instagram">⬇ دانلود کارت اینستاگرام</button>
      </div>
    </div>
  </section>

  `

  resultsSection.style.display = 'block'
  bindResultEvents()
}

// ─── Bind events on rendered results ─────────────────────────────────────────

function bindResultEvents() {
  // Generic copy buttons
  document.querySelectorAll<HTMLButtonElement>('.copy-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copy!
      const rawEncoded = btn.dataset.raw
      let text = ''
      if (rawEncoded) {
        text = decodeURIComponent(rawEncoded)
      } else {
        const el = document.getElementById(id)
        text = el?.textContent?.trim() || ''
      }
      copyText(text, btn)
    })
  })

  // Actor chips
  document.querySelectorAll<HTMLButtonElement>('.actor-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.name || ''
      copyText(name, chip)
    })
  })

  // Social cards
  const dlTelegram = document.getElementById('dl-telegram')
  const dlInstagram = document.getElementById('dl-instagram')
  const copyTelegramText = document.getElementById('copy-telegram-text')

  dlTelegram?.addEventListener('click', () => {
    const card = document.querySelector<HTMLElement>('#telegram-card-wrap .telegram-card')
    if (card) downloadCardAsImage(card, `${state.movie!.Title.replace(/\s+/g,'_')}_telegram.png`)
  })

  dlInstagram?.addEventListener('click', () => {
    const card = document.querySelector<HTMLElement>('#instagram-card-wrap .instagram-card')
    if (card) downloadCardAsImage(card, `${state.movie!.Title.replace(/\s+/g,'_')}_instagram.png`)
  })

  copyTelegramText?.addEventListener('click', () => {
    const text = buildPersianIntro(state.persianPlot)
    copyText(text, copyTelegramText)
  })

  // Gallery images - open lightbox on click
  document.querySelectorAll<HTMLImageElement>('.gallery-img').forEach((img) => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div')
      overlay.className = 'lightbox'
      overlay.innerHTML = `<div class="lb-inner"><img src="${img.src}" alt=""><button class="lb-close">✕</button></div>`
      document.body.appendChild(overlay)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || (e.target as HTMLElement).classList.contains('lb-close')) {
          document.body.removeChild(overlay)
        }
      })
    })
  })

  // Poster click
  document.getElementById('main-poster')?.addEventListener('click', () => {
    downloadImage(state.movie!.Poster, `${state.movie!.Title.replace(/\s+/g,'_')}_poster.jpg`)
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function handleFetch() {
  hideError()
  const imdb = inputImdb.value.trim()
  const video = inputVideo.value.trim()
  const apiKey = inputApiKey.value.trim()

  if (!imdb) { showError('کد IMDb را وارد کنید (مثال: tt0133093)'); return }
  if (!apiKey) { showError('کلید API OMDB را وارد کنید — رایگان از omdbapi.com'); return }

  state.imdbCode = imdb
  state.videoCode = video
  state.apiKey = apiKey
  localStorage.setItem('smdb_apiKey', apiKey)

  setLoading(true)
  resultsSection.style.display = 'none'

  try {
    state.movie = await fetchMovieData(imdb, apiKey)

    // Translate plot
    if (state.movie.Plot && state.movie.Plot !== 'N/A') {
      state.persianPlot = await translateToFarsi(state.movie.Plot.substring(0, 500))
    }

    render()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'خطای ناشناخته')
  } finally {
    setLoading(false)
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function handleReset() {
  inputImdb.value = ''
  inputVideo.value = ''
  state.movie = null
  state.persianPlot = ''
  resultsSection.style.display = 'none'
  resultsSection.innerHTML = ''
  hideError()
  inputImdb.focus()
}

// ─── Init ─────────────────────────────────────────────────────────────────────

inputApiKey.value = state.apiKey

btnFetch.addEventListener('click', handleFetch)
btnReset.addEventListener('click', handleReset)

inputImdb.addEventListener('keydown', (e) => { if (e.key === 'Enter') inputVideo.focus() })
inputVideo.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFetch() })
inputApiKey.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFetch() })

// Auto-fill example on load
inputImdb.placeholder = 'tt0133093'
inputVideo.placeholder = 'vi1472252697'
