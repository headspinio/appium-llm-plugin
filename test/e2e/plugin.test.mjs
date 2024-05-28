import {startAppium, startSession} from './utils.mjs'

/**
 * @param {import('webdriverio').Browser} d
 * @param {string} selector
 *
 * @returns {Promise<import('webdriverio').Element>}
 */
async function findByAI(d, selector) {
  const rawEl = await d.findElement('ai', selector)
  return await d.$(rawEl)
}

const openAiApiKey = process.env['OPENAI_API_KEY']
const openAiOrgId = process.env['OPENAI_ORG_ID']
const openAiProjId = process.env['OPENAI_PROJ_ID']

describe('LLMPlugin', function() {

  startAppium()

  describe.skip('xml mode', function() {
    const d = startSession({
      //model: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF',
      //model: 'billborkowski/llava-NousResearch_Nous-Hermes-2-Vision-GGUF',
      //model: 'nisten/obsidian-3b-multimodal-q6-gguf',
      model: 'mlabonne/gemma-7b-it-GGUF',
      queryMode: 'xml',
      temperature: 0.2,
      apiKey: 'lm-studio',
      aiServer: 'http://localhost:1234/v1',
    })
    //const d = startSession({
      //model: 'gpt-4o',
      //orgId: openAiOrgId,
      //projId: openAiProjId,
      //queryMode: 'xml',
      //apiKey: openAiApiKey,
      //temperature: 0.2,
    //})
    it('should find an element using a natural language query', async function() {
      const {driver} = d
      await driver.pause(3000)
      const loginScreen = await findByAI(driver, "Login Screen")
      await loginScreen.click()
      await driver.pause(2000)
      const username = await findByAI(driver, "username input")
      await username.setValue('alice')
      const password = await findByAI(driver, "password input")
      await password.setValue('mypassword')
      const loginBtn = await findByAI(driver, "Login button")
      await loginBtn.click()
      await driver.pause(2000)
      const loggedIn = await driver.$('//*[contains(@text, "You are logged in as")]')
      await loggedIn.waitForExist({timeout: 3000})
    })
  })

  describe.skip('xml by position mode', function() {
    const queryMode = 'xmlpos'
    const d = startSession({
      //model: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF', //billborkowski/llava-NousResearch_Nous-Hermes-2-Vision-GGUF',
      model: 'nisten/obsidian-3b-multimodal-q6-gguf',
      queryMode,
      temperature: 0.2,
      apiKey: 'lm-studio',
      aiServer: 'http://localhost:1234/v1',
    })
    //const d = startSession({
      //model: 'gpt-4o',
      //orgId: openAiOrgId,
      //projId: openAiProjId,
      //queryMode,
      //temperature: 0.2,
      //apiKey: openAiApiKey,
    //})
    it('should find an element using a natural language query', async function() {
      const {driver} = d
      await driver.pause(3000)
      const loginScreen = await findByAI(driver, "The element that says 'Login Screen'")
      await loginScreen.click()
      await driver.pause(2000)
      const username = await driver.$('~username')
      await username.waitForExist({timeout: 3000})
      const loginBtn = await findByAI(driver, "Login button")
      await loginBtn.click()
      const loggedIn = await driver.$('//*[contains(@text, "Invalid login credentials")]')
      await loggedIn.waitForExist({timeout: 3000})
    })
  })

  describe.skip('screenshot mode', function() {
    const queryMode = 'screenshot'
    const d = startSession({
      model: 'nisten/obsidian-3b-multimodal-q6-gguf',
      //model: 'xtuner/llava-llama-3-8b-v1_1-gguf',
      queryMode,
      temperature: 0.1,
      apiKey: 'lm-studio',
      aiServer: 'http://localhost:1234/v1',
    })
    //const d = startSession({
      //model: 'gpt-4o',
      //orgId: openAiOrgId,
      //projId: openAiProjId,
      //queryMode,
      //temperature: 0.2,
      //apiKey: openAiApiKey,
    //})
    it('should find an element using a natural language query', async function() {
      const {driver} = d
      await driver.pause(3000)
      const loginScreen = await findByAI(driver, "The list item named 'Login Screen'")
      await loginScreen.click()
      await driver.pause(2000)
      const username = await driver.$('~username')
      await username.waitForExist({timeout: 3000})
      const loginBtn = await findByAI(driver, "The blue button")
      await loginBtn.click()
      const loggedIn = await driver.$('//*[contains(@text, "Invalid login credentials")]')
      await loggedIn.waitForExist({timeout: 3000})
    })
  })
})
