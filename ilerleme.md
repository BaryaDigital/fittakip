# FitTakip: İlerleme Kaydı

> Projeye geri dönüldüğünde önce bu dosya okunur. Her çalışma oturumunun sonunda güncellenir (en yeni kayıt en üstte).

## Şu anki durum (20 Ekim 2026)
- **Sürüm:** v7 (`sw.js` → `VERSION = 'fittakip-v7'`)
- **Depo:** https://github.com/lByRootl/fittakip (`main` dalı)
- **Durum:** Uygulama çalışır durumda. Planlanan tüm temel işlevler bitti (bkz. `plan.md`).
- **Kaldığımız yer:** Uygulama GitHub Pages'te yayında (https://lbyrootl.github.io/fittakip/) ve kullanıcının telefonunda kurulu. En son antrenman günü ağırlık ve set sayısını değiştirme eklendi (tamamlanınca kilitlenir).

## Sıradaki adımlar
1. [x] Depo public yapıldı, GitHub Pages açıldı, telefona kuruldu
2. [ ] Gerçek kullanımda gelen geri bildirimlere göre düzeltmeler
3. [ ] Karar bekleyenler: program düzenleme mantığı, grafikler, gerçek yapay zeka entegrasyonu

## Güncelleme yaparken dikkat
- Kod değişince `sw.js` içindeki `VERSION` artırılmalı; yoksa telefon eski önbelleği kullanmaya devam eder.
- Değişikliği telefona almak için: commit → push → uygulamayı kapatıp aç (gerekirse iki kez).
- Veri yapısı değişirse `app.js` içindeki `migrate()` fonksiyonu eski kayıtları dönüştürmeli. Kullanıcının telefonundaki veriler kaybolmamalı.
- Bilgisayarda deneme: `python -m http.server 8080` → http://localhost:8080/?today=2026-10-27

## Oturum geçmişi

### Oturum 1, devam (20 Ekim 2026)
- Depo public yapıldı (ücretsiz Pages için gerekli); uygulama yayında ve telefona kuruldu.
- Kullanıcı isteğiyle eklendi: program oluştururken **hareket adı otomatik tamamlama**. ~150 hareketlik dahili liste, Türkçe karakter ve boşluk duyarsız arama, seçimi silmek için × butonu. Sürüm v3.
- Otomatik test sayısı 52'ye çıktı, hepsi geçiyor.
- Kullanıcı isteğiyle değişti: ağırlık artırma sorusunda **sabit 2,5 kg kaldırıldı**. Seçilen her hareket için artış miktarı kg olarak yazılıyor ve gelecek haftanın aynı gününe yansıyor. Eski kayıtlar 2,5 kg olarak okunmaya devam ediyor. Sürüm v4, 55 test geçiyor.
- Uygulamanın Android'de de (başka bir kişi, başka ağ) aynı adresten kurulabileceği konuşuldu. Android için **maskable ikonlar** eklendi. Sürüm v5. Gerçek Android cihazda henüz test edilmedi.
- Tüm işlevleri anlatan `FitTakip_Islevler.txt` oluşturuldu. **Kullanıcı isteğiyle GitHub'a gönderilmiyor**; `.git/info/exclude` ile yok sayılıyor. Yeni işlev eklenince bu dosya da güncellenmeli.
- Kullanıcı isteğiyle eklendi: **birleşik set**. Program oluştururken hareketler birleştirilebiliyor; gruptaki hareketlerin set sayısı aynı olmalı. Ağırlık artırma sorusu birleşik setteki her hareket için ayrı soruluyor. Sürüm v6, 70 test geçiyor.
- Kullanıcı isteğiyle eklendi: antrenman sırasında **ağırlık ve set sayısı plandan farklı girilebiliyor** (− / + ile set). "Tamamla"dan sonra kilitleniyor. Geçmişte plandan farklı olanlar "Plan: … idi" diye görünüyor; gelecek hafta gerçekte yapılan ağırlıktan hesaplanıyor. Sürüm v7, 80 test geçiyor.

### Oturum 1 (20 Ekim 2026)
- Platform kararı alındı: Windows + iPhone 15 olduğu için PWA (native için Mac/Xcode gerekiyor).
- İlk sürüm yazıldı: ilk kurulum, kural tabanlı "AI" program oluşturucu, kendi programını oluşturma, ana sayfa, haftalık görünüm (bu hafta/gelecek hafta), antrenman girişi, haftalık +2,5 kg artırma sorusu, geçmiş, Programlarım (tek aktif program), profil ve yedekleme.
- Kullanıcı isteğiyle eklendi: **2 haftada bir vücut ağırlığı sorma** ve kilo geçmişi. Hareket ağırlığı artırma sorusu aynı kaldı (her antrenman sonunda, gelecek haftanın aynı gününe yansır).
- 44 senaryoluk otomatik test (jsdom, oturuma özel geçici klasörde) geçti. Ekranlar 393 px genişlikte kontrol edildi.
- `plan.md` ve `ilerleme.md` oluşturuldu, proje GitHub'a gönderildi.
- **Benim (Claude) verdiğim kararlar** (kullanıcı isterse değişebilir): ağırlık artırma sorusu her antrenman sonunda soruluyor; geçmiş günler sonradan doldurulamıyor; program bir haftanın ortasında aktif edilirse önceki günler "Aktif değildi" görünüyor.
