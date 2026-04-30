<img width="1906" height="911" alt="image" src="https://github.com/user-attachments/assets/00dbeb43-684c-418a-b9e6-aefdc635579b" />

# 📄 PDF Tools

Aplikasi web untuk mengelola file PDF secara gratis dan aman. Semua proses dilakukan di browser — file tidak pernah diunggah ke server manapun.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)

---

## ✨ Fitur Utama

- 🔒 **100% Privat** — Semua file diproses di browser, tidak ada data yang dikirim ke server
- ⚡ **Cepat** — Proses langsung di browser tanpa upload/download ulang
- 🆓 **Gratis** — Tanpa batas penggunaan, tanpa watermark pada output
- ↩️ **Undo/Redo** — Mendukung Ctrl+Z dan Ctrl+Y pada tools interaktif
- 🔄 **Reset** — Kembalikan ke kondisi awal dengan satu klik
- 📱 **Responsive** — Tampilan optimal di desktop dan mobile

---

## 🛠️ Daftar Tools

| # | Tool | Fungsi |
|---|------|--------|
| 1 | **Gabungkan PDF** | Menggabungkan beberapa file PDF menjadi satu dokumen |
| 2 | **Pisahkan PDF** | Memisahkan halaman tertentu dari file PDF menjadi file terpisah |
| 3 | **Kompres PDF** | Mengurangi ukuran file PDF agar lebih ringan |
| 4 | **PDF ke Word** | Mengkonversi file PDF menjadi dokumen Word (.docx) |
| 5 | **Word ke PDF** | Mengkonversi dokumen Word (.docx) menjadi file PDF |
| 6 | **Edit PDF** | Menambahkan teks pada halaman PDF, bisa dipindahkan dan dihapus |
| 7 | **PDF ke JPG** | Mengkonversi setiap halaman PDF menjadi gambar JPG, bisa download satu-satu atau ZIP |
| 8 | **Tanda Air** | Menambahkan watermark teks atau gambar pada PDF, bisa pilih halaman tertentu |
| 9 | **Rotasi PDF** | Memutar halaman PDF (90°, 180°, 270°), bisa per halaman atau semua |
| 10 | **Nomor Halaman** | Menambahkan nomor halaman pada PDF |
| 11 | **JPG ke PDF** | Mengkonversi gambar JPG/PNG menjadi file PDF |
| 12 | **Urutkan Halaman** | Mengatur ulang urutan halaman PDF dengan drag & drop, bisa hapus halaman |

---

## 🔧 Detail Fitur Tools

### Edit PDF
- Tambah teks dengan warna dan ukuran kustom
- Pilih dan pindahkan teks dengan drag
- Hapus anotasi yang tidak diperlukan
- **Undo/Redo** (Ctrl+Z / Ctrl+Y) dan **Reset**

### Tanda Air
- Dua jenis: **Teks** atau **Gambar** (PNG/JPG)
- Atur transparansi, ukuran, rotasi, dan warna
- 9 posisi penempatan (kiri atas, tengah, kanan bawah, dll.)
- Pilih halaman: **Semua halaman** atau **halaman tertentu**
- **Undo/Redo** dan **Reset**

### Rotasi PDF
- Putar per halaman (90° / -90°)
- Putar semua halaman sekaligus
- Preview visual rotasi real-time
- **Undo/Redo** dan **Reset**

### Urutkan Halaman
- Drag & drop untuk mengatur urutan
- Hapus halaman yang tidak diperlukan
- Thumbnail preview setiap halaman
- **Undo/Redo** dan **Reset**

### PDF ke JPG
- Preview semua halaman sebagai gambar
- Pilih halaman yang ingin didownload
- Download satu per satu atau semua sebagai ZIP

---

## 💻 Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| **React 18** | UI Framework |
| **Vite 5** | Build tool |
| **TailwindCSS 3** | Styling |
| **pdf-lib** | Manipulasi PDF (edit, merge, split, watermark, rotate) |
| **pdfjs-dist** | Rendering PDF untuk preview |
| **mammoth** | Konversi Word ke HTML |
| **docx** | Pembuatan file Word (.docx) |
| **html2pdf.js** | Konversi HTML ke PDF |
| **jszip** | Pembuatan file ZIP |

---

## 🚀 Instalasi & Menjalankan

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- npm (terinstall otomatis bersama Node.js)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/maxnmrantau/pdf-tools.git

# 2. Masuk ke folder project
cd pdf-tools

# 3. Install dependencies
npm install

# 4. Jalankan development server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### Build untuk Production

```bash
npm run build
```

Hasil build ada di folder `dist/`.

### Preview Build Production

```bash
npm run preview
```

---

## 🌐 Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login dengan GitHub
2. Klik **"Add New Project"**
3. Pilih repository **pdf-tools**
4. Framework akan terdeteksi otomatis sebagai **Vite**
5. Klik **Deploy**

Atau menggunakan Vercel CLI:

```bash
npm i -g vercel
vercel
```

---

## 📂 Struktur Project

```
pdf-tools/
├── public/
├── src/
│   ├── components/
│   │   ├── common/          # Komponen umum (FileUploader, PdfPreview, dll)
│   │   ├── layout/          # Layout (Header, Footer)
│   │   └── tools/           # Komponen setiap tool
│   ├── config/
│   │   └── tools.js         # Konfigurasi daftar tools
│   ├── pages/
│   │   ├── Home.jsx         # Halaman utama
│   │   └── ToolPage.jsx     # Halaman tool
│   ├── utils/
│   │   ├── fileUtils.js     # Utilitas file (download, read)
│   │   └── pdfUtils.js      # Utilitas PDF (merge, split, watermark, dll)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## 📝 Lisensi

Project ini bersifat open source di bawah [MIT License](LICENSE).
