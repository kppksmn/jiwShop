import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { THSarabunNew } from "../fonts/THSarabunNew";
import { PromptRegular } from "../fonts/Prompt-Regular";

/* ================= INTERFACE ================= */
export interface DailySummary {
  id: string;
  date: string;
  title: string;
  incomeCash: number;
  incomeTransfer: number;
  expenseCash: number;
  expenseTransfer: number;
  totalSales: number;
  profit: number;
}
interface DailyTotal {
  date: string;
  incomeCash: number;
  incomeTransfer: number;
  expenseCash: number;
  expenseTransfer: number;
  totalSales: number;
  profit: number;
}
/* ================= FORMAT ================= */
const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/* ================= COMPONENT ================= */
export default function DailySummaryTab() {
  const [rows, setRows] = useState<DailySummary[]>([]);
  const [openForm, setOpenForm] = useState(false);

  /* ===== FORM ===== */
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [incomeCash, setIncomeCash] = useState("");
  const [incomeTransfer, setIncomeTransfer] = useState("");
  const [expenseCash, setExpenseCash] = useState("");
  const [expenseTransfer, setExpenseTransfer] = useState("");

  /* ===== FILTER ===== */
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  /* ===== MONTH SELECT ===== */
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  /* ================= CALCULATE ================= */
  const totalSales =
    Number(incomeCash) + Number(incomeTransfer) + Number(expenseCash);

  const profit =
    totalSales -
    Number(expenseTransfer);



  /* ================= LOAD ================= */
  const loadRows = async () => {
    const q = query(
      collection(db, "dailySummary"),
      orderBy("createdAt", "asc") // ⭐ add ก่อน อยู่บน
    );

    const snap = await getDocs(q);
    const data: DailySummary[] = [];

    snap.forEach((d) => {
      const r = d.data() as any;
      data.push({
        id: d.id,
        date: r.date,
        title: r.title,
        incomeCash: Number(r.incomeCash),
        incomeTransfer: Number(r.incomeTransfer),
        expenseCash: Number(r.expenseCash),
        expenseTransfer: Number(r.expenseTransfer),
        totalSales: Number(r.totalSales),
        profit: Number(r.profit),
      });
    });

    setRows(data);
  };

  useEffect(() => {
    loadRows();
  }, []);

  /* ================= SAVE ================= */
  const save = async () => {
    if (!title.trim()) return alert("กรุณากรอกชื่อรายการ");

    const docRef = await addDoc(collection(db, "dailySummary"), {
      date,
      title,
      incomeCash: Number(incomeCash),
      incomeTransfer: Number(incomeTransfer),
      expenseCash: Number(expenseCash),
      expenseTransfer: Number(expenseTransfer),
      totalSales,
      profit,
      createdAt: serverTimestamp(),
    });

    setRows((p) => [
      ...p,
      {
        id: docRef.id,
        date,
        title,
        incomeCash: Number(incomeCash),
        incomeTransfer: Number(incomeTransfer),
        expenseCash: Number(expenseCash),
        expenseTransfer: Number(expenseTransfer),
        totalSales,
        profit,
      },
    ]);

    setTitle("");
    setIncomeCash("0");
    setIncomeTransfer("0");
    setExpenseCash("0");
    setExpenseTransfer("0");
    setOpenForm(false);
  };

  /* ================= DELETE ================= */
  const confirmDelete = async (id: string) => {
    if (window.confirm("ต้องการลบหรือไม่")) {
      await deleteDoc(doc(db, "dailySummary", id));
      setRows((p) => p.filter((r) => r.id !== id));
    }
  };

  /* ================= FILTER ================= */
  const filteredRows = rows.filter((r) => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    return true;
  })

  const monthlyRows = rows
    .filter((r) => {
      const [y, m] = r.date.split("-").map(Number);
      return y === selectedYear && m === selectedMonth;
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // 🔹 เรียงตามวันที่
  const monthlyDailyTotals: DailyTotal[] = Object.values(
    monthlyRows.reduce<Record<string, DailyTotal>>((acc, r) => {
      if (!acc[r.date]) {
        acc[r.date] = {
          date: r.date,
          incomeCash: 0,
          incomeTransfer: 0,
          expenseCash: 0,
          expenseTransfer: 0,
          totalSales: 0,
          profit: 0,
        };
      }

      acc[r.date].incomeCash += r.incomeCash;
      acc[r.date].incomeTransfer += r.incomeTransfer;
      acc[r.date].expenseCash += r.expenseCash;
      acc[r.date].expenseTransfer += r.expenseTransfer;
      acc[r.date].totalSales += r.totalSales;
      acc[r.date].profit += r.profit;

      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
  const monthlyTotal = monthlyRows.reduce(
    (a, r) => {
      a.incomeCash += r.incomeCash;
      a.incomeTransfer += r.incomeTransfer;
      a.expenseCash += r.expenseCash;
      a.expenseTransfer += r.expenseTransfer;
      a.totalSales += r.totalSales;
      a.profit += r.profit;
      return a;
    },
    {
      incomeCash: 0,
      incomeTransfer: 0,
      expenseCash: 0,
      expenseTransfer: 0,
      totalSales: 0,
      profit: 0,
    }
  );

  /* ================= EXPORT ================= */
  const exportMonthlySummaryExcel = () => {
    const data = [
      ...monthlyDailyTotals.map((r) => ({
        วันที่: r.date,
        รับสด: r.incomeCash,
        รับโอน: r.incomeTransfer,
        จ่ายสด: r.expenseCash,
        จ่ายโอน: r.expenseTransfer,
        ยอดขาย: r.totalSales,
        คงเหลือ: r.profit - r.expenseCash,
      })),
      {
        วันที่: "รวมทั้งเดือน",
        รับสด: monthlyTotal.incomeCash,
        รับโอน: monthlyTotal.incomeTransfer,
        จ่ายสด: monthlyTotal.expenseCash,
        จ่ายโอน: monthlyTotal.expenseTransfer,
        ยอดขาย: monthlyTotal.totalSales,
        คงเหลือ: monthlyTotal.profit - monthlyTotal.expenseCash,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);

    /* ===== STYLE ===== */
    const border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center" },
      border,
    };

    const numberStyle = {
      numFmt: "#,##0.00", // ⭐ 1,000,000.00
      alignment: { horizontal: "right" },
      border,
    };

    const textStyle = {
      alignment: { horizontal: "center" },
      border,
    };
    const positiveStyle = {
      ...numberStyle,
      font: { color: { rgb: "2E7D32" } }, // เขียว
    };

    const negativeStyle = {
      ...numberStyle,
      font: { color: { rgb: "D32F2F" } }, // แดง
    };

    const zeroStyle = {
      ...numberStyle,
      font: { color: { rgb: "757575" } }, // เทา
    };
    const BALANCE_COL_INDEX = 6;

    /* ===== APPLY STYLE ===== */
    const range = XLSX.utils.decode_range(ws["!ref"] as string);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        if (!cell) continue;

        // Header
        if (R === 0) {
          cell.s = headerStyle;
          continue;
        }

        // คอลัมน์คงเหลือ (ใส่สี)
        if (C === BALANCE_COL_INDEX && typeof cell.v === "number") {
          if (cell.v > 0) cell.s = positiveStyle;
          else if (cell.v < 0) cell.s = negativeStyle;
          else cell.s = zeroStyle;
          continue;
        }

        // ตัวเลขอื่น ๆ
        if (typeof cell.v === "number") {
          cell.s = numberStyle;
        } else {
          cell.s = textStyle;
        }
      }
    }

    ws["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");

    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `summary_only_${selectedMonth}_${selectedYear}.xlsx`
    );
  };

  const exportMonthlyExcel = () => {
    /* ================= DATA ================= */
    const data = [
      ...monthlyRows.map((r) => ({
        วันที่: r.date,
        รายการ: r.title,
        รับสด: r.incomeCash,
        รับโอน: r.incomeTransfer,
        จ่ายสด: r.expenseCash,
        จ่ายโอน: r.expenseTransfer,
        ยอดขาย: r.totalSales,
        คงเหลือ: r.profit - r.expenseCash,
      })),
      {
        วันที่: "",
        รายการ: "รวมทั้งเดือน",
        รับสด: monthlyTotal.incomeCash,
        รับโอน: monthlyTotal.incomeTransfer,
        จ่ายสด: monthlyTotal.expenseCash,
        จ่ายโอน: monthlyTotal.expenseTransfer,
        ยอดขาย: monthlyTotal.totalSales,
        คงเหลือ: monthlyTotal.profit - monthlyTotal.expenseCash,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);

    /* ================= STYLE ================= */
    const border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center" },
      border,
    };

    const textStyle = {
      alignment: { horizontal: "left" },
      border,
    };

    const numberStyle = {
      numFmt: "#,##0.00",
      alignment: { horizontal: "right" },
      border,
    };

    const profitPositiveStyle = {
      ...numberStyle,
      font: { color: { rgb: "008000" } }, // เขียว
    };

    const profitNegativeStyle = {
      ...numberStyle,
      font: { color: { rgb: "FF0000" } }, // แดง
    };

    /* ================= APPLY STYLE ================= */
    const range = XLSX.utils.decode_range(ws["!ref"] as string);
    const PROFIT_COL_INDEX = 7; // คอลัมน์ "คงเหลือ"

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        if (!cell) continue;

        // Header
        if (R === 0) {
          cell.s = headerStyle;
          continue;
        }

        // Profit color
        if (C === PROFIT_COL_INDEX && typeof cell.v === "number") {
          if (cell.v > 0) cell.s = profitPositiveStyle;
          else if (cell.v < 0) cell.s = profitNegativeStyle;
          else cell.s = numberStyle;
          continue;
        }

        // Other columns
        if (C >= 2) cell.s = numberStyle;
        else cell.s = textStyle;
      }
    }

    /* ================= AUTO COLUMN WIDTH ================= */
    ws["!cols"] = [
      { wch: 12 }, // วันที่
      { wch: 30 }, // รายการ
      { wch: 18 }, // รับสด
      { wch: 18 }, // รับโอน
      { wch: 18 }, // จ่ายสด
      { wch: 18 }, // จ่ายโอน
      { wch: 18 }, // ยอดขาย
      { wch: 18 }, // คงเหลือ
    ];

    /* ================= EXPORT ================= */
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `summary_${selectedMonth}_${selectedYear}.xlsx`
    );
  };

  const exportMonthlySummaryPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    doc.addFileToVFS("PromptRegular.ttf", PromptRegular);
    doc.addFont("PromptRegular.ttf", "PromptRegular", "normal");
    doc.setFont("PromptRegular");

    doc.setFontSize(14);
    doc.text(`สรุปรายเดือน (สรุปผล) ${selectedMonth}/${selectedYear}`, 14, 15);

    autoTable(doc, {
      startY: 25,
      styles: {
        font: "PromptRegular",
        fontSize: 10,
        halign: "right",
      },
      headStyles: {
        font: "PromptRegular",
        fontStyle: "normal",
        fontSize: 12,        // ⬅️ หัวตารางใหญ่กว่านิด
        fillColor: [63, 81, 181],
        textColor: 255,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center" },
      },
      head: [[
        "วันที่",
        "รับสด",
        "รับโอน",
        "จ่ายสด",
        "จ่ายโอน",
        "ยอดขาย",
        "คงเหลือ",
      ]],
      body: [
        ...monthlyDailyTotals.map((r) => [
          r.date,
          formatNumber(r.incomeCash),
          formatNumber(r.incomeTransfer),
          formatNumber(r.expenseCash),
          formatNumber(r.expenseTransfer),
          formatNumber(r.totalSales),
          formatNumber(r.profit - r.expenseCash),
        ]),
        [
          "รวมทั้งเดือน",
          formatNumber(monthlyTotal.incomeCash),
          formatNumber(monthlyTotal.incomeTransfer),
          formatNumber(monthlyTotal.expenseCash),
          formatNumber(monthlyTotal.expenseTransfer),
          formatNumber(monthlyTotal.totalSales),
          formatNumber(monthlyTotal.profit - monthlyTotal.expenseCash),
        ],
      ],
      didParseCell(data) {
        data.cell.styles.font = "PromptRegular";
        data.cell.styles.fontStyle = "normal";

        // 🟢⚪🔴 สีคงเหลือ
        if (data.section === "body" && data.column.index === 6) {
          const value = Number(
            String(data.cell.raw).replace(/,/g, "")
          );

          if (!isNaN(value)) {
            if (value < 0) {
              data.cell.styles.textColor = [211, 47, 47]; // แดง
            } else if (value > 0) {
              data.cell.styles.textColor = [46, 125, 50]; // เขียว
            } else {
              data.cell.styles.textColor = [0, 0, 0]; // เทา
            }
          }
        }
      }
    });

    doc.save(`summary_only_${selectedMonth}_${selectedYear}.pdf`);
  };

  const exportMonthlyPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    doc.addFileToVFS("PromptRegular.ttf", PromptRegular);
    doc.addFont("PromptRegular.ttf", "PromptRegular", "normal");
    doc.setFont("PromptRegular");

    // 🔹 หัวรายงาน
    doc.setFontSize(14); // ⬅️ ใหญ่ขึ้น
    doc.text(`สรุปรายเดือน ${selectedMonth}/${selectedYear}`, 14, 15);

    autoTable(doc, {
      startY: 25,

      // 🔹 ตัวอักษรทั้งตาราง
      styles: {
        font: "PromptRegular",
        fontSize: 10,        // ⬅️ ปรับตรงนี้ (เดิม 11–12)
        cellPadding: 4,
        halign: "right",
      },

      // 🔹 หัวตาราง
      headStyles: {
        font: "PromptRegular",
        fontStyle: "normal",
        fontSize: 12,        // ⬅️ หัวตารางใหญ่กว่านิด
        fillColor: [63, 81, 181],
        textColor: 255,
        halign: "center",
      },

      columnStyles: {
        0: { halign: "center" },
        1: { halign: "left" },
      },

      head: [[
        "วันที่",
        "รายการ",
        "รับสด",
        "รับโอน",
        "จ่ายสด",
        "จ่ายโอน",
        "ยอดขาย",
        "คงเหลือ",
      ]],

      body: [
        ...monthlyRows.map((r) => [
          r.date,
          r.title,
          formatNumber(r.incomeCash),
          formatNumber(r.incomeTransfer),
          formatNumber(r.expenseCash),
          formatNumber(r.expenseTransfer),
          formatNumber(r.totalSales),
          r.profit - r.expenseCash,
        ]),
        [
          "",
          "รวมทั้งเดือน",
          formatNumber(monthlyTotal.incomeCash),
          formatNumber(monthlyTotal.incomeTransfer),
          formatNumber(monthlyTotal.expenseCash),
          formatNumber(monthlyTotal.expenseTransfer),
          formatNumber(monthlyTotal.totalSales),
          monthlyTotal.profit - monthlyTotal.expenseCash,
        ],
      ],

      didParseCell(data) {
        data.cell.styles.font = "PromptRegular";
        data.cell.styles.fontStyle = "normal";

        // 🔴🟢 สีคงเหลือ / ขาดทุน
        if (data.section === "body" && data.column.index === 7) {
          const value = Number(data.cell.raw);
          data.cell.text = [formatNumber(value)];

          if (value < 0) {
            data.cell.styles.textColor = [211, 47, 47]; // แดง
          } else if (value > 0) {
            data.cell.styles.textColor = [46, 125, 50]; // เขียว
          } else {
            data.cell.styles.textColor = [0, 0, 0]; // เทา
          }
        }
      },
    });

    doc.save(`summary_${selectedMonth}_${selectedYear}.pdf`);
  };

  const dailyTotal = filteredRows.reduce(
    (a, r) => {
      a.incomeCash += r.incomeCash;
      a.incomeTransfer += r.incomeTransfer;
      a.expenseCash += r.expenseCash;
      a.expenseTransfer += r.expenseTransfer;
      a.totalSales += r.totalSales;
      a.profit += r.profit;
      return a;
    },
    {
      incomeCash: 0,
      incomeTransfer: 0,
      expenseCash: 0,
      expenseTransfer: 0,
      totalSales: 0,
      profit: 0,
    }
  );

  const coinTotal = monthlyRows
    .filter((r) => r.title === "เหรียญ")
    .reduce(
      (a, r) => {
        a.incomeCash += r.incomeCash;
        a.incomeTransfer += r.incomeTransfer;
        a.expenseCash += r.expenseCash;
        a.expenseTransfer += r.expenseTransfer;
        a.totalSales += r.totalSales;
        a.profit += r.profit;
        return a;
      },
      {
        incomeCash: 0,
        incomeTransfer: 0,
        expenseCash: 0,
        expenseTransfer: 0,
        totalSales: 0,
        profit: 0,
      }
    );
  const allDatesInMonth = Array.from(
    new Set(monthlyRows.map((r) => r.date))
  );
  const coinDates = new Set(
    monthlyRows
      .filter((r) => r.title === "เหรียญ")
      .map((r) => r.date)
  );
  const noCoinDates = allDatesInMonth
    .filter((d) => !coinDates.has(d))
    .map((d) => Number(d.split("-")[2]));
  const noteText =
    noCoinDates.length > 0
      ? `หมายเหตุ: วันที่ ${noCoinDates.join(",")} ไม่มีเหรียญ หรือ ใส่ชื่อผิด`
      : "";
  /* ================= UI ================= */
  return (
    <>
      {/* เพิ่มรายการ */}
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpenForm(true)}>
        เพิ่มรายรับรายจ่าย
      </Button>

      {/* ===== FILTER DATE ===== */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>ข้อมูลย้อนหลัง</Typography>
          <Grid container spacing={2} >
            <Grid item xs={6}>
              <TextField type="date" label="จากวันที่" fullWidth value={fromDate}
                onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField type="date" label="ถึงวันที่" fullWidth value={toDate}
                onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ===== DAILY TABLE ===== */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">วันที่</TableCell>
                  <TableCell>รายการ</TableCell>
                  <TableCell align="right">รับสด</TableCell>
                  <TableCell align="right">รับโอน</TableCell>
                  <TableCell align="right">จ่ายสด</TableCell>
                  <TableCell align="right">จ่ายโอน</TableCell>
                  <TableCell align="right">ยอดขาย</TableCell>
                  <TableCell align="right">คงเหลือ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>

                {filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell align="center">{r.date}</TableCell>
                    <TableCell>{r.title}</TableCell>

                    <TableCell align="right">
                      {formatNumber(r.incomeCash)}
                    </TableCell>

                    <TableCell align="right">
                      {formatNumber(r.incomeTransfer)}
                    </TableCell>

                    <TableCell align="right">
                      {formatNumber(r.expenseCash)}
                    </TableCell>

                    <TableCell align="right">
                      {formatNumber(r.expenseTransfer)}
                    </TableCell>

                    <TableCell align="right">
                      {formatNumber(r.totalSales)}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{ color: (r.profit - r.expenseCash) < 0 ? "red" : (r.profit - r.expenseCash) == 0 ? "gray" : "green" }}
                    >
                      {formatNumber(r.profit - r.expenseCash)}
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => confirmDelete(r.id)}
                      >
                        ลบ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredRows.length > 0 && (
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell align="center">
                      <b></b>
                    </TableCell>

                    <TableCell>
                      <b>รวมทั้งหมด</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(dailyTotal.incomeCash)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(dailyTotal.incomeTransfer)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(dailyTotal.expenseCash)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(dailyTotal.expenseTransfer)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(dailyTotal.totalSales)}</b>
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        color:
                          dailyTotal.profit -
                            dailyTotal.expenseCash <
                            0
                            ? "red"
                            : "green",
                      }}
                    >
                      <b>
                        {formatNumber(
                          dailyTotal.profit -
                          dailyTotal.expenseCash
                        )}
                      </b>
                    </TableCell>

                    <TableCell />
                  </TableRow>
                )}

                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      ไม่มีข้อมูลในช่วงวันที่ที่เลือก
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {/* ===== MONTHLY ===== */}
      {/* ===== MONTHLY SUMMARY TABLE ===== */}
      <Card sx={{ mb: 3, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ตารางสรุปรายเดือน
          </Typography>

          {/* ===== เลือกเดือน / ปี + Export ===== */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <TextField
                select
                label="เดือน"
                fullWidth
                SelectProps={{ native: true }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    เดือน {i + 1}
                  </option>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField
                label="ปี"
                type="number"
                fullWidth
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                useFlexGap
                flexWrap="wrap"
              >
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={exportMonthlyExcel}
                  sx={{
                    whiteSpace: "nowrap",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Export Excel (รายการทั้งหมด)
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={exportMonthlyPDF}
                  sx={{
                    whiteSpace: "nowrap",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Export PDF (รายการทั้งหมด)
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={exportMonthlySummaryExcel}
                  sx={{
                    whiteSpace: "nowrap",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Export Excel (สรุปผล)
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={exportMonthlySummaryPDF}
                  sx={{
                    whiteSpace: "nowrap",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Export PDF (สรุปผล)
                </Button>
              </Stack>
            </Grid>

          </Grid>

          {/* ===== TABLE ===== */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">วันที่</TableCell>
                  <TableCell align="right">รับสด</TableCell>
                  <TableCell align="right">รับโอน</TableCell>
                  <TableCell align="right">จ่ายสด</TableCell>
                  <TableCell align="right">จ่ายโอน</TableCell>
                  <TableCell align="right">ยอดขาย</TableCell>
                  <TableCell align="right">คงเหลือ</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {monthlyDailyTotals.map((r) => (
                  <TableRow key={r.date}>
                    <TableCell align="center">{r.date}</TableCell>

                    <TableCell align="right">{formatNumber(r.incomeCash)}</TableCell>
                    <TableCell align="right">{formatNumber(r.incomeTransfer)}</TableCell>
                    <TableCell align="right">{formatNumber(r.expenseCash)}</TableCell>
                    <TableCell align="right">{formatNumber(r.expenseTransfer)}</TableCell>
                    <TableCell align="right">{formatNumber(r.totalSales)}</TableCell>

                    <TableCell
                      align="right"
                      sx={{ color: (r.profit - r.expenseCash) < 0 ? "red" : "green" }}
                    >
                      {formatNumber(r.profit - r.expenseCash)}
                    </TableCell>
                  </TableRow>
                ))}
                {monthlyRows.some((r) => r.title === "เหรียญ") && (
                  <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                    <TableCell align="center">
                      <b>เหรียญ</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(coinTotal.incomeCash)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(coinTotal.incomeTransfer)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(coinTotal.expenseCash)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>{formatNumber(coinTotal.expenseTransfer)}</b>
                    </TableCell>

                    <TableCell align="right">
                      <b>0.00</b>
                    </TableCell>

                    <TableCell
                      align="right"

                    >
                      <b>0.00</b>
                    </TableCell>
                  </TableRow>
                )}
                {/* ===== แถวยอดรวมทั้งเดือน ===== */}
                {monthlyRows.length > 0 && (
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell colSpan={1} align="center">
                      <b>รวมทั้งเดือน</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{formatNumber(monthlyTotal.incomeCash)}</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{formatNumber(monthlyTotal.incomeTransfer)}</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{formatNumber(monthlyTotal.expenseCash)}</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{formatNumber(monthlyTotal.expenseTransfer)}</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{formatNumber(monthlyTotal.totalSales)}</b>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: monthlyTotal.profit < 0 ? "red" : "green",
                      }}
                    >
                      <b>{formatNumber(monthlyTotal.profit - monthlyTotal.expenseCash)}</b>
                    </TableCell>
                  </TableRow>
                )}

                {monthlyRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      ไม่มีข้อมูลในเดือนที่เลือก
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
        {noteText && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: "#d32f2f", ml: 2, mb: 2 }}
          >
            {noteText}
          </Typography>
        )}
      </Card>
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md" >
         <DialogTitle>บันทึกรายรับรายจ่าย</DialogTitle>
          <DialogContent dividers> <Grid container spacing={2} sx={{ mt: 1 }}> <Grid item xs={12} sm={6} md={4}> 
            <TextField label="วันที่" type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} /> 
              </Grid> <Grid item xs={12}> <TextField label="ชื่อรายการ" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} /> </Grid> <Grid item xs={12} sm={6} md={4}> <TextField label="รายรับเงินสด" fullWidth value={incomeCash} onChange={(e) => setIncomeCash(e.target.value)} /> </Grid> <Grid item xs={12} sm={6} md={4}> <TextField label="รายรับเงินโอน" fullWidth value={incomeTransfer} onChange={(e) => setIncomeTransfer(e.target.value)} /> </Grid> <Grid item xs={12} sm={6} md={4}> <TextField label="รายจ่ายเงินสด" fullWidth value={expenseCash} onChange={(e) => setExpenseCash(e.target.value)} /> </Grid> <Grid item xs={12} sm={6} md={4}> <TextField label="รายจ่ายเงินโอน" fullWidth value={expenseTransfer} onChange={(e) => setExpenseTransfer(e.target.value)} /> </Grid> <Grid item xs={12} sm={12} md={4}> <Typography sx={{ mt: 1 }}> <b>ยอดขายรวม:</b> {totalSales.toFixed(2)} บาท </Typography> <Typography sx={{ mb: 1 }} color={profit >= 0 ? "green" : "error"} > <b>คงเหลือ</b> {formatNumber(profit)} บาท </Typography> </Grid> </Grid> </DialogContent> <DialogActions> <Button onClick={() => setOpenForm(false)}>ยกเลิก</Button> <Button variant="contained" onClick={save}> บันทึก </Button> </DialogActions> </Dialog>
    </>
  );
}
