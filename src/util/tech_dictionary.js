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
  // --- Fonksiyon Başlangıcı ve Girdi Kontrolü ---
  console.log("[Enricher] Zenginleştirme fonksiyonu başlatıldı.");
  console.log("[Enricher] Gelen Orijinal Metin:", originalText);
  console.log("[Enricher] Gelen Çevrilmiş Metin:", translatedText);

  // Eğer girdilerden herhangi biri boş veya tanımsız ise, işlemi direkt sonlandır ve orijinal çeviriyi geri dön.
  if (!originalText || !translatedText) {
    console.warn("[Enricher] UYARI: Girdi metinlerinden biri boş. İşlem atlanıyor.");
    return translatedText;
  }

  // --- Veri Hazırlığı ---

  // Metindeki olası Unicode kodlama farklılıklarını (örn: 'ö' harfinin iki ayrı karakterle temsil edilmesi)
  // standart bir forma sokarak Regex eşleşmelerinin tutarlılığını artırır.
  const normalizedText = translatedText.normalize('NFC');
  
  // Sözlükteki İngilizce anahtar kelimeleri, en uzundan en kısaya doğru sıralıyoruz.
  // Bu, "primary constructor" gibi daha spesifik bir kuralın, "constructor" gibi daha genel bir
  // kural tarafından ezilmesini (önce çalışmasını) engeller. Çok önemlidir.
  const sortedEnTerms = Object.keys(techTerms).sort((a, b) => b.length - a.length);
  
  // Regex'te kullanılacak ve bir kelime ekinin parçası olabilecek tüm Türkçe harfleri tanımlıyoruz.
  // Bu, güvenilmez olan `\p{L}` yerine daha kesin bir kontrol sağlar.
  const turkishChars = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

  // --- "Topla ve İnşa Et" Algoritması ---

  // ADIM 1: TOPLA
  // Bu dizi, metinde bulduğumuz ve zenginleştireceğimiz her bir kelimenin
  // bilgilerini (başlangıç/bitiş konumu, yeni metin) tutacak.
  const enrichments = [];
  
  // Bu dizi, metnin hangi karakter indekslerinin bir zenginleştirme tarafından "kapatıldığını"
  // takip eder. Bu sayede bir kelimeyi birden fazla kez zenginleştirmeyi önleriz.
  const claimedIndices = new Array(normalizedText.length).fill(false);

  console.log(`[Enricher] Zenginleştirme döngüsü başlıyor. Toplam ${sortedEnTerms.length} İngilizce kural işlenecek.`);

  // Sıralanmış İngilizce terimler üzerinde döngüye başla.
  for (const en_term of sortedEnTerms) {
    
    // Kalkan (Shield): Bu İngilizce terimin, orijinal metinde tam bir kelime olarak
    // geçip geçmediğini kontrol et. Bu, bağlam dışı zenginleştirmeleri önler.
    // Örn: "anahtar" kelimesini, sadece metinde gerçekten "key" geçiyorsa zenginleştirir.
    const shieldRegex = new RegExp(`\\b${en_term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (!shieldRegex.test(originalText)) {
      // Eğer orijinal metinde bu İngilizce terim yoksa, bu kurala ait Türkçe kelimeleri hiç arama.
      continue;
    }
    console.log(`[Enricher] Kalkanı Geçti -> '${en_term}'`);

    // Sözlükten ilgili İngilizce terimin Türkçe karşılıklarını al.
    let tr_term_list = techTerms[en_term];
    if (!Array.isArray(tr_term_list)) {
      tr_term_list = [tr_term_list];
    }

    // Türkçe karşılıklar üzerinde döngüye başla.
    for (const tr_term of tr_term_list) {
      if (!tr_term) continue;

      // Regex Deseni Oluşturma:
      // boundary: Kelimenin başında olduğumuzu veya önünde harf/rakam olmadığını kontrol eder. Unicode uyumludur.
      const boundary = `(?<=^|[^${turkishChars}0-9_])`;
      // suffix: Türkçe kelime kökünden sonra gelebilecek tüm ekleri yakalar.
      const suffix = `[${turkishChars}]*`;
      // pattern: Kök ve eki tek bir "yakalama grubu" (...) içine alır. Bu, kelimenin tamamını elde etmemizi sağlar.
      const pattern = `(${tr_term}${suffix})`;
      const regex = new RegExp(`${boundary}${pattern}`, 'giu');
      console.log(`[Enricher]   '${en_term}' için Türkçe '${tr_term}' köküyle Regex oluşturuldu:`, regex);

      let match;
      // `regex.exec()` döngüsü, metni DEĞİŞTİRMEDEN tüm eşleşmeleri sırayla bulur.
      while ((match = regex.exec(normalizedText)) !== null) {
        // exec'in döndürdüğü ilk eleman tüm eşleşme, ikincisi ise bizim parantez içine aldığımız yakalanan gruptur.
        const matchedWord = match[1]; 
        const startIndex = match.index;
        const endIndex = startIndex + matchedWord.length;

        console.log(`[Enricher]     -> Eşleşme bulundu: '${matchedWord}' | Pozisyon: ${startIndex}`);

        // Bu kelimenin bulunduğu konumun daha önce başka (daha uzun) bir kural tarafından
        // işaretlenip işaretlenmediğini kontrol et.
        if (claimedIndices.slice(startIndex, endIndex).some(isClaimed => isClaimed)) {
          console.warn(`[Enricher]     -> UYARI: '${matchedWord}' atlanıyor çünkü pozisyonu daha önce işaretlenmiş.`);
          continue;
        }

        // Eğer konum boşsa, zenginleştirme listesine ekle.
        enrichments.push({
          start: startIndex,
          end: endIndex,
          newText: `${matchedWord} (${en_term})`
        });
        console.log(`[Enricher]     -> ONAYLANDI: '${matchedWord}' listeye eklendi.`);

        // Bu kelimenin kapladığı alanı "dolu" olarak işaretle.
        for (let i = startIndex; i < endIndex; i++) {
          claimedIndices[i] = true;
        }
      }
    }
  }

  console.log(`[Enricher] Döngü bitti. Toplam ${enrichments.length} adet zenginleştirme bulundu.`);

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

  console.log("[Enricher] Metin başarıyla yeniden inşa edildi.");
  console.log("[Enricher] Sonuç:", final_text);
  return final_text;
}