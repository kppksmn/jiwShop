import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DailySummary } from "../model/DailySummary";



export async function getDailySummaries(): Promise<DailySummary[]> {
    const q = query(
      collection(db, "dailySummary"),
      orderBy("date", "desc")
    );
  
    const snap = await getDocs(q);
  
    return snap.docs.map(doc => {
      const data = doc.data();
  
      return {
        id: doc.id,
        date: data.date || "",                // ตรวจสอบให้มีค่า default
        incomeCash: Number(data.incomeCash) || 0,
        incomeTransfer: Number(data.incomeTransfer) || 0,
        expenseCash: Number(data.expenseCash) || 0,
        expenseTransfer: Number(data.expenseTransfer) || 0,
        totalSales: Number(data.totalSales) || 0,
        profit: Number(data.profit) || 0,
      } as DailySummary;
    });
  }

  export async function addDailySummary(data: {
    date: string;
    incomeCash: number;
    incomeTransfer: number;
    expenseCash: number;
    expenseTransfer: number;
    totalSales: number;
    profit: number;
  }) {
  const totalIncome = data.incomeCash + data.incomeTransfer;
  const totalExpense = data.expenseCash + data.expenseTransfer;

  const summary = {
    ...data,
    totalIncome,
    totalExpense,
    totalSales: totalIncome,
    profit: totalIncome - totalExpense,
    createdAt: Timestamp.now(),
  };

  await addDoc(collection(db, "dailySummary"), summary);
}


export const deleteDailySummary = async (id: string) => {
    const docRef = doc(db, "dailySummary", id); // ชื่อ collection ต้องตรงกับที่คุณใช้ get/add
    await deleteDoc(docRef);
  };