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

const API = 'https://api.entranthub.com/api/v1/contests/leetcode/contests'
const PAGE_TIMEOUT = 30_000

type PageWaiter = {
  url: string
  resolve: (data: RankingResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const pageWaiters = new Map<number, PageWaiter>()

if (typeof chrome !== 'undefined') {
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'entrant-hub-page') return

    const tabId = port.sender?.tab?.id
    if (tabId === undefined) return

    port.onMessage.addListener(({ url, data }) => {
      const waiter = pageWaiters.get(tabId)
      if (!waiter || waiter.url !== url) return

      clearTimeout(waiter.timer)
      pageWaiters.delete(tabId)
      waiter.resolve(data)
    })
  })
}

const rankingUrl = (contestSlug: string, username?: string) => {
  const url = new URL(`${API}/${contestSlug}/rankings`)
  url.searchParams.set('limit', username ? '20' : '100')
  url.searchParams.set('offset', '0')
  if (username) url.searchParams.set('userSlug', username)
  return url.toString()
}

const loadRankingPage = (tabId: number, url: string) =>
  new Promise<RankingResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      pageWaiters.delete(tabId)
      reject(new Error('EntrantHub page timed out'))
    }, PAGE_TIMEOUT)

    pageWaiters.set(tabId, { url, resolve, reject, timer })
    chrome.tabs.update(tabId, { url }).catch(error => {
      clearTimeout(timer)
      pageWaiters.delete(tabId)
      reject(error)
    })
  })

const entrantHubTabSource = async (
  contestSlug: string,
  users: { data_region: string; username: string }[]
): Promise<Ranking[]> => {
  const tab = await chrome.tabs.create({ active: false, url: 'about:blank' })
  if (tab.id === undefined) throw new Error('Failed to create EntrantHub tab')

  const rankings: Ranking[] = []
  try {
    try {
      rankings.push(
        ...(await loadRankingPage(tab.id, rankingUrl(contestSlug))).items
      )
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
          tab.id,
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
  } finally {
    const waiter = pageWaiters.get(tab.id)
    if (waiter) {
      clearTimeout(waiter.timer)
      pageWaiters.delete(tab.id)
    }
    await chrome.tabs.remove(tab.id).catch(() => undefined)
  }

  return rankings
}

export const entrantHubPredictorApi = async (
  contestSlug: string,
  users: { data_region: string; username: string }[],
  source = entrantHubTabSource
): Promise<EntrantHubPredictorType[]> => {
  const rankings = await source(contestSlug, users)

  return users.map(user => {
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
}
