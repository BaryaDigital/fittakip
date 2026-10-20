# FitTakip: İlerleme Kaydı

> Projeye geri dönüldüğünde önce bu dosya okunur. Her çalışma oturumunun sonunda güncellenir (en yeni kayıt en üstte).

## Şu anki durum (20 Ekim 2026)
- **Sürüm:** v2 (`sw.js` → `VERSION = 'fittakip-v2'`)
- **Depo:** https://github.com/lByRootl/fittakip (`main` dalı)
- **Durum:** Uygulama çalışır durumda. Planlanan tüm temel işlevler bitti (bkz. `plan.md`).
- **Kaldığımız yer:** Kod GitHub'a gönderildi. Sıradaki adım GitHub Pages'i açmak ve telefona kurmak (aşağıda).

## Sıradaki adımlar
1. [ ] GitHub'da depo → **Settings → Pages** → Source: "Deploy from a branch", Branch: `main` / `/ (root)` → **Save**
2. [ ] Birkaç dakika sonra iPhone'da Safari ile https://lbyrootl.github.io/fittakip/ adresini aç
3. [ ] Paylaş → **Ana Ekrana Ekle**, sonra uygulamayı ana ekrandan aç ve ilk kurulumu yap
4. [ ] Gerçek kullanımda gelen geri bildirimlere göre düzeltmeler
5. [ ] Karar bekleyenler: program düzenleme mantığı, grafikler, gerçek yapay zeka entegrasyonu

## Güncelleme yaparken dikkat
- Kod değişince `sw.js` içindeki `VERSION` artırılmalı; yoksa telefon eski önbelleği kullanmaya devam eder.
- Değişikliği telefona almak için: commit → push → uygulamayı kapatıp aç (gerekirse iki kez).
- Veri yapısı değişirse `app.js` içindeki `migrate()` fonksiyonu eski kayıtları dönüştürmeli. Kullanıcının telefonundaki veriler kaybolmamalı.
- Bilgisayarda deneme: `python -m http.server 8080` → http://localhost:8080/?today=2026-10-27

## Oturum geçmişi

### Oturum 1 (20 Ekim 2026)
- Platform kararı alındı: Windows + iPhone 15 olduğu için PWA (native için Mac/Xcode gerekiyor).
- İlk sürüm yazıldı: ilk kurulum, kural tabanlı "AI" program oluşturucu, kendi programını oluşturma, ana sayfa, haftalık görünüm (bu hafta/gelecek hafta), antrenman girişi, haftalık +2,5 kg artırma sorusu, geçmiş, Programlarım (tek aktif program), profil ve yedekleme.
- Kullanıcı isteğiyle eklendi: **2 haftada bir vücut ağırlığı sorma** ve kilo geçmişi. Hareket ağırlığı artırma sorusu aynı kaldı (her antrenman sonunda, gelecek haftanın aynı gününe yansır).
- 44 senaryoluk otomatik test (jsdom, oturuma özel geçici klasörde) geçti. Ekranlar 393 px genişlikte kontrol edildi.
- `plan.md` ve `ilerleme.md` oluşturuldu, proje GitHub'a gönderildi.
- **Benim (Claude) verdiğim kararlar** (kullanıcı isterse değişebilir): ağırlık artırma sorusu her antrenman sonunda soruluyor; geçmiş günler sonradan doldurulamıyor; program bir haftanın ortasında aktif edilirse önceki günler "Aktif değildi" görünüyor.
