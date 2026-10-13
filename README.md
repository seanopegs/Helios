# Helios

Game petualangan 2D di browser, dibuat dengan HTML, CSS, JavaScript, dan canvas.
Pemain menjelajahi ruangan dan lorong, mengambil item, serta menyelesaikan
puzzle. Tampilan awal menandai versi saat ini sebagai `v0.2`.

## Menjalankan

Buka `index.html` di browser. Skrip dimuat sebagai skrip biasa sehingga tidak
memerlukan proses build. Font VT323 dimuat dari Google Fonts saat tersedia.

## Kontrol

- WASD atau tombol panah: bergerak.
- Space: berinteraksi.
- E: buka/tutup inventory.
- 1–4 atau scroll: pilih item.
- X: gunakan item aktif.
- I: tampilkan bantuan.

## Struktur dan pemeriksaan

- `js/helios.js`: logika inti.
- `js/game.js`: state dan interaksi game.
- `js/game-render.js`: rendering.
- `js/game-runtime.js`: loop dan input browser.
- `tests/helios-core.test.js`: pemeriksaan logika inti dengan Node.js.

```sh
node tests/helios-core.test.js
```

Tes inti tidak mencakup seluruh tampilan dan alur permainan di browser.
