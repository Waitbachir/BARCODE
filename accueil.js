fetch('http://localhost:3000/firebase-config')
    .then(response => response.json())
    .then(firebaseConfig => {
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "log_client.html";
    }
});


    })
    .catch(error => console.error('Erreur lors du chargement de Firebase:', error));
    window.onScan = function onScan() {
        const html5QrCode = new Html5Qrcode("reader");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log(`Scan result: ${decodedText}`, decodedResult);
    
            auth.onAuthStateChanged((user) => {
                if (user) {
                    const userId = user.uid;
    
                    // Appel API vers `server.js`
                    fetch("http://localhost:3000/scan", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ decodedText, userId }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById("message").innerText = "Patient enregistré avec succès !";
                            window.location.href = `gsa.html?id=${userId}`;
                        } else {
                            throw new Error(data.error);
                        }
                    })
                    .catch(error => {
                        document.getElementById("message").innerText = "Erreur : " + error.message;
                    });
    
                } else {
                    window.location.href = "log_client.html";
                }
            });
    
            html5QrCode.stop().then(ignore => {
                document.getElementById("message").innerText = `QR Code Scanned: ${decodedText}`;
            }).catch(err => {
                console.error("Failed to stop scanning.", err);
            });
        };
    
        const config = { fps: 10, qrbox: 250 };
    
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                console.error("Failed to start scanning.", err);
            });
    };
    


function logoutUser() {
    auth.signOut()
        .then(() => {
            console.log("User signed out successfully");
            window.location.href = "log_client.html";
        })
        .catch((error) => {
            console.error("Error signing out:", error);
        });
}

window.addEventListener("beforeunload", function () {
    sessionStorage.setItem("scrollPosition", window.scrollY);
});

window.addEventListener("load", function () {
    const scrollPosition = sessionStorage.getItem("scrollPosition");
    if (scrollPosition) {
        window.scrollTo(0, parseInt(scrollPosition));
        sessionStorage.removeItem("scrollPosition");
    }
});