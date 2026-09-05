<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Review Card Gateway</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">

    <!-- BAGIAN 1: TAMPILAN SAAT KARTU DI-SCAN (REDIRECT LOADING) -->
    <div id="redirectView" class="text-center hidden">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-lg font-semibold text-slate-700">Mengarahkan ke Ulasan Google Maps...</h2>
        <p id="errorText" class="text-sm text-rose-500 mt-2"></p>
    </div>

    <!-- BAGIAN 2: HALAMAN FORM PENDAFTARAN/ADMIN KLIEN -->
    <div id="adminView" class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 hidden">
        <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-slate-800">Aktivasi Kartu Review</h1>
            <p class="text-sm text-slate-500 mt-1">Daftarkan Place ID Google Maps ke Kartu Fisik</p>
        </div>

        <!-- Indikator status koneksi Firebase, membantu debugging -->
        <div id="connectionStatus" class="mb-4 text-xs text-center text-slate-400">Menghubungkan ke server...</div>

        <form id="activationForm" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">ID Fisik Kartu</label>
                <input type="text" id="cardId" required placeholder="Contoh: CARD-001"
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            </div>

            <div>
                <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Nama Bisnis</label>
                <input type="text" id="businessName" required placeholder="Contoh: Kopi Senang"
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            </div>

            <div>
                <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Google Maps Place ID</label>
                <input type="text" id="placeId" required placeholder="Contoh: ChIJN1t_tDeuEms..."
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            </div>

            <button type="submit" id="saveBtn"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition duration-200 text-sm shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                Simpan & Aktifkan Kartu
            </button>
        </form>

        <div id="responseMessage" class="mt-4 text-center text-sm font-medium hidden"></div>

        <!-- Panel debug: menampilkan detail error teknis agar mudah dilacak -->
        <details id="debugPanel" class="mt-4 hidden">
            <summary class="text-xs text-slate-400 cursor-pointer select-none">Detail teknis (untuk debugging)</summary>
            <pre id="debugText" class="mt-2 text-[11px] leading-snug text-rose-500 whitespace-pre-wrap break-all bg-rose-50 rounded-lg p-3"></pre>
        </details>
    </div>

    <!-- LOGIKA JAVASCRIPT & KODE FIREBASE DI DALAMNYA -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import {
            getFirestore,
            doc,
            getDoc,
            setDoc,
            enableIndexedDbPersistence
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import {
            getAuth,
            signInAnonymously,
            onAuthStateChanged
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        // Konfigurasi Firebase Anda
        const firebaseConfig = {
            apiKey: "AIzaSyCiLuG_nM1ASeLdLggEfjSjCAREhl-tTV8",
            authDomain: "riview-card.firebaseapp.com",
            databaseURL: "https://riview-card-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "riview-card",
            storageBucket: "riview-card.firebasestorage.app",
            messagingSenderId: "75278422286",
            appId: "1:75278422286:web:fc47020c9325ffe745c75f",
            measurementId: "G-S7PN1NFZDJ"
        };

        // Inisialisasi Firebase, Firestore & Auth
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);

        const urlParams = new URLSearchParams(window.location.search);
        const cardParam = urlParams.get('card');

        const redirectView = document.getElementById('redirectView');
        const adminView = document.getElementById('adminView');
        const errorText = document.getElementById('errorText');
        const connectionStatus = document.getElementById('connectionStatus');
        const debugPanel = document.getElementById('debugPanel');
        const debugText = document.getElementById('debugText');

        function showDebug(err) {
            debugPanel.classList.remove('hidden');
            debugText.textContent = `code: ${err.code || '-'}\nmessage: ${err.message || err}`;
            console.error(err);
        }

        // CEK APAKAH INI LINK SCAN KARTU ATAU BUKAN
        if (cardParam) {
            redirectView.classList.remove('hidden');
        } else {
            adminView.classList.remove('hidden');
        }

        // --- AUTENTIKASI ANONIM ---
        // Firestore Rules yang aman biasanya mensyaratkan request.auth != null.
        // Tanpa baris ini, semua getDoc()/setDoc() akan DITOLAK (permission-denied)
        // kalau Rules mewajibkan login, walau login-nya cuma anonim.
        signInAnonymously(auth).catch((err) => {
            connectionStatus.textContent = '⚠️ Gagal terhubung ke server autentikasi.';
            showDebug(err);
        });

        onAuthStateChanged(auth, (user) => {
            if (user) {
                connectionStatus.textContent = '';
                connectionStatus.classList.add('hidden');
                if (cardParam) {
                    handleRedirect(cardParam);
                }
            } else {
                connectionStatus.textContent = 'Menghubungkan ke server...';
            }
        });

        // Fungsi Redirect Otomatis ke Google Maps
        async function handleRedirect(id) {
            try {
                const docRef = doc(db, "cards", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const placeId = data.placeId;

                    if (!placeId) {
                        errorText.textContent = "⚠️ Kartu ditemukan, tapi Place ID belum diisi.";
                        return;
                    }

                    // URL Resmi Google Maps Write Review
                    window.location.replace(`https://search.google.com/local/writereview?placeid=${placeId}`);
                } else {
                    errorText.textContent = "⚠️ Kartu ini belum diaktivasi atau tidak terdaftar di sistem.";
                }
            } catch (err) {
                if (err.code === 'permission-denied') {
                    errorText.textContent = "⚠️ Akses database ditolak. Cek Firestore Security Rules.";
                } else {
                    errorText.textContent = "Terjadi kesalahan koneksi database.";
                }
                showDebug(err);
            }
        }

        // Fungsi Simpan/Aktivasi Kartu oleh Admin/Klien
        const form = document.getElementById('activationForm');
        const messageDiv = document.getElementById('responseMessage');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cId = document.getElementById('cardId').value.trim();
            const businessName = document.getElementById('businessName').value.trim();
            const placeId = document.getElementById('placeId').value.trim();
            const saveBtn = document.getElementById('saveBtn');

            if (!cId || !businessName || !placeId) {
                messageDiv.classList.remove('hidden');
                messageDiv.className = "mt-4 text-center text-sm font-medium text-rose-600";
                messageDiv.textContent = "Semua kolom wajib diisi.";
                return;
            }

            // Pastikan sudah punya sesi auth (anonim) sebelum menulis ke Firestore
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (err) {
                    messageDiv.classList.remove('hidden');
                    messageDiv.className = "mt-4 text-center text-sm font-medium text-rose-600";
                    messageDiv.textContent = "Gagal autentikasi ke server: " + err.message;
                    showDebug(err);
                    return;
                }
            }

            // Ubah tombol jadi loading & matikan sementara agar tidak di-klik 2x
            saveBtn.textContent = "Menyimpan...";
            saveBtn.disabled = true;
            messageDiv.classList.add('hidden');
            debugPanel.classList.add('hidden');

            try {
                await setDoc(doc(db, "cards", cId), {
                    businessName,
                    placeId,
                    updatedAt: new Date().toISOString()
                });

                // Jika Berhasil
                messageDiv.classList.remove('hidden');
                messageDiv.className = "mt-4 text-center text-sm font-medium text-emerald-600";
                messageDiv.textContent = `Sukses! Kartu ${cId} berhasil dihubungkan.`;
                form.reset();
            } catch (err) {
                // Jika Gagal (misal: terhalang Rules Firebase)
                messageDiv.classList.remove('hidden');
                messageDiv.className = "mt-4 text-center text-sm font-medium text-rose-600";

                if (err.code === 'permission-denied') {
                    messageDiv.textContent = "Gagal: Akses ditolak oleh Firestore Security Rules.";
                } else if (err.code === 'unavailable') {
                    messageDiv.textContent = "Gagal: Tidak bisa terhubung ke server (cek koneksi internet).";
                } else {
                    messageDiv.textContent = "Gagal: " + err.message;
                }
                showDebug(err);
            } finally {
                // Kembalikan tombol seperti semula
                saveBtn.textContent = "Simpan & Aktifkan Kartu";
                saveBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
