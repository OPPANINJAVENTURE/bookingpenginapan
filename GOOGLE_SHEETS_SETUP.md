# Setup Google Sheet untuk Record Oppa Ninja

App ini sudah ditukar supaya data booking dan user disimpan dalam Google Sheet melalui Google Apps Script.

## 1. Buat Google Sheet

1. Buka Google Sheets.
2. Buat spreadsheet baru, contoh nama: `Record Oppa Ninja Database`.
3. Pergi ke `Extensions` > `Apps Script`.

## 2. Masukkan kod Apps Script

1. Dalam Apps Script, buka fail `Code.gs`.
2. Padam kod contoh yang ada.
3. Copy semua kod daripada fail `google-apps-script.gs`.
4. Paste ke `Code.gs`.
5. Tekan `Save`.

## 3. Setup table automatik

1. Dalam Apps Script, pilih function `setup`.
2. Tekan `Run`.
3. Google akan minta permission. Pilih akaun anda dan approve.

Script akan buat sheet:

- `Users`
- `Bookings`

Password user tidak disimpan sebagai teks biasa. Script simpan hash dan salt dalam column tersembunyi.

## 4. Tukar kod owner jika mahu

Kod owner default ialah:

```text
930997Ay
```

Untuk tukar:

1. Dalam Apps Script, pergi ke `Project Settings`.
2. Cari `Script properties`.
3. Tambah property:
   - Name: `OWNER_CODE`
   - Value: kod owner baru

## 5. Deploy sebagai Web App

1. Dalam Apps Script, tekan `Deploy` > `New deployment`.
2. Pilih type: `Web app`.
3. Setting:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Tekan `Deploy`.
5. Copy `Web app URL`.

## 6. Sambungkan frontend

1. Buka fail `google-sheet-config.js`.
2. Gantikan URL contoh dengan `Web app URL` daripada Apps Script:

```js
window.GOOGLE_SHEET_CONFIG = {
  webAppUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
};
```

Pastikan `index.html` berada dalam folder yang sama dengan:

- `app.js`
- `styles.css`
- `google-sheet-config.js`
- `assets/`

## 7. Cara guna

1. Buka `index.html`.
2. Owner login guna kod owner.
3. User register akaun.
4. Owner approve user melalui menu `Approval`.
5. Booking yang disimpan akan masuk ke sheet `Bookings`.

## 8. Deploy semula ke GitHub Pages

1. Pastikan `google-sheet-config.js` sudah berisi `Web app URL` yang betul.
2. Upload atau push semula folder app ke GitHub.
3. Di GitHub, buka repo anda.
4. Pergi ke `Settings` > `Pages`.
5. Pilih branch yang digunakan untuk website, biasanya `main`.
6. Simpan setting dan tunggu GitHub Pages selesai publish.
7. Buka semula link GitHub Pages dan cuba login/register.

## Nota penting

- Data sekarang boleh dilihat dari device/browser lain kerana sumbernya Google Sheet.
- Session login masih ikut browser semasa, tetapi data booking dan user berada dalam Google Sheet.
- Kalau ubah kod Apps Script selepas deploy, tekan `Deploy` > `Manage deployments` > edit deployment > pilih version baru.
