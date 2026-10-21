# FitTakip: İlerleme Kaydı

> Projeye geri dönüldüğünde önce bu dosya okunur. Her çalışma oturumunun sonunda güncellenir (en yeni kayıt en üstte).

## Şu anki durum (21 Ekim 2026)
- **Sürüm:** v9 (`sw.js` → `VERSION = 'fittakip-v9'`)
- **Depo:** https://github.com/lByRootl/fittakip (`main` dalı)
- **Durum:** Uygulama çalışır durumda. Planlanan tüm temel işlevler bitti (bkz. `plan.md`).
- **Kaldığımız yer:** Uygulama GitHub Pages'te yayında (https://lbyrootl.github.io/fittakip/) ve kullanıcının telefonunda kurulu. Yayındaki site ve telefondaki uygulama v9. Son eklenenler: **açık tema** (Profil → Görünüm) ve güncellemelerin telefona güvenilir gelmesi için service worker düzeltmesi. Kullanıcı v9'u telefonda aldı ve açık temanın çalıştığını doğruladı. **Oturum 2 sonunda projeye yine mola verildi**; her şey GitHub'da.

## Sıradaki adımlar
1. [x] Depo public yapıldı, GitHub Pages açıldı, telefona kuruldu
2. [ ] Android'de deneme (başka bir kişinin telefonu; henüz denenmedi)
3. [ ] Kullanıcının "daha sonra gördüğüm eksikler" listesi: yeni oturumda kullanıcıya sorulacak
4. [ ] Gerçek kullanımda gelen geri bildirimlere göre düzeltmeler
5. [ ] Karar bekleyenler: program düzenleme mantığı, grafikler, gerçek yapay zeka entegrasyonu

## Güncelleme yaparken dikkat
- Kod değişince `sw.js` içindeki `VERSION` artırılmalı; yoksa telefon eski önbelleği kullanmaya devam eder.
- Değişikliği telefona almak için: commit → push → 1-2 dk bekle (GitHub Pages yayını) → uygulamayı uygulama değiştiriciden yukarı kaydırıp tamamen kapat ve aç. v9'dan sonra yeni sürüm gelince sayfa kendiliğinden bir kez yenilenir.
- Veri yapısı değişirse `app.js` içindeki `migrate()` fonksiyonu eski kayıtları dönüştürmeli. Kullanıcının telefonundaki veriler kaybolmamalı.
- Bilgisayarda deneme: `python -m http.server 8080` → http://localhost:8080/?today=2026-10-27

## Oturum geçmişi

### Oturum 2 (21 Ekim 2026)
- Kullanıcı, güncellemelerde verilerinin silinip silinmeyeceğini sordu: silinmez (veriler `localStorage`'da, güncelleme yalnızca uygulama dosyalarını değiştirir). Yalnızca Safari'de site verisini silmek ya da ana ekrandaki uygulamayı silip yeniden eklemek veriyi kaldırır.
- Kullanıcı isteğiyle eklendi: **açık tema**. Profil → Görünüm → Koyu / Açık. Seçim `fittakip.theme` anahtarında. Sürüm v8. Ekranlar bilgisayarda (Chrome, 393 px) açık ve koyu temada kontrol edildi; iPhone'da durum çubuğu renginin değişimi sonradan telefonda doğrulandı.
- Sorun: v8 telefona birkaç kez kapat-aç ile gelmedi (site yayındaydı). Sebep: service worker kurulurken dosyaları tarayıcının HTTP önbelleğinden (GitHub Pages ~10 dk) eski haliyle alabiliyordu; ayrıca yeni sürüm devreye girse de açık sayfa eski dosyalarla kalıyordu. Düzeltme (v9): kurulumda `cache: 'reload'`, arka plan tazelemede `cache: 'no-cache'`; yeni sürüm devreye girince sayfa bir kez kendini yeniliyor; uygulama öne gelince `reg.update()` ile güncelleme kontrol ediliyor.
- Kullanıcı uygulamayı tamamen kapatıp açınca v9 telefona geldi; **açık tema telefonda çalışıyor** (kullanıcı doğruladı). Otomatik yenilemenin sonraki güncellemelerde tek açılışta çalışıp çalışmadığı bir sonraki sürümde görülecek. Açık temada iPhone durum çubuğu (saat/pil) rahat okunuyor (kullanıcı doğruladı).

### Oturum 1, devam (20 Ekim 2026)
- Depo public yapıldı (ücretsiz Pages için gerekli); uygulama yayında ve telefona kuruldu.
- Kullanıcı isteğiyle eklendi: program oluştururken **hareket adı otomatik tamamlama**. ~150 hareketlik dahili liste, Türkçe karakter ve boşluk duyarsız arama, seçimi silmek için × butonu. Sürüm v3.
- Otomatik test sayısı 52'ye çıktı, hepsi geçiyor.
- Kullanıcı isteğiyle değişti: ağırlık artırma sorusunda **sabit 2,5 kg kaldırıldı**. Seçilen her hareket için artış miktarı kg olarak yazılıyor ve gelecek haftanın aynı gününe yansıyor. Eski kayıtlar 2,5 kg olarak okunmaya devam ediyor. Sürüm v4, 55 test geçiyor.
- Uygulamanın Android'de de (başka bir kişi, başka ağ) aynı adresten kurulabileceği konuşuldu. Android için **maskable ikonlar** eklendi. Sürüm v5. Gerçek Android cihazda henüz test edilmedi.
- Tüm işlevleri anlatan `FitTakip_Islevler.txt` oluşturuldu. Önce yerel tutuldu, sonra kullanıcı kararını değiştirdi ve **artık depoda**. Yeni işlev eklenince bu dosya da güncellenmeli.
- Kullanıcı isteğiyle eklendi: **birleşik set**. Program oluştururken hareketler birleştirilebiliyor; gruptaki hareketlerin set sayısı aynı olmalı. Ağırlık artırma sorusu birleşik setteki her hareket için ayrı soruluyor. Sürüm v6, 70 test geçiyor.
- Kullanıcı isteğiyle eklendi: antrenman sırasında **ağırlık ve set sayısı plandan farklı girilebiliyor** (− / + ile set). "Tamamla"dan sonra kilitleniyor. Geçmişte plandan farklı olanlar "Plan: … idi" diye görünüyor; gelecek hafta gerçekte yapılan ağırlıktan hesaplanıyor. Sürüm v7, 80 test geçiyor.

### Oturum 1 (20 Ekim 2026)
- Platform kararı alındı: Windows + iPhone 15 olduğu için PWA (native için Mac/Xcode gerekiyor).
- İlk sürüm yazıldı: ilk kurulum, kural tabanlı "AI" program oluşturucu, kendi programını oluşturma, ana sayfa, haftalık görünüm (bu hafta/gelecek hafta), antrenman girişi, haftalık +2,5 kg artırma sorusu, geçmiş, Programlarım (tek aktif program), profil ve yedekleme.
- Kullanıcı isteğiyle eklendi: **2 haftada bir vücut ağırlığı sorma** ve kilo geçmişi. Hareket ağırlığı artırma sorusu aynı kaldı (her antrenman sonunda, gelecek haftanın aynı gününe yansır).
- 44 senaryoluk otomatik test (jsdom, oturuma özel geçici klasörde) geçti. Ekranlar 393 px genişlikte kontrol edildi.
- `plan.md` ve `ilerleme.md` oluşturuldu, proje GitHub'a gönderildi.
- **Benim (Claude) verdiğim kararlar** (kullanıcı isterse değişebilir): ağırlık artırma sorusu her antrenman sonunda soruluyor; geçmiş günler sonradan doldurulamıyor; program bir haftanın ortasında aktif edilirse önceki günler "Aktif değildi" görünüyor.
