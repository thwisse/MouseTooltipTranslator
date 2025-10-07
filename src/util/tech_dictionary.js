import techTerms from "/src/dictionaries/android_kotlin_tr.json" with { type: "json" };

export function enrichTranslation(originalText, translatedText) {
  if (!originalText || !translatedText) {
    return translatedText;
  }

  const normalizedText = translatedText.normalize('NFC');
  const sortedEnTerms = Object.keys(techTerms).sort((a, b) => b.length - a.length);
  const turkishChars = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

  const enrichments = [];
  const claimedIndices = new Array(normalizedText.length).fill(false);

  for (const en_term of sortedEnTerms) {
    const shieldRegex = new RegExp(`\\b${en_term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (!shieldRegex.test(originalText)) {
      continue;
    }

    let tr_term_list = techTerms[en_term];
    if (!Array.isArray(tr_term_list)) {
      tr_term_list = [tr_term_list];
    }

    for (const tr_term of tr_term_list) {
      if (!tr_term) continue;

      // --- KRİTİK DÜZELTME BU SATIRDA ---
      // Kök kelimeyi ve potansiyel ekleri tek bir yakalama grubuna alıyoruz.
      // Önceki hatam: Sadece kökü yakalamaya çalışmaktı (tr_term).
      // Doğrusu: Kökü ve ekleri birlikte yakalamak (tr_term + suffix).
      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      const suffix = `[${turkishChars}]*`;
      const pattern = `(${tr_term}${suffix})`; // Kök ve eki birleştir
      const regex = new RegExp(`${boundary}${pattern}`, 'giu');

      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
        // exec'in döndürdüğü ilk eleman tüm eşleşme, ikincisi ise yakalanan grup.
        const matchedWord = match[1]; 
        const startIndex = match.index;
        const endIndex = startIndex + matchedWord.length;

        if (claimedIndices.slice(startIndex, endIndex).some(isClaimed => isClaimed)) {
          continue;
        }

        enrichments.push({
          start: startIndex,
          end: endIndex,
          newText: `${matchedWord} (${en_term})`
        });

        for (let i = startIndex; i < endIndex; i++) {
          claimedIndices[i] = true;
        }
      }
    }
  }

  if (enrichments.length === 0) {
    return normalizedText;
  }
  
  enrichments.sort((a, b) => a.start - b.start);
  
  let final_text = '';
  let lastIndex = 0;
  
  for (const enrichment of enrichments) {
    final_text += normalizedText.substring(lastIndex, enrichment.start);
    final_text += enrichment.newText;
    lastIndex = enrichment.end;
  }
  final_text += normalizedText.substring(lastIndex);

  return final_text;
}