import React, { useState } from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";
import * as XLSX from "xlsx";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ImportDailySummaryPage() {
  const [loading, setLoading] = useState(false);

  const handleImport = async (file: File) => {
    setLoading(true);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];

      // 👉 Sheet = วันที่
      const date = sheetNameToDate(sheetName);

      // 👉 array of rows
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
      });

      // 👉 เริ่ม row ที่ 2 (index = 1)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[1]) continue;

        const title = row[1];
        const incomeCash = cleanNumber(row[2]);
        const incomeTransfer = cleanNumber(row[3]);
        const expenseCash = cleanNumber(row[4]);
        const expenseTransfer = cleanNumber(row[5]);

        const totalSales =
          incomeCash + incomeTransfer + expenseCash;

        const profit = totalSales - expenseTransfer;

        await addDoc(collection(db, "dailySummary"), {
          date,
          title,
          incomeCash,
          incomeTransfer,
          expenseCash,
          expenseTransfer,
          totalSales,
          profit,
        });
      }
    }

    setLoading(false);
    alert("นำเข้าข้อมูลสำเร็จ 🎉");
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Import ข้อมูลเก่า (Excel)
        </Typography>

        <Button
          variant="contained"
          component="label"
          disabled={loading}
        >
          เลือกไฟล์ Excel
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleImport(e.target.files[0]);
              }
            }}
          />
        </Button>

        {loading && (
          <Typography sx={{ mt: 2 }}>
            กำลังนำเข้าข้อมูล...
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ===== helpers ===== */
const cleanNumber = (v: any): number => {
  if (!v) return 0;
  return Number(String(v).replace(/,/g, ""));
};

const sheetNameToDate = (name: string) => {
  const day = Number(name);
  return `2026-01-${String(day).padStart(2, "0")}`;
};
