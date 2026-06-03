import { marked } from 'marked'
import katex from 'katex'

marked.setOptions({
  breaks: true,
  gfm: true,
})

// Protect code spans + blocks, render math, then markdown
export function renderContent(text: string): string {
  if (!text?.trim()) return ''

  // 1. Stash fenced code blocks  ```...```
  const fenced: string[] = []
  let s = text.replace(/```[\s\S]*?```/g, (m) => {
    fenced.push(m)
    return `\x00FENCED${fenced.length - 1}\x00`
  })

  // 2. Stash inline code `...`
  const inlined: string[] = []
  s = s.replace(/`[^`\n]+`/g, (m) => {
    inlined.push(m)
    return `\x00INLINED${inlined.length - 1}\x00`
  })

  // 3. Block math  $$...$$
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, output: 'html' })
    } catch {
      return `<code>$$${math}$$</code>`
    }
  })

  // 4. Inline math  $...$  (not $$)
  s = s.replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, output: 'html' })
    } catch {
      return `<code>$${math}$</code>`
    }
  })

  // 5. Restore stashes
  inlined.forEach((v, i) => { s = s.replace(`\x00INLINED${i}\x00`, v) })
  fenced.forEach((v, i)  => { s = s.replace(`\x00FENCED${i}\x00`,  v) })

  // 6. Markdown → HTML
  return marked.parse(s) as string
}
