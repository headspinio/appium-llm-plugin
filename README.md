# appium-llm-plugin

An Appium plugin allowing natural language element descriptions as selectors, with any
OpenAI-compatible API as the backend.

### 🚧 CONSTRUCTION WARNING 🚧

This plugin is highly experimental! Expect lots of rough edges and sudden plunges to your virtual
doom.

### How it works

Install this like any other Appium plugin (see below). When active, you have access to a new
element locator strategy: `ai`. Depending on which AI query mode you choose, the plugin will send
basic information about the app state (page source or screenshot) along with a prompt to an AI
model, and attempt to find your target element based on the natural language description you have
provided of it.

### Requirements

Along with a recent version of Appium 2 (the requirement for any plugin), you need to have
a locally-hosted model running via [LM Studio](https://lmstudio.ai), or an OpenAI API key. Inside
LM Studio you should download one or more LLMs to try. They are hosted on
[huggingface](https://huggingface.co). You could start with [this
one](https://huggingface.co/lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF), which seemed to work
well for the XML-based query modes.

Note that the `screenshot` query mode (see below) requires a model with a vision adapter for
multimodal queries. I couldn't find any open source models that did well with this mode, but [this
one](https://huggingface.co/xtuner/llava-llama-3-8b-v1_1-gguf) seemed to do the least poiorly.

You should probably also have an understanding of what LLMs are and how they work at a basic level,
because sadly I'm not going to go into that here.

### Installation and activation

```
appium plugin install --source=npm appium-llm-plugin
appium --use-plugins=llm
```

### Capabilities

This plugin expects a variety of required and optional capabilities when you start your session
while it's active.

|Capability Name|Description|
|--|--|
|`appium:llmModel`|[Required] The name of the model to use, e.g., `gpt-4o`|
|`appium:llmApiKey`|[Required] Your API key for OpenAI, or LM Studio (usually `lm-studio` for the latter)|
|`appium:llmServerBaseUrl`|[Optional] If omitted, defaults to OpenAI. If running locally, set it to LM Studio's base url, usually `http://localhost:1234/v1`|
|`appium:llmQueryMode`|[Optional] Whether you want to use the `screenshot`, `xml`, or `xmlpos` query mode (see below for descriptions). Defaults to `screenshot`|
|`appium:llmTemperature`|[Optional] The temperature to use in the query (defaults to 0.2). Lower values are probably better to avoid the AI getting too "creative"!|
|`appium:llmOrganization`|[Optional] The organization ID (if applicable and using OpenAI)|
|`appium:llmProject`|[Optional] The project ID (if applicable and using OpenAI)|

### Client usage

This plugin augments a single Appium command: `findElement` (and only the singular version! No
`findElements` is available). It adds a new locator strategy `ai`. How to use this locator strategy
will differ from client to client. In WebdriverIO, for example, you can do this:

```js
const rawEl = await driver.findElement('ai', "Your element description here")
const el = await driver.$(rawEl) // turn this into a "first class" element, which takes two lines for some reason
```

When you make the call to find an element using the `ai` locator strategy, the selector is just
a natural language description of the element. It might be the text of the element. It might be you
talking about features of the element. I don't care. But the AI model does! So pick a description
that gets you the element you want. Depending on which query mode you have selected, the plugin
will ask the model different questions, so you should think about which mode works best for your
case. Read on for more about them.

### Query Modes

You can use this plugin in one of 3 modes:

#### `screenshot` mode

In this mode, when you make a find element request, a screenshot is sent to the model along with
a prompt asking for it to determine the bounding box for your described element in the image.
Appium will then return to you an "image element", which is a lightweight element reference that
all you can do with is basically call `element.click()` on. If the AI did its job right, when you
do that, you will have tapped on the element! Big if.

#### `xml` mode

In this mode, when you make a find element request, Appium will collect the page source XML and
send it to the model, along with a request for an XPath selector to be derived from the XML based
on your description of the element (so in this case, descriptions that include visual information
not available in the XML source will be unhelpful). That XPath selector is then used internally to
find you an element, using Appium's normal finding strategies. The element reference returned to
you is a "normal" element you can do anything with. But is it the _right_ element? Who knows!

#### `xmlpos` mode

In this mode, when you make a find element request, the XML source is sent to the model, just like
in the `xml` mode. But the model is not asked to find an XPath selector. Instead, the model is
asked to look at the XML element that hopefully matches what you want, and to get the bounding box
(location) information from the XML attributes. Appium then turns that bounding box rect into an
"image element" and sends it back to you. This is a lightweight type of element that doesn't
actually refer to a UI element that you can do much with. All you can do is click it, hoping that
the AI didn't hallucinate those coordinates!

This mode currently only works with Android, since I haven't gotten around to writing a prompt that
works with iOS's page source XML structure yet (great first contribution for you!).
