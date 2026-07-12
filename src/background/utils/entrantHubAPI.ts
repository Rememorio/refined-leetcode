import { sleep } from './sleep'

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

const fetchPrediction = async (
  contestSlug: string,
  user: { data_region: string; username: string },
  retry = 5
): Promise<EntrantHubPredictorType> => {
  const url = new URL(`${API}/${contestSlug}/rankings`)
  url.searchParams.set('limit', '20')
  url.searchParams.set('offset', '0')
  url.searchParams.set('userSlug', user.username)

  const res = await fetch(url.toString(), { credentials: 'include' })
  if (retry && res.status === 503) {
    await sleep(2000)
    return fetchPrediction(contestSlug, user, retry - 1)
  }
  if (!res.ok) throw new Error(`EntrantHub API returned ${res.status}`)

  const { items }: RankingResponse = await res.json()
  const item = items.find(
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
}

export const entrantHubPredictorApi = async (
  contestSlug: string,
  users: { data_region: string; username: string }[]
): Promise<EntrantHubPredictorType[]> =>
  Promise.all(
    users.map(async user => {
      try {
        return await fetchPrediction(contestSlug, user)
      } catch (error) {
        return user
      }
    })
  )
