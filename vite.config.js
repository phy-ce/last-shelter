import { defineConfig } from 'vite'

// GitHub Pages는 /<repo>/ 아래에서 서빙한다. 코드 곳곳의 '/assets/...' 절대 경로를
// 빌드 때만 base 기준으로 바꾼다. 로컬 dev(base '/')에서는 아무것도 바꾸지 않는다.
const base = process.env.PAGES_BASE || '/'
const rebase = code => code.replace(/(["'`(])\/assets\//g, `$1${base}assets/`)

export default defineConfig({
  base,
  plugins: base === '/' ? [] : [{
    name: 'rebase-public-assets',
    enforce: 'pre',
    transform(code, id) {
      if (/\.(js|css)$/.test(id) && code.includes('/assets/')) return { code: rebase(code), map: null }
    },
    transformIndexHtml: html => rebase(html),
  }],
})
