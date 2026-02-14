// model/DailySummary.ts
export interface DailySummary {
  id: string;
  date: string;
  incomeCash: number;
  incomeTransfer: number;
  expenseCash: number;
  expenseTransfer: number;
  totalSales: number;
  profit: number;
}

// สำหรับสร้างข้อมูลใหม่ (ยังไม่มี id)
export interface DailySummaryInput {
  date: string;
  incomeCash: number;
  incomeTransfer: number;
  expenseCash: number;
  expenseTransfer: number;
  totalSales: number;
  profit: number;
}

export interface DailyDetail {
  id: string;
  date: string;
  type: "incomeCash" | "incomeTransfer" | "expenseCash" | "expenseTransfer";
  amount: number;
  description?: string;
}