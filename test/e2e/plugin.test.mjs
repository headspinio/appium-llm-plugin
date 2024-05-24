import {startAppium, startSession} from './utils.mjs'

describe('LLMPlugin', function() {

  startAppium()

  describe('Things', function() {
    const d = startSession()
    it('should exist', async function() {
      await d.driver.getPageSource()
    })
  })
})
