require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 🔥 Autoriser Firebase et d'autres domaines
const app = express();


app.use(cors());




app.get('/firebase-config', (req, res) => {
    res.json({
        apiKey: process.env.API_KEY,
        authDomain: process.env.AUTH_DOMAIN,
        projectId: process.env.PROJECT_ID,
        storageBucket: process.env.STORAGE_BUCKET,
        messagingSenderId: process.env.MESSAGING_SENDER_ID,
        appId: process.env.APP_ID,
        measurementId: process.env.MEASUREMENT_ID
    });
});



app.post('/scan', async (req, res) => {
    try {
        const { decodedText, userId } = req.body;
        if (!decodedText || !userId) {
            return res.status(400).json({ error: "Données invalides." });
        }

        const dateKey = new Date().toISOString().split('T')[0];
        const telephone = "0666666666";
        const dateHeure = new Date().toLocaleString();

        const userDoc = await db.collection("Users_client").doc(userId).get();
        if (!userDoc.exists) {
            throw new Error("Utilisateur non trouvé dans Users_client.");
        }
        const { nom, prenom } = userDoc.data();

        const docSnapshot = await db.collection("Users_client").doc(userId).collection(dateKey).doc(decodedText).get();
        if (docSnapshot.exists) {
            throw new Error("Le patient est déjà enregistré.");
        }

        const querySnapshot = await db.collection("Users").doc(decodedText).collection(dateKey).get();
        let patientId = (querySnapshot.size + 1).toString().padStart(2, '0');

        // Enregistrer dans Firestore
        await db.collection("Users").doc(decodedText).collection(dateKey).doc(patientId).set({
            id: userId,
            ticket: patientId,
            nom: nom,
            prenom: prenom,
            telephone: telephone,
            dateEnregistrement: dateHeure,
        });

        await db.collection("Users_client").doc(userId).collection(dateKey).doc(decodedText).set({
            id: userId,
            ticket: patientId,
            dateEnregistrement: dateHeure,
        });

        return res.json({ success: true, ticket: patientId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});



app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});