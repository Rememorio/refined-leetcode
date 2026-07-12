// Leetcode Rating Predictor
import { gkey, graphqlApi } from '@/utils'
import {
  fileIconData,
  entrantHubPredictorApi as predictorApi,
  EntrantHubPredictorType,
} from './utils'

type GetPredictionMessage = {
  type: 'get-prediction'
  contestSlug: string
  users: { username: string; region: string }[]
}
type GetFileIcons = {
  type: 'get-file-icons'
}
type GetUserRanking = {
  type: 'get-user-ranking'
  username: string
}

const messageHandle = (
  message: GetPredictionMessage | GetFileIcons | GetUserRanking,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (message.type === 'get-prediction') {
    getPredictionHandle(message, sender, sendResponse)
    return true
  } else if (message.type === 'get-file-icons') {
    getFileIcons(message, sender, sendResponse)
    return true
  } else if (message.type === 'get-user-ranking') {
    getUserRanking(message, sender, sendResponse)
    return true
  }

  const _exhaustiveCheck: never = message
  return _exhaustiveCheck
}

chrome.runtime.onMessage.addListener(messageHandle)
chrome.runtime.onMessageExternal.addListener(messageHandle)

async function getFileIcons(
  message: GetFileIcons,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  const res: { [key: string]: string } = {}
  for (const { slug, file } of fileIconData) {
    res[slug] = `chrome-extension://${chrome.runtime.id}${file}`
  }
  sendResponse(res)
}

const cache = new Map<string, Map<string, EntrantHubPredictorType>>()
const predictionQueues = new Map<string, Promise<void>>()

const fetchMissingPredictions = async (
  contestSlug: string,
  users: { username: string; region: string }[],
  userCache: Map<string, EntrantHubPredictorType>
) => {
  const previous = predictionQueues.get(contestSlug) ?? Promise.resolve()
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const missing = users
        .filter(user => !userCache.has(gkey(user.region, user.username)))
        .map(user => ({ data_region: user.region, username: user.username }))
      if (!missing.length) return

      const data = await predictorApi(contestSlug, missing)
      for (const item of data) {
        userCache.set(gkey(item.data_region, item.username), item)
      }
    })
  predictionQueues.set(contestSlug, current)

  try {
    await current
  } finally {
    if (predictionQueues.get(contestSlug) === current) {
      predictionQueues.delete(contestSlug)
    }
  }
}

async function getPredictionHandle(
  message: GetPredictionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  const { contestSlug, users } = message
  let userCache = cache.get(contestSlug)!
  if (!userCache) {
    userCache = new Map()
    cache.set(contestSlug, userCache)
  }
  try {
    await fetchMissingPredictions(contestSlug, users, userCache)

    sendResponse(
      users.map(user => userCache.get(gkey(user.region, user.username)))
    )
  } catch (error) {
    console.error('Failed to fetch EntrantHub predictions', error)
    sendResponse([])
  }
}
async function getUserRanking(
  message: GetUserRanking,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  const { username } = message
  try {
    const { data } = await graphqlApi<{ data: any }>('https://leetcode.com', {
      body: {
        variables: { username: username },
        query: /* GraphQL */ `
          query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
              attendedContestsCount
              rating
              globalRanking
              totalParticipants
              topPercentage
            }
            userContestRankingHistory(username: $username) {
              attended
              trendDirection
              problemsSolved
              totalProblems
              finishTimeInSeconds
              rating
              ranking
              contest {
                titleSlug
                title
                startTime
              }
            }
          }
        `,
      },
    })

    sendResponse(data)
  } catch (error) {
    // TODO
  }
}
