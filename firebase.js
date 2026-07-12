// Configuracion de Firebase para Nic Store (antes VIP Phone).
// Usa el MISMO proyecto y coleccion que ya tenias -- no se toca ningun dato existente.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY_REAL", // <-- reemplaza esto con tu apiKey real (el que estaba tapado)
  authDomain: "vipphone-55fa3.firebaseapp.com",
  projectId: "vipphone-55fa3",
  storageBucket: "vipphone-55fa3.firebasestorage.app",
  messagingSenderId: "723372908549",
  appId: "1:723372908549:web:d8b4a3c0d2657fea397c6c",
  measurementId: "G-QMEM80NQ3R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, "productos");

export { app, db, productsCol };
