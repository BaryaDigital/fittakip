# FitTakip: Proje Planı

## Proje nedir?
FitTakip, tek bir kişinin kendi iPhone'unda (iPhone 15) kullanacağı kişisel bir fitness takip uygulaması. App Store'a yüklenmeyecek.

- **Geliştirme ortamı:** Windows (Mac/Xcode yok)
- **Uygulama türü:** PWA (Progressive Web App). Safari'den "Ana Ekrana Ekle" ile kuruluyor; tam ekran açılıyor ve internetsiz çalışıyor.
- **Barındırma:** GitHub Pages: https://github.com/lByRootl/fittakip
- **Veri:** Tüm veriler telefonda, `localStorage` içinde (`fittakip.v1` anahtarı). Sunucu ya da veritabanı yok.
- **Dil:** Arayüz Türkçe.
- **Diğer cihazlar:** Aynı adresten Android'de de kurulabilir (Chrome → ⋮ → "Uygulamayı yükle"). Her cihazın verisi kendi içinde ayrı tutulur.

## Teknik yapı
Derleme adımı ya da kütüphane yok; düz HTML/CSS/JavaScript.

| Dosya | Görevi |
|---|---|
| `index.html` | Giriş sayfası, PWA meta etiketleri |
| `style.css` | Tüm tasarım (koyu tema, mobil öncelikli) |
| `app.js` | Uygulamanın tamamı: veri katmanı, program oluşturucu, ekranlar, olaylar |
| `sw.js` | Service worker (çevrimdışı önbellek). **Her güncellemede `VERSION` artırılmalı.** |
| `manifest.webmanifest` | Ana ekran uygulaması ayarları |
| `icon-180/192/512.png` | Uygulama ikonları (iPhone ve genel) |
| `icon-maskable-192/512.png` | Android ikonları: dambıl %80 küçük, başlatıcı daire/şekil kesse de kırpılmaz |

**Ekranlar (hash yönlendirme):** `#/home`, `#/week/0|1`, `#/day/<tarih>`, `#/history`, `#/log/<id>`, `#/programs`, `#/program/<id>`, `#/new-program`, `#/ai`, `#/profile`, `#/edit-profile`, `#/weight`

**Veri modeli (`S`):**
- `profile`: ad, soyad, boy, kilo, hedef kilo, amaç, haftalık gün, yer, seviye
- `programs[]`: `{id, name, source: 'ai'|'custom', createdAt, activatedOn, note, days[7]}`. Her gün ya `{off: true}` ya da `{title, exercises[{id, name, sets, reps, startWeight, bw, link}]}`.
- `activeProgramId`: aynı anda yalnızca bir aktif program
- `logs[]`: tamamlanan antrenmanlar `{programId, date, dayIndex, title, exercises[{exId, weight, reps[], increase}]}`
- `weights[]`: vücut ağırlığı kayıtları `{date, kg}`
- `drafts`: yarım kalan antrenman girişleri ve program oluşturma formu

**Test için tarih değiştirme:** `index.html?today=2026-10-27`

## İşlevler

### 1. İlk kurulum (onboarding)
5 adım: Ad/Soyad/Boy/Kilo → Hedef kilo → Amaç (kilo vermek, kas kazanmak, güçlenmek, formda kalmak) → Haftada kaç gün (2-6) + salon/ev → Fitness geçmişi (Başlangıç, Orta, İleri, Uzman).

### 2. "AI" program oluşturucu
Kurulumdan sonra kullanıcıya program önerir; kullanıcı ister kullanır, ister kendi programını oluşturur.
- Şu an **kural tabanlı**, gerçek bir dil modeli değil. Gün sayısına göre bölünme: 2 gün tüm vücut, 3 gün tüm vücut (başlangıç) ya da itiş/çekiş/bacak, 4 gün üst/alt, 5 gün itiş/çekiş/bacak + üst/alt, 6 gün itiş/çekiş/bacak ×2.
- Seviye, hareket ve set sayısını; amaç, tekrar aralığını belirler. Salon ve ev için ayrı hareket listeleri var.

### 3. Kendi programını oluşturma
Program adı; her gün için "Antrenman" ya da "Off Day"; hareket adı, set, hedef tekrar ve başlangıç ağırlığı.
- **Hareket adı otomatik tamamlama:** Uygulamanın içinde ~150 hareketlik bir liste (`EXERCISE_DB`, app.js) var. Yazmaya başlayınca adında o metin geçen en fazla 8 öneri çıkıyor (ör. "lat" → Lat Pulldown, Lateral Raise...). Arama Türkçe karakter ve boşluk duyarsız ("sinav" → Şınav, "pull down" → Lat Pulldown). Sıralama: adı yazılanla başlayanlar → bir kelimesi yazılanla başlayanlar → adında geçenler; aynı grupta kısa adlar önce. Seçilen ad × ile silinebiliyor. Listede olmayan bir ad da serbestçe yazılabiliyor.
- **Birleşik set:** İki hareketin arasındaki "🔗 Birleşik set yap" düğmesiyle hareketler birleştirilir (2, 3 ya da daha fazla). Veride hareketin `link: true` alanı "önceki hareketle aynı grupta" demektir. Gruptaki hareketlerin set sayısı aynı olmalı. Antrenman, geçmiş, program detayı ve artırma penceresinde A1/A2 etiketli çerçevede gösterilir. **Ağırlık ve artış her hareket için ayrıdır**; artırma sorusu birleşik setteki her hareket için ayrı sorulur.
- **Programlar oluşturulduktan sonra düzenlenemez.** Değişiklik için yeni program oluşturulur. Düzenleme mantığına henüz karar verilmedi.

### 4. Ana sayfa
- Bugünün antrenmanı küçük bir kart olarak görünür; dokununca detay açılır.
- Haftalık şerit, bu haftanın özeti ve güncel kilo/hedef de ana sayfada.

### 5. Antrenman girişi
- Tekrar alanları her zaman boş gelir; kullanıcı yaptığı tekrarları yazar.
- Ağırlık önceki haftadan hesaplanıp önceden doldurulur.
- **Tamamla** → "Hangi hareketlerde ağırlığı artırmaya hazırsın?" (bir, birkaç ya da hepsi). Seçilen her hareket için **kaç kg artırılacağı kullanıcı tarafından yazılır**; varsayılan değer yok, seçilip miktarı yazılmayan hareket varsa kayıt engellenir. Her hareket kendi miktarıyla **gelecek haftanın aynı gününe** yansır; seçilmeyenler aynı ağırlıkta kalır.
  - Kayıtta `increase` alanı kg sayısıdır. Eski kayıtlarda `true` olanlar 2,5 kg olarak okunur (`incOf`).

### 6. Haftalık görünüm
- **Bu hafta / Gelecek hafta** sekmeleri var.
- Gün durumları: Tamamlandı, Tamamlanmadı (geçmiş ve yapılmamış gün), Bugün, Yaklaşan, Off Day, Aktif değildi.
- **Gelecek hafta:** Bu haftanın aynı günü tamamlanmadıysa ağırlıkta "Ağırlık durumu henüz belirlenmedi" yazar.
- Geçmiş günler sonradan doldurulamaz.

### 7. Geçmiş ve Programlarım
- **Geçmiş:** Aktif programın tamamlanan antrenmanlarını gösterir (tekrarlar ve ağırlıklarla).
- **Programlarım:** Programlar adlarıyla listelenir; yanlarında "Aktif et" kutusu var ve yalnızca bir program aktif olabilir. Programa dokununca, o program aktifken yapılan tüm antrenmanların geçmişi görünür.

### 8. Vücut ağırlığı takibi
- 14 günde bir ana sayfada "Tartılma zamanı!" kartı çıkar. "Bugün değil" denirse ertesi gün tekrar gelir.
- **Kilo Takibi sayfası:** başlangıç, toplam değişim, sonraki tartılma tarihi ve her kaydın bir öncekine göre farkı (hedefe yaklaşınca yeşil). Ara kayıt da eklenebilir.

### 9. Profil
- Bilgileri düzenleme, kilo takibine geçiş.
- Yedeği panoya kopyalama / yedekten geri yükleme.
- Tüm verileri silme (iki kez dokunarak onay).

## Bilinçli olarak yapılmayanlar / ileride düşünülebilecekler
- Antrenman programı düzenleme (mantığına henüz karar verilmedi)
- Gerçek bir yapay zeka (Claude API) ile program oluşturma: sunucu ve API anahtarı gerektirir
- Kilo ve ağırlık ilerleme grafikleri
- Kaçırılan günü sonradan doldurma
