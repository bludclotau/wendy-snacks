function detectBrokenSelectors(dom, selectors) {
  const broken = [];
  const overbroad = [];

  for (const sel of selectors) {
    if (!dom || dom.length === 0) {
      broken.push(sel);
      continue;
    }

    let matchCount = 0;
    for (const el of dom) {
      if (el.selector === sel) matchCount++;
    }

    if (matchCount === 0) {
      broken.push(sel);
    } else if (matchCount > 50) {
      overbroad.push({ selector: sel, count: matchCount });
    }
  }

  return { broken, overbroad };
}

function findSemanticHeadings(dom) {
  if (!dom) return [];

  const headings = [];
  for (const el of dom) {
    if (/^h[1-6]$/i.test(el.t)) {
      headings.push({
        tag: el.t,
        text: el.x || el.text,
        selector: el.selector
      });
    }
  }
  return headings;
}

function findTableContainers(dom) {
  if (!dom) return [];

  return dom
    .filter(el => el.t === 'table')
    .map(el => ({ selector: el.selector, id: el.id, class: el.c }));
}

function proposeRepairs(dom, brokenSelectors) {
  const repairs = [];
  const headings = findSemanticHeadings(dom);
  const tables = findTableContainers(dom);

  for (const sel of brokenSelectors) {
    const candidates = [];

    for (const h of headings) {
      if (h.selector) {
        candidates.push({
          original: sel,
          candidate: h.selector,
          type: 'semantic_heading',
          reason: `Near heading: ${h.text || h.tag}`
        });
      }
    }

    for (const t of tables) {
      if (t.selector) {
        candidates.push({
          original: sel,
          candidate: t.selector,
          type: 'table_container',
          reason: 'Found table container'
        });
      }
    }

    if (sel.includes('day') || sel.includes('forecast')) {
      candidates.push({
        original: sel,
        candidate: '.day, .forecast',
        type: 'class_based',
        reason: 'Class-based fallback'
      });
    }

    if (sel.includes('table')) {
      candidates.push({
        original: sel,
        candidate: 'table',
        type: 'tag_only',
        reason: 'Generic table tag'
      });
    }

    repairs.push({ original: sel, candidates });
  }

  return repairs;
}

function scoreRepairCandidates(dom, candidates) {
  if (!dom || candidates.length === 0) return [];

  return candidates.map(c => {
    let score = 0;

    if (c.type === 'semantic_heading') score += 0.5;
    if (c.type === 'table_container') score += 0.4;
    if (c.type === 'class_based') score += 0.3;
    if (c.type === 'tag_only') score += 0.1;

    for (const el of dom) {
      if (el.selector === c.candidate) {
        score += 0.2;
        break;
      }
    }

    return { ...c, score: parseFloat(score.toFixed(2)) };
  }).sort((a, b) => b.score - a.score);
}

function applyRepair(selector, repair) {
  if (!repair || !repair.candidate) return selector;
  return repair.candidate;
}

module.exports = {
  detectBrokenSelectors,
  proposeRepairs,
  scoreRepairCandidates,
  applyRepair
};