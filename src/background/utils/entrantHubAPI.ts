export type EntrantHubPredictorType = {
  data_region: string
  username: string
  delta?: number
  oldRating?: number
  newRating?: number
}

type Ranking = {
  dataRegion: string
  userSlug: string
  deltaRating?: number
  oldRating?: number
  newRating?: number
}

type RankingResponse = {
  items: Ranking[]
}

type RequestWaiter = {
  resolve: (data: RankingResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const API = 'https://api.entranthub.com/api/v1/contests/leetcode/contests'
const OFFSCREEN_DOCUMENT = 'offscreen.html'
const PAGE_TIMEOUT = 20_000
const BRIDGE_TIMEOUT = 10_000
const PAGE_RETRIES = 2

const requestWaiters = new Map<string, RequestWaiter>()
const readyWaiters = new Set<() => void>()
let creatingOffscreen: Promise<void> | undefined
let requestSequence = 0
let bridgeReady = false

if (typeof chrome !== 'undefined') {
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'entrant-hub-frame-ready') {
      bridgeReady = true
      for (const resolve of readyWaiters) resolve()
      readyWaiters.clear()
      return
    }

    if (message.type !== 'entrant-hub-frame-result') return

    const waiter = requestWaiters.get(message.requestId)
    if (!waiter) return

    clearTimeout(waiter.timer)
    requestWaiters.delete(message.requestId)
    if (message.error) waiter.reject(new Error(message.error))
    else waiter.resolve(message.data)
  })
}

const rankingUrl = (contestSlug: string, username?: string) => {
  const url = new URL(`${API}/${contestSlug}/rankings`)
  url.searchParams.set('limit', username ? '20' : '100')
  url.searchParams.set('offset', '0')
  if (username) url.searchParams.set('userSlug', username)
  return url.toString()
}

const hasOffscreenDocument = async () => {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })
  return contexts.length > 0
}

const waitForBridgeReady = () =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      readyWaiters.delete(done)
      reject(new Error('EntrantHub offscreen bridge timed out'))
    }, BRIDGE_TIMEOUT)
    const done = () => {
      clearTimeout(timer)
      readyWaiters.delete(done)
      resolve()
    }
    readyWaiters.add(done)
  })

const ensureOffscreenDocument = async () => {
  if (await hasOffscreenDocument()) {
    if (!bridgeReady) {
      const ready = waitForBridgeReady()
      await chrome.runtime.sendMessage({
        target: 'entrant-hub-offscreen',
        type: 'ping',
      })
      await ready
    }
  } else {
    bridgeReady = false
    const ready = waitForBridgeReady()
    if (!creatingOffscreen) {
      creatingOffscreen = chrome.offscreen
        .createDocument({
          url: OFFSCREEN_DOCUMENT,
          reasons: ['DOM_SCRAPING'],
          justification: 'Load EntrantHub predictions without visible windows',
        })
        .finally(() => {
          creatingOffscreen = undefined
        })
    }
    await creatingOffscreen
    await ready
  }
}

const closeOffscreenDocument = async () => {
  bridgeReady = false
  if (await hasOffscreenDocument()) {
    await chrome.offscreen.closeDocument().catch(() => undefined)
  }
}

const requestRankingPage = (url: string) =>
  new Promise<RankingResponse>((resolve, reject) => {
    const requestId = `${Date.now()}-${requestSequence++}`
    const timer = setTimeout(() => {
      requestWaiters.delete(requestId)
      reject(new Error('EntrantHub offscreen request timed out'))
    }, PAGE_TIMEOUT)

    requestWaiters.set(requestId, { resolve, reject, timer })
    chrome.runtime
      .sendMessage({
        target: 'entrant-hub-frame',
        type: 'fetch-ranking',
        requestId,
        url,
      })
      .catch(error => {
        clearTimeout(timer)
        requestWaiters.delete(requestId)
        reject(error)
      })
  })

const loadRankingPage = async (url: string): Promise<RankingResponse> => {
  let lastError = new Error('Failed to load EntrantHub page')

  for (let attempt = 0; attempt < PAGE_RETRIES; attempt++) {
    try {
      await ensureOffscreenDocument()
      return await requestRankingPage(url)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError
}

let sourceQueue = Promise.resolve()

const readRankings = async (
  contestSlug: string,
  users: { data_region: string; username: string }[]
): Promise<Ranking[]> => {
  const rankings: Ranking[] = []
  try {
    rankings.push(...(await loadRankingPage(rankingUrl(contestSlug))).items)
  } catch {
    // Missing bulk data falls back to per-user lookups below.
  }

  const keys = new Set(
    rankings.map(
      item =>
        `${item.dataRegion.toLocaleLowerCase()}:${item.userSlug.toLocaleLowerCase()}`
    )
  )
  for (const user of users) {
    const key = `${user.data_region.toLocaleLowerCase()}:${user.username.toLocaleLowerCase()}`
    if (keys.has(key)) continue

    try {
      const { items } = await loadRankingPage(
        rankingUrl(contestSlug, user.username)
      )
      rankings.push(...items)
      for (const item of items) {
        keys.add(
          `${item.dataRegion.toLocaleLowerCase()}:${item.userSlug.toLocaleLowerCase()}`
        )
      }
    } catch {
      // Keep the remaining users usable when one lookup fails.
    }
  }

  return rankings
}

const entrantHubOffscreenSource = async (
  contestSlug: string,
  users: { data_region: string; username: string }[]
): Promise<Ranking[]> => {
  const previous = sourceQueue
  let release: () => void = () => undefined
  sourceQueue = new Promise<void>(resolve => {
    release = resolve
  })
  await previous

  try {
    return await readRankings(contestSlug, users)
  } finally {
    for (const [requestId, waiter] of requestWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error('EntrantHub offscreen bridge closed'))
      requestWaiters.delete(requestId)
    }
    await closeOffscreenDocument()
    release()
  }
}

export const entrantHubPredictorApi = async (
  contestSlug: string,
  users: { data_region: string; username: string }[],
  source = entrantHubOffscreenSource
): Promise<EntrantHubPredictorType[]> => {
  const rankings = await source(contestSlug, users)

  const result = users.map(user => {
    const item = rankings.find(
      item =>
        item.dataRegion.toLocaleLowerCase() ===
          user.data_region.toLocaleLowerCase() &&
        item.userSlug.toLocaleLowerCase() === user.username.toLocaleLowerCase()
    )

    return {
      ...user,
      oldRating: item?.oldRating,
      delta: item?.deltaRating,
      newRating: item?.newRating,
    }
  })

  return result
}
