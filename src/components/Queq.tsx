import { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, Grid, TextField, Button, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Box, Divider, Paper
} from "@mui/material";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

interface PaymentQueueItem {
  id: string;
  vendor: string;
  amount: number;
  receiveDate: string;
  dueDate: string;
  status: "Pending" | "Paid";
}

export default function PaymentQueueTab() {
  const [queue, setQueue] = useState<PaymentQueueItem[]>([]);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadQueue = async () => {
    const querySnapshot = await getDocs(collection(db, "paymentQueue"));
    const data: PaymentQueueItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      data.push({
        id: docSnap.id,
        vendor: d.vendor,
        amount: d.amount,
        receiveDate: d.receiveDate || "-",
        dueDate: d.dueDate,
        status: d.status,
      });
    });
    setQueue(data);
  };

  useEffect(() => { loadQueue(); }, []);

  // 1. กรองข้อมูลตามเดือน
  const filteredQueue = useMemo(() => {
    return queue.filter(item => item.dueDate.startsWith(filterMonth));
  }, [queue, filterMonth]);

  // 2. เรียงลำดับตามวันที่ (วันครบกำหนด) จากน้อยไปมาก
  const sortedQueue = useMemo(() => {
    return [...filteredQueue].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [filteredQueue]);

  // 3. สรุปยอดรวมแยกตามชื่อ (Group by Vendor)
  const summaryByVendor = useMemo(() => {
    const summaryMap: { [key: string]: number } = {};
    filteredQueue.forEach(item => {
      const name = item.vendor.trim();
      summaryMap[name] = (summaryMap[name] || 0) + item.amount;
    });
    return Object.entries(summaryMap).map(([name, total]) => ({ name, total }));
  }, [filteredQueue]);

  const totalAmount = useMemo(() => {
    return filteredQueue.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredQueue]);

  // Actions
  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await updateDoc(doc(db, "paymentQueue", id), { vendor: editValue });
    setQueue(prev => prev.map(item => item.id === id ? { ...item, vendor: editValue } : item));
    setEditingId(null);
  };

  const addQueueItem = async () => {
    const numericAmount = Number(amount);
    if (!vendor || numericAmount <= 0 || !dueDate) { alert("กรอกข้อมูลไม่ครบ"); return; }
    const docRef = await addDoc(collection(db, "paymentQueue"), { vendor, amount: numericAmount, receiveDate, dueDate, status: "Pending" });
    setQueue(prev => [...prev, { id: docRef.id, vendor, amount: numericAmount, receiveDate, dueDate, status: "Pending" }]);
    setVendor(""); setAmount("0");
  };

  const deleteItem = async (id: string) => {
    if (window.confirm("ต้องการลบรายการนี้หรือไม่?")) {
      await deleteDoc(doc(db, "paymentQueue", id));
      setQueue(prev => prev.filter(item => item.id !== id));
    }
  };

  const payItem = async (id: string) => {
    await updateDoc(doc(db, "paymentQueue", id), { status: "Paid" });
    loadQueue();
  };

  const cancelPay = async (id: string) => {
    await updateDoc(doc(db, "paymentQueue", id), { status: "Pending" });
    loadQueue();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>1. รายการจ่ายเงิน (เรียงตามวันครบกำหนด)</Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={3}><TextField label="ผู้รับเงิน" fullWidth value={vendor} onChange={(e) => setVendor(e.target.value)} size="small" /></Grid>
            <Grid item xs={12} sm={2}><TextField label="จำนวนเงิน" type="number" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} size="small" /></Grid>
            <Grid item xs={12} sm={3}><TextField label="วันรับของ" type="date" fullWidth value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" /></Grid>
            <Grid item xs={12} sm={3}><TextField label="วันครบกำหนด" type="date" fullWidth value={dueDate} onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" /></Grid>
            <Grid item xs={12} sm={1}><Button variant="contained" fullWidth sx={{ height: '40px' }} onClick={addQueueItem}>เพิ่ม</Button></Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Box
  sx={{
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: { xs: 'flex-start', sm: 'space-between' },
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: 2,
    mb: 2,
    p: 2,
    bgcolor: '#f8f9fa',
    borderRadius: 1,
  }}
>
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      width: { xs: '100%', sm: 'auto' },
    }}
  >
    <Typography
      variant="subtitle1"
      sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
    >
      ประจำเดือน:
    </Typography>

    <TextField
      type="month"
      value={filterMonth}
      onChange={(e) => setFilterMonth(e.target.value)}
      size="small"
      sx={{
        bgcolor: 'white',
        width: { xs: '100%', sm: 'auto' },
      }}
    />
  </Box>

  <Typography
    variant="h6"
    color="primary"
    sx={{
      fontWeight: 'bold',
      width: { xs: '100%', sm: 'auto' },
      textAlign: { xs: 'left', sm: 'right' },
    }}
  >
    รวมทั้งเดือน: {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
  </Typography>
</Box>


          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ "& th": { backgroundColor: "#fafafa", fontWeight: 'bold' } }}>
                  <TableCell>ผู้รับเงิน</TableCell>
                  <TableCell align="right">จำนวนเงิน</TableCell>
                  <TableCell align="center">วันรับของ</TableCell>
                  <TableCell align="center">วันครบกำหนด</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* ใช้ sortedQueue แทน filteredQueue เพื่อให้ข้อมูลเรียงตามวันที่ */}
                {sortedQueue.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      {editingId === item.id ? 
                        <TextField size="small" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus fullWidth /> : 
                        item.vendor
                      }
                    </TableCell>
                    <TableCell align="right">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell align="center">{item.receiveDate}</TableCell>
                    <TableCell align="center">{item.dueDate}</TableCell>
                    <TableCell align="center" sx={{ color: item.status === "Paid" ? "green" : "orange", fontWeight: 'bold' }}>{item.status}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                        {editingId === item.id ? (
                          <>
                            <Button size="small" variant="contained" onClick={() => handleSaveEdit(item.id)}>Save</Button>
                            <Button size="small" variant="outlined" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="small" variant="text" onClick={() => { setEditingId(item.id); setEditValue(item.vendor); }}>Edit</Button>
                            <Button size="small" variant="contained" color={item.status === "Pending" ? "success" : "warning"} onClick={() => item.status === "Pending" ? payItem(item.id) : cancelPay(item.id)}>
                              {item.status === "Pending" ? "จ่าย" : "ยกเลิก"}
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => deleteItem(item.id)}>ลบ</Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

    {/* --- 2. ตารางสรุปยอดรวมรายเจ้า --- */}
    <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            2. สรุปยอดรวมรายเจ้า (ประจำเดือน {filterMonth})
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ "& th": { backgroundColor: "#fafafa", fontWeight: 'bold' } }}>
                  <TableCell align="center" sx={{ width: '80px' }}>ลำดับ</TableCell>
                  <TableCell align="left">ชื่อผู้รับเงิน</TableCell>
                  <TableCell align="right">ยอดรวมทั้งหมด</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryByVendor.length > 0 ? summaryByVendor.map((row, index) => (
                  <TableRow 
                    key={row.name} 
                    hover 
                    sx={{ backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9" }}
                  >
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell align="left">{row.name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                      ไม่มีข้อมูลสรุปสำหรับเดือนนี้
                    </TableCell>
                  </TableRow>
                )}
                {/* แถวรวมสุทธิท้ายตาราง */}
                {summaryByVendor.length > 0 && (
                  <TableRow sx={{ bgcolor: '#eeeeee' }}>
                    <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                      รวมสุทธิประจำเดือน
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}