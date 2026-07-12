let sent = false

const sendRankingData = (text = document.body?.innerText) => {
  if (sent) return true
  if (!text) return false

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return false

  try {
    const data = JSON.parse(text.slice(start, end + 1).replace(/\u00a0/g, ' '))
    if (!Array.isArray(data.items)) return false

    sent = true
    const port = chrome.runtime.connect({ name: 'entrant-hub-page' })
    port.postMessage({ url: location.href, data })
    return true
  } catch {
    return false
  }
}

if (!sendRankingData()) {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (sendRankingData(node.textContent ?? undefined)) {
          observer.disconnect()
          return
        }
      }
    }
    if (sendRankingData()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('load', () => sendRankingData(), { once: true })
}

export {}
