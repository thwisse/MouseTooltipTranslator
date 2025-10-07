// Sözlüğümüzü JSON dosyasından import ediyoruz. Bu, teknik terimlerin İngilizce-Türkçe eşleşmelerini içerir.
import techTerms from "/src/dictionaries/android_kotlin_tr.json" with { type: "json" };

/**
 * Bu ana fonksiyon, orijinal İngilizce metin ve API'den gelen Türkçe çeviriyi alır.
 * Amacı, Türkçe metindeki teknik terimleri bularak, yanlarına parantez içinde
 * orijinal İngilizce hallerini eklemektir. ('aşırı yüklenme' -> 'aşırı yüklenme (overload)')
 * @param {string} originalText - Kullanıcının seçtiği orijinal İngilizce metin.
 * @param {string} translatedText - Çeviri API'sinden gelen ham Türkçe çeviri.
 * @returns {string} - Zenginleştirilmiş veya işlem yapılmamış Türkçe metin.
 */
export function enrichTranslation(originalText, translatedText) {
  // Girdilerden herhangi biri boş veya tanımsız ise, işlemi direkt sonlandır ve orijinal çeviriyi geri dön.
  if (!originalText || !translatedText) {
    return translatedText;
  }

  // --- Veri Hazırlığı ---

  // Metindeki olası Unicode kodlama farklılıklarını standart bir forma sokarak Regex eşleşmelerinin tutarlılığını artırır.
  const normalizedText = translatedText.normalize('NFC');
  
  // Sözlükteki İngilizce anahtar kelimeleri, en uzundan en kısaya doğru sıralıyoruz.
  const sortedEnTerms = Object.keys(techTerms).sort((a, b) => b.length - a.length);
  
  // Regex'te kullanılacak ve bir kelime ekinin parçası olabilecek tüm Türkçe harfleri tanımlıyoruz.
  const turkishChars = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

  // --- "Topla ve İnşa Et" Algoritması ---

  // ADIM 1: TOPLA
  const enrichments = [];
  const claimedIndices = new Array(normalizedText.length).fill(false);

  // Sıralanmış İngilizce terimler üzerinde döngüye başla.
  for (const en_term of sortedEnTerms) {
    
    // Kalkan (Shield): Bu İngilizce terimin, orijinal metinde tam bir kelime olarak geçip geçmediğini kontrol et.
    const shieldRegex = new RegExp(`\\b${en_term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (!shieldRegex.test(originalText)) {
      continue;
    }

    // Sözlükten ilgili İngilizce terimin Türkçe karşılıklarını al.
    let tr_term_list = techTerms[en_term];
    if (!Array.isArray(tr_term_list)) {
      tr_term_list = [tr_term_list];
    }

    // Türkçe karşılıklar üzerinde döngüye başla.
    for (const tr_term of tr_term_list) {
      if (!tr_term) continue;

      // --- ÜNSÜZ YUMUŞAMASI MOTORU ---
      let termPattern = tr_term;
      const lastChar = tr_term.slice(-1); // Kelimenin son harfini al
      
      // Kelimenin son harfi p, ç, t, k ise, Regex desenini yumuşamış hali de içerecek şekilde güncelle.
      switch (lastChar) {
        case 'p':
          termPattern = tr_term.slice(0, -1) + '[pb]';
          break;
        case 'ç':
          termPattern = tr_term.slice(0, -1) + '[çc]';
          break;
        case 't':
          termPattern = tr_term.slice(0, -1) + '[td]';
          break;
        case 'k':
          termPattern = tr_term.slice(0, -1) + '[kğg]';
          break;
      }
      
      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      const suffix = `[${turkishChars}]*`;
      // Kök kelimeyi ve potansiyel ekleri tek bir yakalama grubuna alıyoruz.
      const pattern = `(${termPattern}${suffix})`;
      const regex = new RegExp(`${boundary}${pattern}`, 'giu');

      let match;
      // `regex.exec()` döngüsü, metni DEĞİŞTİRMEDEN tüm eşleşmeleri sırayla bulur.
      while ((match = regex.exec(normalizedText)) !== null) {
        // exec'in döndürdüğü ilk eleman tüm eşleşme, ikincisi ise bizim parantez içine aldığımız yakalanan gruptur.
        const matchedWord = match[1]; 
        const startIndex = match.index;
        const endIndex = startIndex + matchedWord.length;

        // Bu kelimenin bulunduğu konumun daha önce başka bir kural tarafından işaretlenip işaretlenmediğini kontrol et.
        if (claimedIndices.slice(startIndex, endIndex).some(isClaimed => isClaimed)) {
          continue;
        }

        // Eğer konum boşsa, zenginleştirme listesine ekle.
        enrichments.push({
          start: startIndex,
          end: endIndex,
          newText: `${matchedWord} (${en_term})`
        });

        // Bu kelimenin kapladığı alanı "dolu" olarak işaretle.
        for (let i = startIndex; i < endIndex; i++) {
          claimedIndices[i] = true;
        }
      }
    }
  }

  // Eğer hiç zenginleştirme yapılmadıysa, metni olduğu gibi geri dön.
  if (enrichments.length === 0) {
    return normalizedText;
  }
  
  // ADIM 2: İNŞA ET
  // Zenginleştirme listesini, metindeki sıralarına göre diz.
  enrichments.sort((a, b) => a.start - b.start);
  
  let final_text = '';
  let lastIndex = 0;
  
  // Listeyi kullanarak metni sıfırdan, parça parça yeniden oluştur.
  for (const enrichment of enrichments) {
    // Son parçadan bu parçaya kadar olan normal metni ekle.
    final_text += normalizedText.substring(lastIndex, enrichment.start);
    // Zenginleştirilmiş parçayı ekle.
    final_text += enrichment.newText;
    // Konumumuzu güncelle.
    lastIndex = enrichment.end;
  }
  // Metnin son zenginleştirmeden sonraki kalan kısmını ekle.
  final_text += normalizedText.substring(lastIndex);

  return final_text;
}