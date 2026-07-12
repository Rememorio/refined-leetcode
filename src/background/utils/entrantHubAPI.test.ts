import { entrantHubPredictorApi } from './entrantHubAPI'

describe('entrantHubPredictorApi', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('maps EntrantHub ratings to the extension format', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            dataRegion: 'CN',
            userSlug: 'rememorio',
            oldRating: 2138.01,
            deltaRating: 27.98,
            newRating: 2165.99,
          },
        ],
      }),
    } as Response)

    await expect(
      entrantHubPredictorApi('weekly-contest-510', [
        { data_region: 'cn', username: 'Rememorio' },
      ])
    ).resolves.toEqual([
      {
        data_region: 'cn',
        username: 'Rememorio',
        oldRating: 2138.01,
        delta: 27.98,
        newRating: 2165.99,
      },
    ])

    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.hostname).toBe('api.entranthub.com')
    expect(url.pathname).toContain('weekly-contest-510/rankings')
    expect(url.searchParams.get('userSlug')).toBe('Rememorio')
    expect(fetchMock.mock.calls[0][1]).toEqual({ credentials: 'include' })
  })

  it('keeps users without predictions instead of failing the whole page', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as Response)

    await expect(
      entrantHubPredictorApi('weekly-contest-510', [
        { data_region: 'CN', username: 'missing' },
      ])
    ).resolves.toEqual([{ data_region: 'CN', username: 'missing' }])
  })
})
