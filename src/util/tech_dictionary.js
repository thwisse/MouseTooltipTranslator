import techTerms from "/src/dictionaries/android_kotlin_tr.json" with { type: "json" };

function getEnglishPlural(singularTerm) {
  if (singularTerm.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(singularTerm.slice(-2, -1))) { return singularTerm.slice(0, -1) + 'ies'; }
  if (singularTerm.endsWith('s') || singularTerm.endsWith('x') || singularTerm.endsWith('z') || singularTerm.endsWith('ch') || singularTerm.endsWith('sh')) { return singularTerm + 'es'; }
  return singularTerm + 's';
}

function createTurkishCaseInsensitivePattern(term) {
  let pattern = '';
  for (const char of term) {
    const lower = char.toLocaleLowerCase('tr-TR');
    const upper = char.toLocaleUpperCase('tr-TR');
    pattern += (lower === upper) ? char : `[${lower}${upper}]`;
  }
  return pattern;
}

function buildFinalText(text, replacements) {
  if (!replacements || replacements.length === 0) return text;
  replacements.sort((a, b) => a.start - b.start);
  let result = '';
  let lastIndex = 0;
  for (const replacement of replacements) {
    result += text.substring(lastIndex, replacement.start);
    result += replacement.newText;
    lastIndex = replacement.end;
  }
  result += text.substring(lastIndex);
  return result;
}

function enrichSourceText(originalText, techTerms) {
  const sortedEnTerms = Object.keys(techTerms).sort((a, b) => b.length - a.length);
  const enrichments = [];
  const claimedIndices = new Array(originalText.length).fill(false);

  for (const term of sortedEnTerms) {
    const regex = new RegExp(`\\b(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'gi');
    let match;
    while ((match = regex.exec(originalText)) !== null) {
      const matchedWord = match[1];
      const startIndex = match.index;
      const endIndex = startIndex + matchedWord.length;

      if (claimedIndices.slice(startIndex, endIndex).some(isClaimed => isClaimed)) continue;

      enrichments.push({ start: startIndex, end: endIndex, newText: `<b>${matchedWord}</b>` });
      for (let i = startIndex; i < endIndex; i++) claimedIndices[i] = true;
    }
  }
  return buildFinalText(originalText, enrichments);
}

export function enrichTranslation(originalText, translatedText) {
  if (!originalText || !translatedText) {
    return { enrichedText: translatedText, enrichedSource: originalText };
  }

  const normalizedText = translatedText.normalize('NFC');
  const sortedEnTerms = Object.keys(techTerms).sort((a, b) => b.length - a.length);
  const turkishChars = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const enrichments = [];
  const claimedIndices = new Array(normalizedText.length).fill(false);

  // 1. Türkçe metni zenginleştir (Topla ve İnşa Et)
  for (const en_term of sortedEnTerms) {
    const plural_en_term = getEnglishPlural(en_term);
    const shieldRegex = new RegExp(`\\b(${en_term}|${plural_en_term})\\b`, 'i');
    if (!shieldRegex.test(originalText)) continue;

    let tr_term_list = techTerms[en_term];
    if (!Array.isArray(tr_term_list)) tr_term_list = [tr_term_list];

    for (const tr_term of tr_term_list) {
      if (!tr_term) continue;

      let fullPattern = createTurkishCaseInsensitivePattern(tr_term);
      const lastChar = tr_term.slice(-1).toLowerCase();
      if (['p', 'ç', 't', 'k'].includes(lastChar)) {
        let lastPatternPart = fullPattern.slice(fullPattern.lastIndexOf('['));
        switch (lastChar) {
          case 'p': lastPatternPart = '[pPbB]'; break;
          case 'ç': lastPatternPart = '[çÇcC]'; break;
          case 't': lastPatternPart = '[tTdD]'; break;
          case 'k': lastPatternPart = '[kKğĞgG]'; break;
        }
        const basePattern = fullPattern.substring(0, fullPattern.lastIndexOf('['));
        fullPattern = basePattern + lastPatternPart;
      }

      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      const suffix = `[${turkishChars}]*`;
      const pattern = `(${fullPattern}${suffix})`;
      const regex = new RegExp(`${boundary}${pattern}`, 'gu');

      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
        const matchedWord = match[1];
        const startIndex = match.index;
        const endIndex = startIndex + matchedWord.length;
        if (claimedIndices.slice(startIndex, endIndex).some(isClaimed => isClaimed)) continue;

        let termToDisplay = en_term;
        const isTurkishPlural = matchedWord.includes('lar') || matchedWord.includes('ler');
        if (isTurkishPlural) {
          const pluralShieldRegex = new RegExp(`\\b${plural_en_term}\\b`, 'i');
          if (pluralShieldRegex.test(originalText)) termToDisplay = plural_en_term;
        }

        enrichments.push({ start: startIndex, end: endIndex, newText: `${matchedWord} (<b>${termToDisplay}</b>)` });
        for (let i = startIndex; i < endIndex; i++) claimedIndices[i] = true;
      }
    }
  }
  const enrichedTurkishText = buildFinalText(normalizedText, enrichments);

  // 2. İngilizce metni zenginleştir (Topla ve İnşa Et)
  const enrichedSource = enrichSourceText(originalText, techTerms);

  // 3. İki sonucu birlikte döndür
  return {
    enrichedText: enrichedTurkishText,
    enrichedSource: enrichedSource
  };
}