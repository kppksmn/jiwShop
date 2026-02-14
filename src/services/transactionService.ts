import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function addTransaction(data: {
  type: "income" | "expense";
  amount: number;
  note: string;
  date: string;
}) {
  await addDoc(collection(db, "transactions"), data);
}

export async function getTransactions() {
  const snap = await getDocs(collection(db, "transactions"));
  return snap.docs.map(d => d.data());
}
