export interface PaymentQueueItem {
    id: string;
    vendor: string;
    amount: number;
    dueDate: string;
    status: "Pending" | "Paid";
  }
  