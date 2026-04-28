const SYNONYMS = {
  'asia pacific': ['apac', 'asian markets', 'asia-pacific'],
  'most active': ['active', 'volume leaders', 'volume'],
  'top gainers': ['gainers', 'advancers', 'leadership gains'],
  'top losers': ['decliners', 'losers', 'leadership declines'],
  's&p 500': ['sp500', 'sp 500', 'sn&p'],
  'nasdaq': ['nasdaq composite'],
  'dow jones': ['dow', 'dj']
};

function normalizeHeading(heading) {
  if (!heading) return '';
  return heading
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSynonyms(normalized) {
  for (const [key, values] of Object.entries(SYNONYMS)) {
    if (normalized === key || values.includes(normalized)) {
      return [key, ...values];
    }
  }
  return [normalized];
}

function tokenOverlap(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let count = 0;
  for (const t of set1) {
    if (set2.has(t)) count++;
  }
  return count;
}

function scoreHeadingMatch(heading, query) {
  const normHeading = normalizeHeading(heading);
  const normQuery = normalizeHeading(query);

  const headingTokens = normHeading.split(/\s+/);
  const queryTokens = normQuery.split(/\s+/);

  let score = tokenOverlap(headingTokens, queryTokens);
  if (score > 0) return score;

  const syns = getSynonyms(normQuery);
  for (const syn of syns) {
    if (normHeading.includes(syn)) {
      return 1;
    }
  }

  if (normHeading.includes(normQuery) || normQuery.includes(normHeading)) {
    return 0.5;
  }

  return 0;
}

function detectSemanticTables({ html, textBlocks = [], headings = [] }, query) {
  const matched = [];
  const allHeadings = headings.map(h => normalizeHeading(h.text || h));

  for (const h of headings) {
    const text = h.text || '';
    const score = scoreHeadingMatch(text, query);

    if (score > 0) {
      matched.push({
        heading: normalizeHeading(text),
        score,
        selector: h.selector || null,
        tableIndex: h.index || null
      });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  return {
    matched,
    allHeadings
  };
}

function detectAllSemanticTables(html, headings, queries) {
  const results = {};

  for (const q of queries) {
    results[q] = detectSemanticTables({ html, headings }, q);
  }

  return results;
}

module.exports = {
  detectSemanticTables,
  detectAllSemanticTables,
  scoreHeadingMatch,
  normalizeHeading,
  SYNONYMS
};