// Sözlüğümüzü JSON dosyasından import ediyoruz.
import techTerms from "/src/dictionaries/android_kotlin_tr.json" with { type: "json" };

/**
 * Verilen tekil bir İngilizce kelimenin olası çoğul halini basit kurallarla üretir.
 * @param {string} singularTerm - Tekil İngilizce terim (örn: "property").
 * @returns {string} - Olası çoğul hali (örn: "properties").
 */
function getEnglishPlural(singularTerm) {
    // Sonu sesli harf + 'y' ile bitmiyorsa (örn: property, ama boy değil) 'y' düşer 'ies' gelir.
    if (singularTerm.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(singularTerm.slice(-2, -1))) {
        return singularTerm.slice(0, -1) + 'ies';
    }
    // Sonu 's', 'x', 'z', 'ch', 'sh' ile bitiyorsa 'es' eki alır.
    if (singularTerm.endsWith('s') || singularTerm.endsWith('x') || singularTerm.endsWith('z') || singularTerm.endsWith('ch') || singularTerm.endsWith('sh')) {
        return singularTerm + 'es';
    }
    // Varsayılan durum: sonuna 's' ekle.
    return singularTerm + 's';
}

/**
 * Bir Türkçe kelimeyi, 'i'/'İ'/'ı'/'I' gibi harfleri doğru işleyen,
 * büyük/küçük harfe duyarsız bir Regex desenine dönüştürür.
 * @param {string} term - Desen oluşturulacak Türkçe kelime.
 * @returns {string} Regex içinde kullanılacak güvenli desen.
 */
function createTurkishCaseInsensitivePattern(term) {
  let pattern = '';
  for (const char of term) {
    // Her harf için, onun küçük ve büyük halini içeren bir karakter seti [ab] oluşturuyoruz.
    // Türkçe'ye özgü locale dönüşümlerini kullanarak doğruluğu garantiliyoruz.
    const lower = char.toLocaleLowerCase('tr-TR');
    const upper = char.toLocaleUpperCase('tr-TR');
    pattern += (lower === upper) ? char : `[${lower}${upper}]`;
  }
  return pattern;
}

/**
 * Bu ana fonksiyon, orijinal İngilizce metin ve API'den gelen Türkçe çeviriyi alır.
 * ... (diğer yorumlar öncekiyle aynı)
 */
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
    const plural_en_term = getEnglishPlural(en_term);
    const shieldPattern = `\\b(${en_term}|${plural_en_term})\\b`;
    const shieldRegex = new RegExp(shieldPattern, 'i');
    if (!shieldRegex.test(originalText)) {
      continue;
    }

    let tr_term_list = techTerms[en_term];
    if (!Array.isArray(tr_term_list)) {
      tr_term_list = [tr_term_list];
    }

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
          if (pluralShieldRegex.test(originalText)) {
            termToDisplay = plural_en_term;
          }
        }
        
        enrichments.push({
          start: startIndex,
          end: endIndex,
          newText: `${matchedWord} (${termToDisplay})`
        });

        for (let i = startIndex; i < endIndex; i++) claimedIndices[i] = true;
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