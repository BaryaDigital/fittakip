# FitTakip

Kişisel fitness takip uygulaması. Bir PWA (web uygulaması) olarak yazıldı: iPhone'da Safari'den "Ana Ekrana Ekle" ile kuruluyor, tam ekran ve internetsiz çalışıyor. Tüm veriler telefonda (localStorage) saklanıyor.

## Dosyalar
- `plan.md`: projenin ne olduğu, yapısı ve tüm işlevler
- `ilerleme.md`: kaldığımız yer ve oturum geçmişi
- `FitTakip_Islevler.txt`: işlevlerin kısa, madde madde anlatımı
- `index.html`: giriş sayfası
- `style.css`: tasarım
- `app.js`: uygulamanın tamamı (veri, program oluşturucu, ekranlar)
- `sw.js`: çevrimdışı çalışma (service worker). **Dosyaları her güncellediğinde `VERSION` değerini artır.**
- `manifest.webmanifest`, `icon-*.png`: ana ekran ikonu ve ayarları (`icon-maskable-*` Android için)

## Bilgisayarda deneme
```
python -m http.server 8080
```
Ardından http://localhost:8080 adresini aç. Test için tarihi değiştirebilirsin: `http://localhost:8080/?today=2026-10-27`

## iPhone'a kurulum (kalıcı yol: GitHub Pages)
Service worker yalnızca HTTPS üzerinde çalıştığı için, uygulamanın internetsiz de çalışması için HTTPS bir adreste yayınlanması gerekiyor.
1. GitHub'da bir depo aç ve bu klasördeki dosyaları yükle.
2. Depo ayarları → Pages → Branch: `main` / root → Kaydet.
3. iPhone'da Safari ile `https://<kullanıcı-adın>.github.io/<depo>/` adresini aç.
4. Paylaş → **Ana Ekrana Ekle**.

Not: Ana ekrandaki uygulamanın verileri Safari'den ayrı tutulur. Adres değişirse veriler taşınmaz; bunun için Profil → Yedekleme'yi kullan.
