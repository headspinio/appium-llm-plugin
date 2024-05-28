import _ from 'lodash'
import {BasePlugin} from 'appium/plugin.js'
import {errors} from 'appium/driver.js'
import ImageElement, {IMAGE_ELEMENT_PREFIX} from './image-element.mjs'
import {LRUCache} from 'lru-cache'
import OpenAI from 'openai'
import {ImageBBoxQuery, ImageXMLQuery, XPathFromXMLQuery} from './queries.mjs'

export const AI_LOC_STRAT = 'ai'
export const DEFAULT_TEMP = 0.2
export const QUERY_MODE_XML = 'xml'
export const QUERY_MODE_IMAGE = 'screenshot'
export const QUERY_MODE_XML_POS = 'xmlpos'

const MAX_CACHE_ITEMS = 100;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

function getImgElFromArgs(args) {
  return args.find((arg) => _.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX));
}

export class LLMPlugin extends BasePlugin {

  constructor(name) {
    super(name)
    this._elCache = new LRUCache({
      max: MAX_CACHE_ITEMS,
      ttl: MAX_CACHE_AGE_MS,
      updateAgeOnGet: true,
    })
  }

  /**
   * @param {NextHandler} next
   * @param {ExternalDriver} driver
   * @param {string} strategy
   * @param {string} selector
   */
  async findElement(next, driver, strategy, selector) {
    if (strategy !== AI_LOC_STRAT) {
      return await next()
    }

    if (!driver.opts.llmModel) {
      throw new Error(`Must include the 'appium:llmModel' capability with the name of the LLM model to use`)
    }

    const baseURL = driver.opts.llmServerBaseUrl || undefined
    const organization = driver.opts.llmOrganization || undefined
    const project = driver.opts.llmProject || undefined
    const apiKey = driver.opts.llmApiKey || ''

    if (!this.client) {
      this.client = new OpenAI({baseURL, apiKey, organization, project})
    }

    const model = driver.opts.llmModel
    const temperature = driver.opts.llmTemperature || DEFAULT_TEMP

    if (driver.opts.llmQueryMode === QUERY_MODE_XML) {
      return await this._findViaXml(driver, model, temperature, selector)
    }

    if (driver.opts.llmQueryMode === QUERY_MODE_XML_POS) {
      return await this._findViaXmlPos(driver, model, temperature, selector)
    }

    return await this._findViaImage(driver, model, temperature, selector)
  }

  /**
   * @param {ExternalDriver} driver
   * @param {number} temperature
   * @param {string} model
   * @param {selector} string
   */
  async _findViaXml(driver, model, temperature, selector) {
    this.logger.info('Getting the page source for use in AI analysis')
    const xml = await driver.getPageSource()
    const q = new XPathFromXMLQuery(this.client, this.logger)
    this.logger.info(`Querying AI model`)
    const xpath = await q.run(temperature, xml, selector, model)
    this.logger.info(`Using ${xpath} as query to pass to driver for find`)
    return await driver.findElement('xpath', xpath)
  }

  /**
   * @param {ExternalDriver} driver
   * @param {number} temperature
   * @param {string} model
   * @param {selector} string
   */
  async _findViaXmlPos(driver, model, temperature, selector) {
    this.logger.info('Getting the source for use in AI analysis')
    const xml = await driver.getPageSource()

    const q = new ImageXMLQuery(this.client, this.logger)
    this.logger.info(`Querying AI model`)
    const rect = await q.run(temperature, xml, selector, model)

    return this._createImageElement(rect)
  }

  /**
   * @param {ExternalDriver} driver
   * @param {number} temperature
   * @param {string} model
   * @param {selector} string
   */
  async _findViaImage(driver, model, temperature, selector) {
    this.logger.info('Getting the screenshot for use in AI analysis')
    const screen = await driver.getScreenshot()
    const {width, height} = await driver.getWindowRect()

    const q = new ImageBBoxQuery(this.client, this.logger, screen, width, height)
    this.logger.info(`Querying AI model`)
    const rect = await q.run(temperature, selector, model)

    return this._createImageElement(rect)
  }

  _createImageElement(rect) {
    const imgEl = new ImageElement({rect, log: this.logger})
    this._elCache.set(imgEl.id, imgEl)
    return imgEl.asElement()
  }

  // need a catchall handler because we need to handle element clicks
  async handle(next, driver, cmdName, ...args) {
    // if we have a command that involves an image element id, attempt to find the image element
    // and execute the command on it
    const imgElId = getImgElFromArgs(args);
    if (imgElId) {
      const imgEl = this._elCache.get(imgElId)
      if (!imgEl) {
        throw new errors.NoSuchElementError();
      }
      return await ImageElement.execute(driver, imgEl, cmdName, ...args);
    }

    if (cmdName === 'deleteSession') {
      this._elCache.clear()
    }

    // otherwise just do the normal thing
    return await next();
  }
}

/**
 * @typedef {import('@appium/types').ExternalDriver} ExternalDriver
 */

/**
 * @typedef {() => Promise<any>} NextHandler
 */
