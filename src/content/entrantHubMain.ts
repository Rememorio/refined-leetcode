const CHANNEL = 'refined-leetcode-entrant-hub'

window.addEventListener('message', async event => {
  const message = event.data
  if (
    event.source !== window ||
    message?.channel !== CHANNEL ||
    message?.kind !== 'request'
  )
    return

  try {
    const response = await fetch(message.url, { credentials: 'include' })
    if (!response.ok) throw new Error(`EntrantHub returned ${response.status}`)
    const data = await response.json()
    window.postMessage(
      {
        channel: CHANNEL,
        kind: 'result',
        requestId: message.requestId,
        url: message.url,
        data,
      },
      location.origin
    )
  } catch (error) {
    window.postMessage(
      {
        channel: CHANNEL,
        kind: 'result',
        requestId: message.requestId,
        url: message.url,
        error: error instanceof Error ? error.message : String(error),
      },
      location.origin
    )
  }
})

export {}
