const frame = document.createElement('iframe')
frame.src = 'https://entranthub.com/'
frame.title = 'EntrantHub data bridge'
document.body.append(frame)

let frameReady = false

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'entrant-hub-frame-ready') {
    frameReady = true
    return
  }
  if (message.target === 'entrant-hub-offscreen') {
    if (message.type === 'ping' && frameReady) {
      chrome.runtime
        .sendMessage({ type: 'entrant-hub-frame-ready' })
        .catch(() => undefined)
    }
    return
  }
  if (message.target !== 'entrant-hub-frame') return
  frame.contentWindow?.postMessage(
    {
      ...message,
      channel: 'refined-leetcode-entrant-hub-parent',
    },
    'https://entranthub.com'
  )
})

export {}
