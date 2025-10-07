// Sözlüğümüzü JSON dosyasından import ediyoruz.
import techTerms from "/src/dictionaries/android_kotlin_tr.json" with { type: "json" };

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
    // Eğer harfin büyük ve küçük hali aynı ise (örn: boşluk, -), tek olarak ekle.
    pattern += (lower === upper) ? char : `[${lower}${upper}]`;
  }
  return pattern;
}


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

      // --- YENİ VE GELİŞMİŞ DESEN OLUŞTURMA ---
      
      // 1. Önce tüm kelime için Türkçe'ye duyarlı, büyük/küçük harf içermeyen desenimizi oluşturuyoruz.
      let fullPattern = createTurkishCaseInsensitivePattern(tr_term);

      // 2. Ardından, bu desenin sonuna "ünsüz yumuşaması" kuralını uyguluyoruz.
      const lastChar = tr_term.slice(-1).toLowerCase();
      let lastPatternPart = fullPattern.slice(fullPattern.lastIndexOf('[')); // Desenin son karakter setini al, örn: [kK]
      
      switch (lastChar) {
        case 'p':
          lastPatternPart = '[pPbB]'; // Hem p/P hem de b/B'yi kabul et
          break;
        case 'ç':
          lastPatternPart = '[çÇcC]';
          break;
        case 't':
          lastPatternPart = '[tTdD]';
          break;
        case 'k':
          lastPatternPart = '[kKğĞgG]';
          break;
      }
      
      // Desenin sonunu güncellenmiş yumuşama kuralıyla birleştir.
      const basePattern = fullPattern.substring(0, fullPattern.lastIndexOf('['));
      const termPattern = basePattern + lastPatternPart;

      // --- DESEN OLUŞTURMA SONU ---

      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      const suffix = `[${turkishChars}]*`;
      const pattern = `(${termPattern}${suffix})`;
      // DİKKAT: Regex'ten 'i' bayrağını tamamen kaldırıyoruz. Sadece 'g' ve 'u' yeterli.
      const regex = new RegExp(`${boundary}${pattern}`, 'gu');

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