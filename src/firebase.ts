import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDTidxTNnzHDxEUcSk8ljx2fF0ZdgmFck0",
    authDomain: "income-jiw.firebaseapp.com",
    projectId: "income-jiw",
};

const app = initializeApp(firebaseConfig);

// 🔴 ต้องมี export
export const db = getFirestore(app);
