import _ from 'lodash'
import {SYSTEM_SETUP_PROMPT_IMAGE, SYSTEM_SETUP_PROMPT_XML, SYSTEM_SETUP_PROMPT_XML_POS, userImageQueryPrompt, userXmlPosQueryPrompt, userXmlQueryPrompt} from './prompts.mjs'
import {errors} from 'appium/driver.js'

function extractJson(response) {
  let jsonBlob = response.choices[0].message.content
  // sometimes stuff gets printed before or after { or }, get rid of it
  jsonBlob = jsonBlob.replaceAll("\n", '')
  jsonBlob = jsonBlob.replaceAll(/^.+{/g, '{')
  jsonBlob = jsonBlob.replaceAll(/}.+$/g, '}')
  return JSON.parse(jsonBlob)
}

export class Query {
  /** @type {import('openai').OpenAI} **/
  client

  /** @type {import('@appium/types').AppiumLogger} **/
  logger

  constructor(client, logger) {
    this.client = client
    this.logger = logger
  }
}

export class XPathFromXMLQuery extends Query {
  /**
   * @param {number} temperature
   * @param {string} xml
   * @param {string} desc
   * @param {string?} model
   */
  async run(temperature, xml, desc, model) {
    const response = await this.client.chat.completions.create({
      temperature,
      model,
      response_format: {type: 'json_object'},
      messages: [{
        role: 'system',
        content: SYSTEM_SETUP_PROMPT_XML,
      }, {
        role: 'user',
        content: userXmlQueryPrompt(xml, desc),
      }]
    })

    this.logger.info(`Received response from AI model: ${JSON.stringify(response)}`)

    let xpath
    try {
      xpath = extractJson(response).xpath
    } catch (err) {
      throw new Error(`Could not parse XPath from AI JSON response. Original error: ${err}`)
    }

    if (xpath.startsWith('.')) {
      xpath = xpath.slice(1)
    }

    return xpath
  }
}

export class ImageXMLQuery extends Query {
  /**
   * @param {number} temperature
   * @param {string} xml
   * @param {string} desc
   * @param {string?} model
   */
  async run(temperature, xml, desc, model) {
    const response = await this.client.chat.completions.create({
      temperature,
      model,
      max_tokens: 32,
      response_format: {type: 'json_object'},
      messages: [{
        role: 'system',
        content: SYSTEM_SETUP_PROMPT_XML_POS,
      }, {
        role: 'user',
        content: userXmlPosQueryPrompt(xml, desc),
      }]
    })

    this.logger.info(`Received response from AI model: ${JSON.stringify(response)}`)

    let bounds
    try {
      bounds = extractJson(response).value
    } catch (err) {
      throw new Error(`Could not parse XPath from AI JSON response. Original error: ${err}`)
    }

    if (!bounds) {
      throw new errors.NoSuchElementError()
    }

    const boundsRe = new RegExp(/\[(.+),(.+)\]\[(.+),(.+)\]/)
    const match = bounds.match(boundsRe)

    if (!match) {
      throw new Error(`Could not parse bounds information from: ${bounds}`)
    }

    const x = Number(match[1])
    const y = Number(match[2])
    const width = Number(match[3]) - x
    const height = Number(match[4]) - y

    const rect = {x, y, width, height}

    this.logger.info(`Converted bounds into rect: ${JSON.stringify(rect)}`)
    return rect
  }
}

export class ImageBBoxQuery extends Query {
  /** @type {string} **/
  imgB64

  /** @type {number} **/
  imgHeight

  /** @type {number} **/
  imgWidth

  constructor(client, logger, imgB64, imgWidth, imgHeight) {
    super(client, logger)
    this.imgB64 = imgB64
    this.imgWidth = imgWidth
    this.imgHeight = imgHeight
  }

  /**
   * @param {number} temperature
   * @param {string} desc
   * @param {string?} model
   */
  async run(temperature, desc, model=undefined) {
    const response = await this.client.chat.completions.create({
      max_tokens: 64,
      model,
      temperature,
      response_format: {type: 'json_object'},
      messages: [{
        role: 'system',
        content: SYSTEM_SETUP_PROMPT_IMAGE,
      }, {
        role: 'user',
        content: [{
          type: 'text',
          text: userImageQueryPrompt(desc),
        }, {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${this.imgB64}`
          }
        }]
      }]
    })

    this.logger.info(`Received response from AI model: ${JSON.stringify(response)}`)

    let rect
    try {
      rect = extractJson(response)
    } catch (e) {
      throw new Error(`Could not parse coordinates from AI response. Original error: ${e}`)
    }

    if (_.isUndefined(rect.x) || _.isUndefined(rect.y) || _.isUndefined(rect.width) || _.isUndefined(rect.height)) {
      throw new Error(`Could not parse coordinates from AI response. Did not include x, y, width, and height values`)
    }

    rect = {
      x: rect.x * this.imgWidth,
      y: rect.y * this.imgHeight,
      width: rect.width * this.imgWidth,
      height: rect.height * this.imgHeight
    }

    this.logger.info(`Converted rect into screen coords: ${JSON.stringify(rect)}`)

    return rect
  }
}
