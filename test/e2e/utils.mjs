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

export function startSession() {
  const caps = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': APP,
  }

  /** @type import('webdriverio').RemoteOptions */
  const opts = {
    hostname: 'localhost',
    port: PORT,
    capabilities: caps,
    connectionRetryCount: 0,
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
