const { chromium } = require('playwright');
const { fetchPage } = require('./wendy.js');
const { askGemma } = require('./llm.js');
const { SYSTEM_PROMPT } = require('./systemPrompt.js');
const logger = require('./logger.js');
const loadModels = require('./modelLoader.js');
const { buildRegistry, findPluginsForAction } = require('./pluginRegistry.js');
const { runPluginAction } = require('./pluginRunner.js');
const { compressDom } = require('./observation.js');
const { AgentMemory } = require('./agentMemory.js');
const { Planner } = require('./planner.js');
const { LongPlanner } = require('./longPlanner.js');
const { ExtractionEngine } = require('./extractionEngine.js');
const { TaskGraph } = require('./taskGraph.js');
const { SwarmManager } = require('./swarm/swarmManager');

const models = loadModels();

async function callLLM(messages, { useReasoning = false, debug = false } = {}) {
  const model = useReasoning ? models.reasoningModel : models.actionModel;

  logger.info('llm_model_selected', {
    model,
    reasoning: useReasoning
  });

  return askGemma(messages, model);
}

function compressMemory(memory) {
  return {
    sel: [...memory.selectorMap.entries()].slice(-20),
    vis: [...memory.visitedUrls].slice(-10),
    prog: memory.goalProgress
  };
}

function compressPlanner(planner) {
  return {
    plan: planner.currentPlan,
    done: [...planner.completed]
  };
}

function compressLongPlanner(lp) {
  return {
    strat: lp.strategy,
    nav: lp.navigationTree.slice(-5)
  };
}

const log = logger.info;

async function planStep(
  goal,
  observation,
  previousAction,
  debug = false,
  memory = null,
  planner = null,
  longPlanner = null,
  extractionEngine = null,
  taskGraph = null
) {
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: `GOAL:${goal}\nDOM:${JSON.stringify(observation).slice(0, 4000)}`
    }
  ];

  if (memory) {
    messages.push({
      role: 'system',
      content: `MEM:${JSON.stringify(compressMemory(memory))}`
    });
  }

  const subgoal = planner ? planner.getNextSubgoal() : null;
  if (subgoal) {
    messages.push({
      role: 'system',
      content: `Current subgoal: ${subgoal}`
    });
  }

  if (longPlanner) {
    messages.push({
      role: 'system',
      content: `LPLAN:${JSON.stringify(compressLongPlanner(longPlanner))}`
    });
  }

  if (planner) {
    messages.push({
      role: 'system',
      content: `PLAN:${JSON.stringify(compressPlanner(planner))}`
    });
  }

  const selectorHint = `
When selecting elements:
- Prefer IDs first (#id)
- Then classes (.class)
- Then role-based selectors ([role="button"])
- Avoid nth-child unless absolutely necessary
- Avoid brittle selectors
`;
  messages.push({ role: 'system', content: selectorHint });

  logger.debug(debug, 'llm_request_start', { promptPreview: messages[messages.length - 1].content.slice(0, 200) });

  let llmOutput;
  try {
    llmOutput = await callLLM(messages, { useReasoning: false, debug });
  } catch (err) {
    logger.warn('llm_action_model_failed', { error: err.message });
    if (models.fallbackEnabled) {
      logger.info('llm_fallback_to_reasoning_model');
      llmOutput = await callLLM(messages, { useReasoning: true, debug });
    } else {
      throw err;
    }
  }

  logger.debug(debug, 'llm_response_received', { responsePreview: llmOutput.slice(0, 200) });

  let action;
  for (let i = 0; i < models.maxRetries; i++) {
    try {
      action = tryParseAction(llmOutput);
      break;
    } catch (err) {
      if (i === models.maxRetries - 1) throw err;
      logger.warn('llm_parse_retry', { attempt: i + 1 });
      llmOutput = await callLLM(messages, { useReasoning: true, debug });
    }
  }

  if (action) {
    if (subgoal && subgoal.includes('extract') && !['extract', 'extractAll'].includes(action.action)) {
      throw new Error('Action does not match subgoal');
    }

    if (subgoal && subgoal.includes('locate') && action.action === 'finish') {
      throw new Error('Cannot finish before locating section');
    }

    if (planner) {
      const allowed = planner.getActionTree(subgoal);
      if (allowed && !allowed.includes(action.action)) {
        throw new Error('Action not allowed for this subgoal');
      }
    }
  }

  return action;
}

function tryParseAction(text) {
  if (!text) {
    throw new Error('Empty LLM output');
  }

  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in LLM output');
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON parse error: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parsed action is not an object');
  }

  const VALID_ACTIONS = [
    'navigate',
    'click',
    'extract',
    'extractAll',
    'scroll',
    'waitFor',
    'renderedHtml',
    'evaluate',
    'screenshot',
    'ocr',
    'startExtractionTask',
    'addExtractionRow',
    'nextPage',
    'markExtractionDone',
    'rewriteGoal',
    'retryWithNewPlan',
    'finish'
  ];

  if (!VALID_ACTIONS.includes(parsed.action)) {
    throw new Error(`Invalid action: ${parsed.action}`);
  }

  return parsed;
}

async function safeNavigate(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const cfBlock = await page.$('div[id*="cf"], div[class*="challenge"], title:has-text("Just a moment")');
    if (cfBlock) {
      await page.waitForTimeout(3000);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    return true;
  } catch (err) {
    return false;
  }
}

async function retry(fn, attempts = 3, delay = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function safeClick(page, selector) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.click(selector, { timeout: 5000 });
      return true;
    } catch (err) {
      if (i === 2) throw err;
      await page.waitForTimeout(500);
    }
  }
}

async function ensureNavigation(page) {
  const bad = await page.$('title:has-text("Error"), h1:has-text("Error"), body:has-text("404")');
  if (bad) {
    throw new Error('Navigation failed: error page detected');
  }
}

async function executeAction(action, page) {
  log('info', 'agent_action', { action: action.action });

  switch (action.action) {
    case 'navigate':
      await safeNavigate(page, action.url);
      await ensureNavigation(page);
      return null;
    case 'click':
      await safeClick(page, action.selector);
      return null;
    case 'extract':
      return await page.textContent(action.selector);
    case 'finish':
      return action.result;
    default:
      throw new Error(`Unknown action: ${action.action}`);
  }
}

async function runAgent({ url, goal, useBrowser, debug = false, verbose = false }, softLimit = 10, initialContext = null) {
  const startTime = Date.now();
  const startUrl = url;
  log('info', 'agent_start', { goal, startUrl, useBrowser, softLimit });

  let browser = initialContext?.browser || null;
  let page = initialContext?.page || null;
  let currentUrl = startUrl;
  let currentHtml = initialContext?.html || '';
  let screenshotBase64 = initialContext?.screenshotBase64 || null;
  let previousAction = null;
  let stepCount = 0;
  let shouldCloseBrowser = false;
  const pluginRegistry = buildRegistry();
  const memory = new AgentMemory();
  const planner = new Planner();
  planner.createPlan(goal);
  const longPlanner = new LongPlanner();
  const extractionEngine = new ExtractionEngine();
  const taskGraph = new TaskGraph();
  const swarmManager = new SwarmManager();

  try {
    if (!page && useBrowser) {
browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      page = await browser.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(30000);

      page.on('pageerror', err => {
        logger.warn('browser_page_error', { message: err.message });
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          logger.warn('browser_console_error', { text: msg.text() });
        }
      });

      page.on('requestfailed', req => {
        logger.warn('browser_request_failed', {
          url: req.url(),
          error: req.failure()?.errorText
        });
      });

      await page.goto(startUrl, { waitUntil: 'networkidle' });
      currentUrl = page.url();
      memory.markVisited(currentUrl);
      currentHtml = await page.content();
      screenshotBase64 = await page.screenshot({ encoding: 'base64' });
    } else if (!initialContext?.html) {
      const result = await fetchPage(startUrl);
      currentUrl = result.finalUrl;
      currentHtml = result.content;
    } else {
      currentUrl = initialContext?.url || startUrl;
    }

    while (stepCount < softLimit) {
      stepCount++;
      const stepStart = Date.now();
      log('info', 'agent_step', { step: stepCount });

      const domSummary = compressDom(currentHtml);
      const observation = {
        url: currentUrl,
        html: JSON.stringify(domSummary),
        domSummary,
        screenshotBase64: screenshotBase64 || undefined
      };

      log('info', 'agent_observation', { url: currentUrl });

      let lastError = null;
      swarmManager.updateContext({
        goal,
        lastObservation: observation,
        lastError,
        extractionState: extractionEngine.getState(),
        taskGraphState: taskGraph.getState()
      });

      const swarmProposal = swarmManager.proposeNextAction();
      let action;
      if (swarmProposal && swarmProposal.action) {
        action = swarmProposal.action;
        log('info', 'swarm_action', { chosenBy: swarmProposal.chosenBy, reason: swarmProposal.reason });
      } else {
        action = await planStep(
          goal, observation, previousAction, debug,
          memory, planner, longPlanner, extractionEngine, taskGraph
        );
      }

      if (action.selectorIndex !== undefined) {
        const domSummaryLocal = observation.domSummary || JSON.parse(observation.html || '[]');
        const grounded = domSummaryLocal[action.selectorIndex];
        if (grounded && grounded.selector) {
          action.selector = grounded.selector;
        } else if (grounded) {
          action.selector = `${grounded.t}:nth-of-type(${grounded.i + 1})`;
        }
      }

      if (memory.lastAction &&
          memory.lastAction.action === action.action &&
          memory.lastAction.selector === action.selector) {
        logger.warn('dead_end_detected', { action });
        continue;
      }

      if (action.action === 'navigate' && memory.hasVisited(action.url)) {
        logger.warn('navigation_repeat', { url: action.url });
        continue;
      }

      let result;

      // -------------------------------
      // BATCH 16 / SWARM META-ACTIONS
      // -------------------------------

      if (action.action === 'startExtractionTask') {
        extractionEngine.start(action.schema);
        continue;
      }

      if (action.action === 'addExtractionRow') {
        extractionEngine.add(action.row);
        continue;
      }

      if (action.action === 'nextPage') {
        extractionEngine.nextPage();
        continue;
      }

      if (action.action === 'markExtractionDone') {
        extractionEngine.markDone();
        continue;
      }

      if (action.action === 'rewriteGoal') {
        if (action.newGoal && typeof action.newGoal === 'string') {
          goal = action.newGoal;
          planner.createPlan(goal);
          longPlanner.setStrategy('explore');
        }
        continue;
      }

      if (action.action === 'retryWithNewPlan') {
        planner.reset && planner.reset();
        longPlanner.reset && longPlanner.reset();
        continue;
      }

      if (action.action === 'finish') {
        const extractState = extractionEngine.getState();
        log('info', 'agent_finish', { result });
        return {
          type: 'done',
          message: action.message || 'Task completed',
          extraction: extractState,
          result
        };
      }

      // -------------------------------
      // NORMAL DOM / PLUGIN ACTIONS
      // -------------------------------

      if (['click', 'extract'].includes(action.action)) {
        if (action.selectorIndex === undefined) {
          throw new Error('SelectorIndex missing for grounded action');
        }

        const domSummaryLocal = observation.domSummary || observation.items || [];

        const grounded = domSummaryLocal[action.selectorIndex];
        if (!grounded) {
          const screenshotPlugin = findPluginsForAction(pluginRegistry, 'screenshot')[0];
          const ocrPlugin = findPluginsForAction(pluginRegistry, 'ocr')[0];
          if (screenshotPlugin && ocrPlugin) {
            const shot = await runPluginAction(screenshotPlugin, { page, action: { action: 'screenshot' }, debug });
            const ocr = await runPluginAction(ocrPlugin, { page, action: { action: 'ocr', imageBase64: shot.buffer }, debug });
            const text = ocr.text.toLowerCase();
            const match = domSummaryLocal.find(el => el.x && text.includes(el.x.toLowerCase().slice(0, 20)));
            if (match) {
              action.selectorIndex = match.i;
              grounded = match;
            } else {
              throw new Error('SelectorIndex invalid and OCR repair failed');
            }
          } else {
            throw new Error('Invalid selectorIndex: out of range');
          }
        }

        if (grounded.id) {
          action.selector = `#${grounded.id}`;
        } else if (grounded.c) {
          action.selector = `.${grounded.c}`;
        } else {
          action.selector = `${grounded.t}:nth-of-type(${grounded.i + 1})`;
        }

        const candidates = findPluginsForAction(pluginRegistry, action.action);
        if (candidates.length === 0) {
          logger.warn('no_plugin_for_action', { action: action.action });
          result = await executeAction(action, page);
        } else {
          const plugin = candidates[0];
          try {
            result = await runPluginAction(plugin, { page, action, debug });
          } catch (err) {
            logger.warn('selector_failure', { selector: action.selector, error: err.message });
            continue;
          }
        }
      } else if (action.action === 'extractAll') {
        const candidates = findPluginsForAction(pluginRegistry, 'extractAll');
        if (candidates.length === 0) {
          logger.warn('no_plugin_for_action', { action: action.action });
          result = await executeAction(action, page);
        } else {
          const plugin = candidates[0];
          result = await runPluginAction(plugin, { page, action, debug });
        }

        if (result && Array.isArray(result.items) && result.items.length > 0) {
          if (!extractionEngine.schema) {
            extractionEngine.start({
              name: "weather_forecast_raw",
              fields: [{ name: "text", type: "string" }]
            });
          }

          for (const text of result.items) {
            extractionEngine.add({ text });
          }

          extractionEngine.markDone();

          const extractState = extractionEngine.getState();
          log('info', 'agent_finish', { rows: extractState.rows.length });

          return {
            type: "done",
            result: extractState
          };
        }
      } else if (['scroll', 'waitFor', 'renderedHtml', 'evaluate'].includes(action.action)) {
        const candidates = findPluginsForAction(pluginRegistry, action.action);
        const plugin = candidates[0];
        try {
          result = await runPluginAction(plugin, { page, action, debug });
} catch (err) {
            logger.warn('action_failed', { action: action.action, error: err.message });
            lastError = err;
            swarmManager.updateContext({ lastError: String(err && err.message || err) });
          if (err.message.includes('Timeout') || err.message.includes('not found')) {
            logger.warn('strategy_switch', { from: longPlanner.getStrategy(), to: 'recover' });
            longPlanner.setStrategy('recover');
          }
          throw err;
        }
      } else {
        result = await executeAction(action, page);
      }

      if (action.action === 'navigate') {
        memory.markVisited(currentUrl);
        longPlanner.recordVisit(action.url);
        await page.waitForLoadState('networkidle');
      }

      currentUrl = page ? page.url() : currentUrl;
      currentHtml = page ? await page.content() : currentHtml;
      if (page && useBrowser) {
        screenshotBase64 = await page.screenshot({ encoding: 'base64' });
      }
      previousAction = action;
      memory.lastAction = action;
      memory.addDomSnapshot(observation);
    }

    log('info', 'agent_step_limit_exceeded', { steps: stepCount });
    return { error: 'step_limit_exceeded', steps: stepCount };

  } catch (err) {
    log('error', 'agent_error', { error: err.message });
    throw err;
  } finally {
    if (browser && shouldCloseBrowser) {
      await browser.close();
    }
  }
}

module.exports = { runAgent };