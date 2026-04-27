#!/usr/bin/env node

const { chromium } = require('playwright');
const { fetchPage } = require('./wendy.js');
const { runAllPlugins } = require('./plugins.js');
const { askGemma } = require('./llm.js');
const { runAgent } = require('./agent.js');
const { SYSTEM_PROMPT } = require('./systemPrompt.js');
const logger = require('./logger.js');
const path = require('path');

const log = logger.info;
const debug = process.argv.includes('--debug');
const verbose = process.argv.includes('--verbose');

const argv = process.argv.slice(2);
const useBrowser = argv.includes('--browser');
const useAsk = argv.includes('--ask');
const useSummarize = argv.includes('--summarize');
const useAgent = argv.includes('--agent');
const askIndex = argv.indexOf('--ask');
const agentIndex = argv.indexOf('--agent');
const userQuestion = useAsk ? argv[askIndex + 1] : null;
const agentGoal = useAgent ? argv[agentIndex + 1] : null;
const url = argv.find(arg => !arg.startsWith('--'));

log('info', 'cli_start');

(async () => {
  try {
    if (useAsk) {
      log('info', 'cli_ask_mode');
      const answer = await askGemma([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userQuestion }
      ]);
      console.log(JSON.stringify({ answer }));
    } else if (useAgent) {
      if (!url) {
        log('error', 'cli_no_url');
        console.error('Usage: wendy [--browser] --agent "<goal>" <url>');
        process.exit(1);
      }

      log('info', 'cli_agent_mode');
      log('info', 'cli_agent_initial_load');

      let initialContext = null;
      let browser = null;

      if (useBrowser) {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const screenshotBase64 = await page.screenshot({ encoding: 'base64' });

        initialContext = {
          browser,
          page,
          html,
          url: page.url(),
          screenshotBase64
        };

        log('info', 'cli_agent_pass_context', { url: page.url() });
      } else {
        const fetchResult = await fetchPage(url);
        initialContext = {
          html: fetchResult.content,
          url: fetchResult.finalUrl
        };

        log('info', 'cli_agent_pass_context', { url: fetchResult.finalUrl });
      }

      const result = await runAgent({
        url,
        goal: agentGoal,
        useBrowser,
        debug,
        verbose
      }, 10, initialContext);

      if (browser) {
        await browser.close();
      }

      console.log(JSON.stringify(result, null, 2));
    } else if (useSummarize) {
      if (!url) {
        log('error', 'cli_no_url');
        console.error('Usage: wendy [--browser] [--summarize] <url>');
        process.exit(1);
      }

      log('info', 'cli_summarize_mode');

      let html;
      if (useBrowser) {
        log('info', 'cli_browser_mode');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        html = await page.content();
        await browser.close();
        log('info', 'cli_browser_complete');
      } else {
        const fetchResult = await fetchPage(url);
        html = fetchResult.content;
      }

      const summary = await askGemma([
        { role: 'system', content: 'You are Wendy Snacks. Summarize the page clearly and concisely.' },
        { role: 'user', content: html.slice(0, 5000) }
      ]);

      console.log(JSON.stringify({ summary }));
    } else {
      if (!url) {
        log('error', 'cli_no_url');
        console.error('Usage: wendy [--browser] <url>');
        process.exit(1);
      }

      const pluginsDir = path.join(__dirname, '..', 'plugins');
      let fetchResult;
      let browserContext = null;

      if (useBrowser) {
        log('info', 'cli_browser_mode');
        log('info', 'cli_fetch_start', { url });
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        const html = await page.content();
        const screenshotBase64 = await page.screenshot({ encoding: 'base64' });
        await browser.close();
        fetchResult = { html, url: page.url(), screenshotBase64 };
        browserContext = { html, screenshotBase64 };
        log('info', 'cli_fetch_complete', { url });
        log('info', 'cli_browser_complete');
      } else {
        log('info', 'cli_fetch_start', { url });
        fetchResult = await fetchPage(url);
        log('info', 'cli_fetch_complete', { url });
      }

      log('info', 'cli_plugins_start');
      const pluginResults = await runAllPlugins(pluginsDir, fetchResult.content || fetchResult.html, fetchResult.finalUrl || fetchResult.url, browserContext);
      log('info', 'cli_plugins_complete');

      const output = useBrowser
        ? { browser: fetchResult, plugins: pluginResults }
        : { fetch: fetchResult, plugins: pluginResults };

      log('info', 'cli_complete');
      console.log(JSON.stringify(output, null, 2));
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
})();