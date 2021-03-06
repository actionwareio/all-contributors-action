import { getOctokit } from '@actions/github'
import { expect, mockFn } from 'earljs'
import { readFileSync } from 'fs'
import { copySync } from 'fs-extra'
import { join } from 'path'
import tmp from 'tmp'

import { action } from '../src/action'
import { Exec } from '../src/types'
import { Context } from './helpers/GithubCtxFromEvent'
import { nockTest } from './helpers/nockTest'

describe('integration', () => {
  it(
    'adds a new contributor',
    nockTest(async () => {
      // prepare directory with dummy allcontributors setup
      const workdirPath = tmp.tmpNameSync()
      copySync(join(__dirname, './fixtures/example'), workdirPath)

      const octokit = getOctokit('NOT_EXISTING_TOKEN')
      const execMock = mockFn<Exec>().resolvesTo(0)
      // event from an admin to add @octocat user as a contributor
      const event = require('./fixtures/validEvent.json')
      const ctx = new Context(event)

      await action({ cwd: workdirPath, exec: execMock, octokit, ctx })

      // assert that a new contributor was added and readme regenerated
      const allContributorsCfg = JSON.parse(readFileSync(join(workdirPath, '.github/.all-contributorsrc'), 'utf-8'))
      const exampleReadme = readFileSync(join(workdirPath, 'README.md'), 'utf8')

      expect(allContributorsCfg.contributors.length).toEqual(2)
      expect(exampleReadme).toMatchSnapshot()
      expect(exampleReadme).toEqual(expect.stringMatching('monalisa octocat'))
      expect(exampleReadme).toEqual(
        expect.stringMatching(
          '<img alt="All contributors" src="https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square">',
        ),
      )
    }),
  )

  it(
    'modifies existing contributions',
    nockTest(async () => {
      // prepare directory with dummy allcontributors setup
      const workdirPath = tmp.tmpNameSync()
      copySync(join(__dirname, './fixtures/example'), workdirPath)

      const octokit = getOctokit('NOT_EXISTING_TOKEN')
      const execMock = mockFn<Exec>().resolvesTo(0)
      // event from an admin to add @octocat user as a contributor
      const event = require('./fixtures/validEvent.json')
      event.payload.comment.body = '@all-contributors please add @krzkaczor for audio'
      const ctx = new Context(event)

      await action({ cwd: workdirPath, exec: execMock, octokit, ctx })

      // assert that a new contributor was added and readme regenerated
      const allContributorsCfg = JSON.parse(readFileSync(join(workdirPath, '.github/.all-contributorsrc'), 'utf-8'))

      expect(allContributorsCfg.contributors[0]).toEqual(expect.objectWith({ contributions: ['code', 'doc', 'audio'] }))
    }),
  )

  it(
    'doesnt modify existing contributions if they repeat',
    nockTest(async () => {
      // prepare directory with dummy allcontributors setup
      const workdirPath = tmp.tmpNameSync()
      copySync(join(__dirname, './fixtures/example'), workdirPath)

      const octokit = getOctokit('NOT_EXISTING_TOKEN')
      const execMock = mockFn<Exec>().resolvesTo(0)
      // event from an admin to add @octocat user as a contributor
      const event = require('./fixtures/validEvent.json')
      event.payload.comment.body = '@all-contributors please add @krzkaczor for doc'
      const ctx = new Context(event)

      await action({ cwd: workdirPath, exec: execMock, octokit, ctx })

      // assert that a new contributor was added and readme regenerated
      const allContributorsCfg = JSON.parse(readFileSync(join(workdirPath, '.github/.all-contributorsrc'), 'utf-8'))

      expect(allContributorsCfg.contributors[0]).toEqual(expect.objectWith({ contributions: ['code', 'doc'] }))
    }),
  )
})
