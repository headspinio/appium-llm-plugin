import { remote } from 'webdriverio'
import appium from 'appium'
import path from 'path'
import * as url from 'url'

const {main} = appium
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const APP = path.resolve(__dirname, '..', 'fixtures', 'TheApp.apk')
const PORT = 5678

export function startAppium() {
  let server
  before(async function() {
    server = await main({port: PORT, usePlugins: ['llm']})
  })
  after(async function() {
    await server.close()
  })
}

/**
 * @typedef {{
 *  queryMode: string,
 *  temperature: number,
 *  model: string,
 *  orgId?: string,
 *  projId?: string,
 *  apiKey: string,
 * }} SessionOpts
 */

/** @type {SessionOpts} */
const DEF_SESSION_OPTS = {
  queryMode: 'screenshot',
  temperature: 0.1,
  model: 'gpt-4o',
  orgId: null,
  projId: null,
  apiKey: 'lm-studio',
  aiServer: 'http://localhost:1234/v1',
}

/**
 * @param {Partial<SessionOpts>} opts
 */
export function startSession(sessOpts) {
  sessOpts = {DEF_SESSION_OPTS, ...sessOpts}
  const {model, queryMode, temperature, orgId, projId, apiKey, aiServer} = sessOpts
  const caps = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': APP,
    'appium:llmModel': model,
    'appium:llmQueryMode': queryMode,
    'appium:llmTemperature': temperature,
    'appium:llmApiKey': apiKey,
    'appium:llmServerBaseUrl': aiServer,
    'appium:llmOrganization': orgId,
    'appium:llmProject': projId,
  }

  if (orgId) {
    caps['appium:llmOrgId'] = orgId
  }

  if (projId) {
    caps['appium:llmProjId'] = projId
  }

  /** @type import('webdriverio').RemoteOptions */
  const opts = {
    hostname: 'localhost',
    port: PORT,
    capabilities: caps,
    connectionRetryCount: 0,
    connectionRetryTimeout: 240000,
  }

  /** @type {{driver?: import('webdriverio').Browser}} */
  const container = {}

  before(async function() {
    container.driver = await remote(opts)
  })

  after(async function() {
    if (container.driver) {
      await container.driver.deleteSession()
    }
  })

  return container
}
