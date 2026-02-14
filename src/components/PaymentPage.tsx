import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TableContainer,
} from "@mui/material";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { PromptRegular } from "../fonts/Prompt-Regular";

/* ---------- helpers ---------- */
const today = () => new Date().toISOString().slice(0, 10);

// Helper สำหรับจัดการทศนิยม 2 ตำแหน่ง พร้อมคอมม่า
const formatMoney = (value: number | string | "") => {
  const num = value === "" ? 0 : Number(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* ---------- types ---------- */
type PaymentItem = {
  id: string;
  date: string;
  name?: string;
  amount: number;
  status: "new" | "paid";
};

function PaymentPage() {
  /* ---------- state ---------- */
  const [openNew, setOpenNew] = useState(false);
  const [openPaid, setOpenPaid] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openCarry, setOpenCarry] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );

  const [newItems, setNewItems] = useState<PaymentItem[]>([]);
  const [paidItems, setPaidItems] = useState<PaymentItem[]>([]);
  const [carryForward, setCarryForward] = useState<number | "">(0);
  const [carryDocId, setCarryDocId] = useState<string | null>(null);

  const resetForm = () => {
    setDate(today());
    setName("");
    setAmount("");
  };

  /* ---------- load data ---------- */
  const loadPayments = async () => {
    const snap = await getDocs(collection(db, "payments"));
    const all = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<PaymentItem, "id">),
    }));

    const key = `${year}-${month}`;
    const current = all
      .filter(i => i.date.startsWith(key))
      .sort((a, b) => a.date.localeCompare(b.date));

    setNewItems(current.filter(i => i.status === "new"));
    setPaidItems(current.filter(i => i.status === "paid"));
  };

  const loadCarryForward = async () => {
    const q = query(
      collection(db, "carryForwards"),
      where("year", "==", Number(year)),
      where("month", "==", month)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      setCarryForward(snap.docs[0].data().amount);
      setCarryDocId(snap.docs[0].id);
    } else {
      setCarryForward(0);
      setCarryDocId(null);
    }
  };

  useEffect(() => {
    loadPayments();
    loadCarryForward();
  }, [year, month]);

  const saveNewItem = async () => {
    if (amount === "" || amount < 0) return alert("กรุณาระบุจำนวนเงิน");
    await addDoc(collection(db, "payments"), {
      date,
      amount: Number(amount),
      status: "new",
      createdAt: serverTimestamp(),
    });
    setOpenNew(false);
    resetForm();
    loadPayments();
  };

  const savePaidItem = async () => {
    if (amount === "" || amount < 0) return alert("กรุณาระบุจำนวนเงิน");
    await addDoc(collection(db, "payments"), {
      date,
      name,
      amount: Number(amount),
      status: "paid",
      paidAt: serverTimestamp(),
    });
    setOpenPaid(false);
    resetForm();
    loadPayments();
  };

  const saveCarryForward = async () => {
    const finalCarry = carryForward === "" ? 0 : Number(carryForward);
    if (carryDocId) await deleteDoc(doc(db, "carryForwards", carryDocId));
    await addDoc(collection(db, "carryForwards"), {
      year: Number(year),
      month,
      amount: finalCarry,
      createdAt: serverTimestamp(),
    });
    setOpenCarry(false);
    loadCarryForward();
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDoc(doc(db, "payments", deleteId));
    setOpenDelete(false);
    setDeleteId(null);
    loadPayments();
  };

  const currentCarry = typeof carryForward === "number" ? carryForward : 0;
  const totalNewAmount = newItems.reduce((s, i) => s + i.amount, 0);
  const totalPaidAmount = paidItems.reduce((s, i) => s + i.amount, 0);
  const netOutstanding = currentCarry + totalNewAmount - totalPaidAmount;

  /* ---------- EXPORTS ---------- */
  const exportExcel = () => {
    const rows: any[][] = [];
    rows.push([`รายงานการชำระเงิน ${year}-${month}`]);
    rows.push([]);
    rows.push(["ยอดยกมา", formatMoney(currentCarry)]);
    rows.push(["ยอดรายการใหม่", formatMoney(totalNewAmount)]);
    rows.push(["ยอดชำระแล้ว", formatMoney(totalPaidAmount)]);
    rows.push(["ยอดคงค้างสุทธิ", formatMoney(netOutstanding)]);
    rows.push([]);
    rows.push(["รายการใหม่", "", "", "รายการที่ชำระแล้ว"]);
    rows.push(["วันที่", "จำนวนเงิน", "", "วันที่", "ชื่อรายการ", "จำนวนเงิน"]);

    const max = Math.max(newItems.length, paidItems.length);
    for (let i = 0; i < max; i++) {
      rows.push([
        newItems[i]?.date || "",
        newItems[i] ? formatMoney(newItems[i].amount) : "",
        "",
        paidItems[i]?.date || "",
        paidItems[i]?.name || "",
        paidItems[i] ? formatMoney(paidItems[i].amount) : "",
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `payment_${year}_${month}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.addFileToVFS("PromptRegular.ttf", PromptRegular);
    doc.addFont("PromptRegular.ttf", "PromptRegular", "normal");
    doc.setFont("PromptRegular");
    doc.setFontSize(10);
  
    let y = 12;
    doc.setFontSize(14);
    doc.text(`รายงานการชำระเงิน ${year}-${month}`, 105, y, { align: "center" });
    y += 8;
  
    doc.setFontSize(10);
    const summary = [
      ["ยอดยกมา", formatMoney(currentCarry)],
      ["ยอดรายการใหม่", formatMoney(totalNewAmount)],
      ["ยอดชำระแล้ว", formatMoney(totalPaidAmount)],
      ["ยอดคงค้างสุทธิ", formatMoney(netOutstanding)],
    ];
  
    summary.forEach(row => {
      doc.text(`${row[0]} : ${row[1]}`, 10, y);
      y += 6;
    });
  
    y += 4;
    const startXLeft = 10;
    const startXRight = 110;
    const colW = [30, 30];
    const colWRight = [25, 35, 30];
    const rowH = 7;
  
    const drawCell = (x: number, y: number, w: number, h: number, text = "", align: "left" | "right" | "center" = "left") => {
      doc.rect(x, y, w, h);
      if (text) {
        doc.text(text, x + (align === "right" ? w - 2 : align === "center" ? w / 2 : 2), y + 5, { align });
      }
    };
  
    drawCell(startXLeft, y, colW[0] + colW[1], rowH, "รายการใหม่", "center");
    drawCell(startXRight, y, colWRight[0] + colWRight[1] + colWRight[2], rowH, "รายการที่ชำระแล้ว", "center");
    y += rowH;
  
    drawCell(startXLeft, y, colW[0], rowH, "วันที่", "center");
    drawCell(startXLeft + colW[0], y, colW[1], rowH, "จำนวนเงิน", "center");
    drawCell(startXRight, y, colWRight[0], rowH, "วันที่", "center");
    drawCell(startXRight + colWRight[0], y, colWRight[1], rowH, "ชื่อรายการ", "center");
    drawCell(startXRight + colWRight[0] + colWRight[1], y, colWRight[2], rowH, "จำนวนเงิน", "center");
    y += rowH;
  
    const max = Math.max(newItems.length, paidItems.length);
    for (let i = 0; i < max; i++) {
      const n = newItems[i];
      const p = paidItems[i];
      drawCell(startXLeft, y, colW[0], rowH, n?.date || "");
      drawCell(startXLeft + colW[0], y, colW[1], rowH, n ? formatMoney(n.amount) : "", "right");
      drawCell(startXRight, y, colWRight[0], rowH, p?.date || "");
      drawCell(startXRight + colWRight[0], y, colWRight[1], rowH, p?.name || "");
      drawCell(startXRight + colWRight[0] + colWRight[1], y, colWRight[2], rowH, p ? formatMoney(p.amount) : "", "right");
      y += rowH;
      if (y > 270) { doc.addPage(); y = 20; }
    }
    doc.save(`payment_${year}_${month}.pdf`);
  };
  

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: "1200px", margin: "auto" }}>
      
      {/* 1. Summary Cards */}
      <Grid container spacing={1.5} mb={3}>
        {[
          { label: "ยอดยกมา", value: currentCarry, color: "textSecondary", edit: true },
          { label: "รายการใหม่", value: totalNewAmount, color: "textSecondary" },
          { label: "ชำระแล้ว", value: totalPaidAmount, color: "textSecondary" },
          { 
            label: "คงค้างสุทธิ", 
            value: netOutstanding, 
            color: netOutstanding > 0 ? "error.main" : "success.main",
            bg: netOutstanding > 0 ? "#fff5f5" : "#f5fff5" 
          },
        ].map((item, idx) => (
          <Grid item xs={6} md={3} key={idx}>
            <Paper sx={{ 
              p: 2, textAlign: "center", height: "100%", bgcolor: item.bg || "background.paper",
              display: "flex", flexDirection: "column", justifyContent: "center"
            }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>{item.label}</Typography>
              <Typography variant="h6" sx={{ color: item.color, fontSize: { xs: '1.0rem', md: '1.25rem' } }}>
                {formatMoney(item.value)}
              </Typography>
              {item.edit && (
                <Button size="small" onClick={() => setOpenCarry(true)} sx={{ mt: 0.5 }}>แก้ไข</Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 2. Controls */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "center", alignItems: "center", gap: 2, mb: 3 }}>
        <Box display="flex" gap={1}>
          <TextField select label="ปี" value={year} onChange={e => setYear(e.target.value)} SelectProps={{ native: true }} size="small">
            {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
          </TextField>
          <TextField select label="เดือน" value={month} onChange={e => setMonth(e.target.value)} SelectProps={{ native: true }} size="small">
            {Array.from({ length: 12 }).map((_, i) => {
              const m = String(i + 1).padStart(2, "0");
              return <option key={m} value={m}>{m}</option>;
            })}
          </TextField>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" color="success" onClick={exportExcel} size="small">Excel</Button>
          <Button variant="outlined" color="error" onClick={exportPDF} size="small">PDF</Button>
        </Box>
      </Box>

      {/* 3. Tables */}
      <Grid container spacing={2}>
        {[
          { title: "รายการใหม่", items: newItems, onAdd: () => { resetForm(); setOpenNew(true); }, isPaid: false },
          { title: "รายการที่ชำระแล้ว", items: paidItems, onAdd: () => { resetForm(); setOpenPaid(true); }, isPaid: true }
        ].map((table, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <Paper sx={{ p: { xs: 1, md: 2 }, height: "100%" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">{table.title}</Typography>
                <Button onClick={table.onAdd} variant="contained" size="small">+ เพิ่ม</Button>
              </Box>
              
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader sx={{ tableLayout: "fixed" }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: "25%", px: 1 }}>วันที่</TableCell>
                      {table.isPaid && <TableCell sx={{ width: "35%", px: 1 }}>รายการ</TableCell>}
                      <TableCell align="right" sx={{ width: table.isPaid ? "30%" : "65%", px: 1 }}>จำนวนเงิน</TableCell>
                      <TableCell sx={{ width: "10%", px: 1 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {table.items.map(i => (
                      <TableRow key={i.id} hover>
                        <TableCell sx={{ px: 1, fontSize: "0.85rem" }}>{i.date.slice(5)}</TableCell>
                        {table.isPaid && (
                          <TableCell sx={{ px: 1, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i.name}
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ px: 1, fontSize: "0.85rem" }}>
                          {formatMoney(i.amount)}
                        </TableCell>
                        <TableCell align="center" sx={{ px: 0 }}>
                          <Button color="error" sx={{ minWidth: 35 }} onClick={() => confirmDelete(i.id)}>ลบ</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* --- Dialogs --- */}
      <Dialog open={openCarry} onClose={() => setOpenCarry(false)} fullWidth maxWidth="xs">
        <DialogTitle>ตั้งค่ายอดยกมา</DialogTitle>
        <DialogContent>
          <TextField autoFocus type="number" fullWidth margin="dense" label="ยอดยกมา" value={carryForward} onChange={e => setCarryForward(e.target.value === "" ? "" : Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCarry(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveCarryForward}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openNew} onClose={() => setOpenNew(false)} fullWidth maxWidth="xs">
        <DialogTitle>เพิ่มรายการใหม่</DialogTitle>
        <DialogContent>
          <TextField type="date" fullWidth margin="dense" value={date} onChange={e => setDate(e.target.value)} />
          <TextField type="number" fullWidth margin="dense" label="จำนวนเงิน" value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveNewItem} disabled={amount === ""}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPaid} onClose={() => setOpenPaid(false)} fullWidth maxWidth="xs">
        <DialogTitle>เพิ่มรายการที่ชำระแล้ว</DialogTitle>
        <DialogContent>
          <TextField type="date" fullWidth margin="dense" value={date} onChange={e => setDate(e.target.value)} />
          <TextField fullWidth margin="dense" label="ชื่อรายการ" value={name} onChange={e => setName(e.target.value)} />
          <TextField type="number" fullWidth margin="dense" label="จำนวนเงิน" value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaid(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={savePaidItem} disabled={amount === ""}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>ยืนยันการลบรายการนี้?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PaymentPage;