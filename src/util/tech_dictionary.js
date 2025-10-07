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

      // --- YENİ: ÜNSÜZ YUMUŞAMASI MOTORU ---
      let termPattern = tr_term;
      const lastChar = tr_term.slice(-1); // Kelimenin son harfini al
      
      // Kelimenin son harfi p, ç, t, k ise, Regex desenini yumuşamış hali de içerecek şekilde güncelle.
      switch (lastChar) {
        case 'p':
          termPattern = tr_term.slice(0, -1) + '[pb]'; // 'kitap' -> 'kita[pb]'
          break;
        case 'ç':
          termPattern = tr_term.slice(0, -1) + '[çc]'; // 'ağaç' -> 'ağa[çc]'
          break;
        case 't':
          termPattern = tr_term.slice(0, -1) + '[td]'; // 'metot' -> 'meto[td]'
          break;
        case 'k':
          termPattern = tr_term.slice(0, -1) + '[kğg]'; // 'sözcük' -> 'sözcü[kğg]'
          break;
      }
      // --- YENİ KISIM SONU ---

      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      const suffix = `[${turkishChars}]*`;
      // 'pattern' değişkenini oluştururken artık 'tr_term' yerine 'termPattern' kullanıyoruz.
      const pattern = `(${termPattern}${suffix})`;
      const regex = new RegExp(`${boundary}${pattern}`, 'giu');

      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
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

  // ... (fonksiyonun geri kalanı aynı)
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