// taken from appium's image element plugin
//
import _ from 'lodash'
import {errors} from 'appium/driver.js'
import {util} from '@appium/support'

export const IMAGE_ELEMENT_PREFIX = 'ai-image-element-'
const TAP_DURATION_MS = 125

/**
 * @typedef Dimension
 * @property {number} width - width of rect
 * @property {number} height - height of rect
 */

/**
 * @typedef Position
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 */

/**
 * @typedef ImageElementOpts
 * @property {Rect} rect - bounds of matched image element
 */

/**
 * Representation of an "image element", which is simply a set of coordinates
 * and methods that can be used on that set of coordinates via the driver
 */
export default class ImageElement {
  /**
   * @param {ImageElementOpts} options
   */
  constructor({
    rect,
    log,
  }) {
    this.rect = rect
    this.log = log
    this.id = `${IMAGE_ELEMENT_PREFIX}${util.uuidV4()}`
  }

  /**
   * @returns {Dimension} - dimension of element
   */
  get size() {
    return {width: this.rect.width, height: this.rect.height}
  }

  /**
   * @returns {Position} - coordinates of top-left corner of element
   */
  get location() {
    return {x: this.rect.x, y: this.rect.y}
  }

  /**
   * @returns {Position} - coordinates of center of element
   */
  get center() {
    return {
      x: this.rect.x + this.rect.width / 2,
      y: this.rect.y + this.rect.height / 2,
    }
  }

  /**
   *
   * @returns {Element} - this image element as a WebElement
   */
  asElement() {
    return util.wrapElement(this.id)
  }

  /**
   * @param {ImageElement} other - an ImageElement to compare with this one
   *
   * @returns {boolean} - whether the other element and this one have the same
   * properties
   */
  equals(other) {
    return (
      this.rect.x === other.rect.x &&
      this.rect.y === other.rect.y &&
      this.rect.width === other.rect.width &&
      this.rect.height === other.rect.height
    )
  }

  /**
   * Use a driver to tap the screen at the center of this ImageElement's
   * position
   *
   * @param {import('appium/driver').BaseDriver} driver - driver for calling actions with
   */
  async click(driver) {
    const {x, y} = this.center
    this.log.info(`Will tap on image element at coordinate [${x}, ${y}]`)

    // set up a W3C action to click on the image by position
    this.log.info('Will tap using W3C actions')
    const action = {
      type: 'pointer',
      id: 'mouse',
      parameters: {pointerType: 'touch'},
      actions: [
        {type: 'pointerMove', x, y, duration: 0},
        {type: 'pointerDown', button: 0},
        {type: 'pause', duration: TAP_DURATION_MS},
        {type: 'pointerUp', button: 0},
      ],
    }

    if ('performActions' in driver && _.isFunction(driver.performActions)) {
      return await driver.performActions([action])
    }

    throw new Error("Driver did not implement the 'performActions' command. ")
  }

  /**
   * Handle various Appium commands that involve an image element
   *
   * @param {import('appium/driver').BaseDriver} driver - the driver to use for commands
   * @param {string} cmd - the name of the driver command
   * @param {any} imgEl - image element object
   *
   * @returns {Promise<any>} - the result of running a command
   */
  static async execute(driver, imgEl, cmd) {
    switch (cmd) {
      case 'click':
        return await imgEl.click(driver)
      case 'elementDisplayed':
        return true
      case 'getSize':
        return imgEl.size
      case 'getLocation':
      case 'getLocationInView':
        return imgEl.location
      case 'getElementRect':
        return imgEl.rect
      default:
        throw new errors.NotYetImplementedError()
    }
  }
}

export {ImageElement}

/**
 * @typedef {import('@appium/types').Rect} Rect
 * @typedef {import('@appium/types').Element} Element
 */
