import { entrantHubPredictorApi } from './entrantHubAPI'

describe('entrantHubPredictorApi', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('maps EntrantHub ratings to the extension format', async () => {
    const source = jest.fn().mockResolvedValue([
      {
        dataRegion: 'CN',
        userSlug: 'rememorio',
        oldRating: 2138.01,
        deltaRating: 27.98,
        newRating: 2165.99,
      },
    ])

    await expect(
      entrantHubPredictorApi(
        'weekly-contest-510',
        [{ data_region: 'cn', username: 'Rememorio' }],
        source
      )
    ).resolves.toEqual([
      {
        data_region: 'cn',
        username: 'Rememorio',
        oldRating: 2138.01,
        delta: 27.98,
        newRating: 2165.99,
      },
    ])

    expect(source).toHaveBeenCalledWith('weekly-contest-510', [
      { data_region: 'cn', username: 'Rememorio' },
    ])
  })

  it('keeps users without predictions instead of failing the whole page', async () => {
    const source = jest.fn().mockResolvedValue([])

    await expect(
      entrantHubPredictorApi(
        'weekly-contest-510',
        [{ data_region: 'CN', username: 'missing' }],
        source
      )
    ).resolves.toEqual([{ data_region: 'CN', username: 'missing' }])
  })
})
