const CHANNEL = 'refined-leetcode-entrant-hub'
const PARENT_CHANNEL = 'refined-leetcode-entrant-hub-parent'

const announceReady = () =>
  chrome.runtime
    .sendMessage({ type: 'entrant-hub-frame-ready' })
    .catch(() => undefined)

window.addEventListener('message', event => {
  const message = event.data
  if (
    event.source !== window.parent ||
    message?.channel !== PARENT_CHANNEL ||
    message?.target !== 'entrant-hub-frame'
  )
    return
  if (message.type === 'ping') {
    announceReady()
    return
  }
  if (message.type !== 'fetch-ranking') return

  window.postMessage(
    {
      channel: CHANNEL,
      kind: 'request',
      requestId: message.requestId,
      url: message.url,
    },
    location.origin
  )
})

window.addEventListener('message', event => {
  const message = event.data
  if (
    event.source !== window ||
    message?.channel !== CHANNEL ||
    message?.kind !== 'result'
  )
    return

  chrome.runtime
    .sendMessage({
      type: 'entrant-hub-frame-result',
      requestId: message.requestId,
      url: message.url,
      data: message.data,
      error: message.error,
    })
    .catch(() => undefined)
})

announceReady()

export {}
