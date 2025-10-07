# Mouse Tooltip Translator - Akıllı Teknik Terim Zenginleştirme Fork'u

Bu proje, popüler açık kaynaklı [`Mouse Tooltip Translator`](https://github.com/ttop32/MouseTooltipTranslator) tarayıcı eklentisinin, özellikle İngilizce teknik dokümanlar üzerinden kendini geliştiren Türkçe konuşan yazılım geliştiricileri için özel olarak iyileştirilmiş bir versiyonudur (fork).

## Sorun: Teknik Çevirilerde Anlam Kaybı

İngilizce teknik makaleler, dokümanlar veya eğitim materyalleri okurken, `type inference`, `dependency injection` veya `polymorphism` gibi temel yazılım terimlerinin birebir Türkçe'ye çevrilmesi (`tip çıkarımı`, `bağımlılık enjeksiyonu`, `çok biçimlilik` gibi), sektördeki yaygın kullanımı ve orijinal bağlamı kaybettirerek kafa karışıklığına yol açabilmektedir. Geliştiriciler olarak birçoğumuz bu terimleri orijinal İngilizce halleriyle kullanmaya alışkınız. Bu durum, özellikle öğrenme aşamasındaki geliştiriciler için çevrilmiş metnin anlaşılırlığını düşüren önemli bir engeldir.

## Çözüm: Akıllı Terim Zenginleştirme

Bu fork, yukarıdaki sorunu çözmek için geliştirilmiş yeni ve güçlü bir özellik sunmaktadır: **Akıllı Terim Zenginleştirme**.

Bu özellik, çeviri servisinden (örn: DeepL) gelen Türkçe çeviriyi anlık olarak analiz eder ve içindeki teknik terimleri tespit eder. Ardından, metnin anlamını ve okunabilirliğini güçlendirmek için, çevrilmiş teknik terimlerin yanına parantez içinde **orijinal İngilizce karşılıklarını** ekler.

Böylece, geliştiriciler hem metnin akıcı Türkçe çevirisini okuyabilir hem de sektörde kullanılan orijinal teknik jargona anında hakim olabilirler.

### Canlı Örnek

Bu özelliğin gücünü görmek için aşağıdaki örneği inceleyelim:

> **Çevirilen Metin:**
>
> When you initialize a variable with no explicit type specification, the compiler automatically infers the type with the smallest range enough to represent the value starting from Int. If it doesn't exceed the range of Int, the type is Int. If it does exceed that range, the type is Long. To specify the Long value explicitly, append the suffix L to the value. To use the Byte or Short type, specify it explicitly in the declaration. Explicit type specification triggers the compiler to check that the value doesn't exceed the range of the specified type.

> **Eklediğim Özellik Yokken Elde Edilen Çıktı:**
>
> Açık bir tür belirtimi olmayan bir değişkeni ilklendirdiğinizde, derleyici otomatik olarak Int'den başlayan değeri temsil etmeye yetecek en küçük aralığa sahip türü çıkarır. Int aralığını aşmazsa, tür Int olur. Bu aralığı aşıyorsa, tür Long olur. Long değerini açıkça belirtmek için, değere L son ekini ekleyin. Byte veya Short türünü kullanmak için, bunu bildirimde açıkça belirtin. Açık tür belirtimi, derleyicinin değerin belirtilen türün aralığını aşmadığını kontrol etmesini tetikler.

> **Eklediğim Bu Özellikle Birlikte Elde Edilen Çıktı:**
>
> Açık (**explicit**) bir tür belirtimi (**type specification**) olmayan bir değişkeni ilklendirdiğinizde (**initialize**), derleyici (**compiler**) otomatik olarak Int'den başlayan değeri temsil etmeye (**represent**) yetecek en küçük aralığa (**range**) sahip türü çıkarır (**infers**). Int aralığını (**range**) aşmazsa, tür Int olur. Bu aralığı (**range**) aşıyorsa, tür Long olur. Long değerini açıkça (**explicitly**) belirtmek için, değere L son ekini (**suffix**) ekleyin. Byte veya Short türünü kullanmak için, bunu bildirimde (**declaration**) açıkça (**explicitly**) belirtin. Açık tür belirtimi (**explicit type specification**), derleyicinin (**compiler**) değerin belirtilen türün aralığını (**range**) aşmadığını kontrol etmesini tetikler (**triggers**).

## Anahtar Özellikler

Bu zenginleştirme işlemi, arka planda çalışan ve basit bir kelime bul/değiştir işleminden çok daha fazlasını yapan akıllı bir motor tarafından yönetilir:

* **Kişiselleştirilebilir Sözlük:** Tüm teknik terimler, projenin içindeki `android_kotlin_tr.json` dosyasından yönetilir. Bu sayede kolayca yeni terimler ekleyebilir veya mevcutları düzenleyebilirsiniz.

* **Türkçe Dilbilgisi Desteği (Ünsüz Yumuşaması):** Kod, Türkçe'nin dilbilgisi kurallarını anlar. Sözlükte `anahtar sözcük` yazması yeterlidir; kod, metindeki `anahtar sözcüğünü` kelimesini otomatik olarak tanır ve doğru şekilde zenginleştirir.

* **Gelişmiş Büyük/Küçük Harf Desteği:** Sözlüğe sadece `işaretsiz` yazmanız yeterlidir. Kod, metnin başında geçen `İşaretsiz` kelimesini, Türkçe'ye özgü harf kurallarını (`i`/`İ`) anlayarak doğru bir şekilde bulur ve işler.

* **Akıllı Çoğul Yönetimi:** Sözlüğe sadece terimlerin tekil halini (`property`) eklemeniz yeterlidir. Kod, Türkçe metindeki çoğul ifadeleri (`özellikler`, `özellikleri`) anlar ve orijinal İngilizce metinde de çoğul hali (`properties`) geçiyorsa, zenginleştirmeyi `(properties)` olarak yapar.

* **Bağlam Kontrolü ("Kalkan"):** Bir Türkçe kelimeyi zenginleştirmeden önce, o kelimenin İngilizce karşılığının orijinal metinde gerçekten var olup olmadığını kontrol eder. Bu, alakasız kelimelerin yanlışlıkla etiketlenmesini önler.

## Katkıda Bulunma

Bu projenin en değerli parçası, içinde barındırdığı teknik terim sözlüğüdür. Sözlüğü zenginleştirerek projeye kolayca katkıda bulunabilirsiniz.

#### Sözlüğe Katkıda Bulunma Kuralları

`android_kotlin_tr.json` dosyasına yeni terim eklerken lütfen aşağıdaki kurallara uyun:

1.  **Anahtar (İngilizce Terim) Her Zaman Küçük Harf Olmalı:**
    * ✅ **Doğru:** `"dependency injection"`

2.  **Değer (Türkçe Karşılık) Her Zaman Bir Dizi `[]` Olmalı:**
    * ✅ **Doğru:** `"initialize": ["başlat"]`

3.  **Türkçe Karşılıklar Kök (Yalın) Halde Olmalı:**
    * ✅ **Doğru:** `"property": ["özellik"]` (Kodumuz "özelliği", "özellikler" gibi ekleri otomatik bulur.)

4.  **Tüm Eş Anlamlılar Eklenmeli:**
    * ✅ **Doğru:** `"constructor": ["yapıcı", "kurucu"]`

5.  **Öz-Referans Yapılmamalı:**
    * Türkçe karşılıklar listesine, İngilizce anahtarın kendisi eklenmemelidir.
    * ✅ **Doğru:** `"layout": ["düzen", "yerleşim"]`
    * ❌ **Yanlış:** `"layout": ["düzen", "yerleşim", "layout"]`

## Orijinal Proje

Bu proje, [**ttop32/MouseTooltipTranslator**](https://github.com/ttop32/MouseTooltipTranslator) reposunun bir fork'udur. Orijinal projenin tüm özellikleri ve yetenekleri korunmuştur.

## Lisans

Bu proje, orijinal projenin lisansı olan MIT Lisansı altında dağıtılmaktadır.