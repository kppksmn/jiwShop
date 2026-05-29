import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, CardContent, Grid, TextField, Button, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Box, Divider, Paper
} from "@mui/material";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { PromptRegular } from "../fonts/Prompt-Regular";

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

const loadQueue = useCallback(async () => {
  try {
 const startDate = `${filterMonth}-01`;
const endDate = `${filterMonth}-31`;

 const q = query(
  collection(db, "paymentQueue"),
  where("dueDate", ">=", startDate),
  where("dueDate", "<=", endDate),
  orderBy("dueDate", "asc"),
  orderBy("createdAt", "asc")
);

    const querySnapshot = await getDocs(q);
querySnapshot.docs.forEach(d => {
  console.log(d.data());
});
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
  } catch (error) {
    console.error(error);
  }
}, [filterMonth]);

useEffect(() => {
  loadQueue();
}, [loadQueue]);
const exportExcel = () => {
  /* ================= DATA ================= */

  const rows: any[][] = [
    [
      "ผู้รับเงิน",
      "จำนวนเงิน",
      "วันรับของ",
      "วันครบกำหนด",
      "สถานะ",
    ],

    ...queue.map((item) => [
      item.vendor,

      item.amount,

      item.receiveDate,

      item.dueDate,

      item.status,
    ]),

    [
      "รวมทั้งหมด",
      totalAmount,
      "",
      "",
      "",
    ],

    [],

    ["สรุปรวมรายเจ้า"],

    ["ชื่อผู้รับเงิน", "ยอดรวม"],

    ...summaryByVendor.map((item) => [
      item.name,
      item.total,
    ]),

    [
      "รวมทั้งหมด",
      totalAmount,
    ],
  ];

  const ws =
    XLSX.utils.aoa_to_sheet(rows);

  /* ================= STYLE ================= */

  const border = {
    top: { style: "thin" },

    bottom: { style: "thin" },

    left: { style: "thin" },

    right: { style: "thin" },
  };

  const headerStyle = {
    font: {
      bold: true,

      color: {
        rgb: "FFFFFF",
      },
    },

    fill: {
      fgColor: {
        rgb: "1976D2",
      },
    },

    alignment: {
      horizontal: "center",

      vertical: "center",
    },

    border,
  };


const summaryTitleStyle = {
  font: {
    bold: true,

    color: {
      rgb: "FFFFFF",
    },
  },

  fill: {
    fgColor: {
      rgb: "1976D2", // ม่วง
    },
  },

  alignment: {
    horizontal: "center",

    vertical: "center",
  },

  border,
};

const summaryTableHeaderStyle = {
  font: {
    bold: true,

    color: {
      rgb: "FFFFFF",
    },
  },

  fill: {
    fgColor: {
      rgb: "009688", // เขียวอมฟ้า
    },
  },

  alignment: {
    horizontal: "center",

    vertical: "center",
  },

  border,
};
  const numberStyle = {
    numFmt: "#,##0.00",

    alignment: {
      horizontal: "right",

      vertical: "center",
    },

    border,
  };

  const textStyle = {
    alignment: {
      horizontal: "center",

      vertical: "center",
    },

    border,
  };

  const leftTextStyle = {
    alignment: {
      horizontal: "left",

      vertical: "center",
    },

    border,
  };

  const paidStyle = {
    ...textStyle,

    font: {
      color: {
        rgb: "2E7D32",
      },

      bold: true,
    },
  };

  const pendingStyle = {
    ...textStyle,

    font: {
      color: {
        rgb: "ED6C02",
      },

      bold: true,
    },
  };

  const totalStyle = {
    ...numberStyle,

    font: {
      bold: true,

      color: {
        rgb: "1976D2",
      },
    },

    fill: {
      fgColor: {
        rgb: "E3F2FD",
      },
    },
  };

  /* ================= ROW INDEX ================= */

  const mainHeaderRow = 0;

  const firstTotalRow =
    queue.length + 1;

  const summaryTitleRow =
    queue.length + 3;

  const summaryHeaderRow =
    queue.length + 4;

  const summaryDataStartRow =
    queue.length + 5;

  const summaryTotalRow =
    queue.length +
    summaryByVendor.length +
    5;

  /* ================= APPLY STYLE ================= */

  const range = XLSX.utils.decode_range(
    ws["!ref"] as string
  );

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (
      let C = range.s.c;
      C <= range.e.c;
      ++C
    ) {
      const cellRef =
        XLSX.utils.encode_cell({
          r: R,
          c: C,
        });

      const cell = ws[cellRef];

      if (!cell) continue;

      /* ===== MAIN HEADER ===== */

      if (R === mainHeaderRow) {
        cell.s = headerStyle;

        continue;
      }

      /* ===== SUMMARY TITLE ===== */

     if (
  R === summaryTitleRow &&
  C <= 1
) {
  cell.s = summaryTitleStyle;

  continue;
}

if (
  R === summaryHeaderRow &&
  C <= 1
) {
  cell.s = summaryTableHeaderStyle;

  continue;
}

      /* ===== TOTAL ROW ===== */

      if (
        (R === firstTotalRow ||
          R === summaryTotalRow) &&
        C <= 1
      ) {
        if (C === 1) {
          cell.s = totalStyle;
        } else {
          cell.s = leftTextStyle;
        }

        continue;
      }

      /* ===== STATUS ===== */

      if (
        C === 4 &&
        R > 0 &&
        R < firstTotalRow
      ) {
        if (cell.v === "Paid") {
          cell.s = paidStyle;
        } else {
          cell.s = pendingStyle;
        }

        continue;
      }

      /* ===== SUMMARY SECTION ===== */

      if (
        R >= summaryDataStartRow &&
        C <= 1
      ) {
        if (typeof cell.v === "number") {
          cell.s = numberStyle;
        } else {
          cell.s = leftTextStyle;
        }

        continue;
      }

      /* ===== MAIN TABLE ===== */

      if (R <= firstTotalRow) {
        if (typeof cell.v === "number") {
          cell.s = numberStyle;
        } else if (C === 0) {
          cell.s = leftTextStyle;
        } else {
          cell.s = textStyle;
        }
      }
    }
  }

  /* ================= MERGE ================= */

  ws["!merges"] = [
    {
      s: {
        r: summaryTitleRow,
        c: 0,
      },

      e: {
        r: summaryTitleRow,
        c: 1,
      },
    },
  ];

  /* ================= COLUMN WIDTH ================= */

  ws["!cols"] = [
    { wch: 35 },

    { wch: 18 },

    { wch: 18 },

    { wch: 18 },

    { wch: 15 },
  ];

  /* ================= CREATE FILE ================= */

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "PaymentQueue"
  );

  const buffer = XLSX.write(wb, {
    bookType: "xlsx",

    type: "array",
  });

  saveAs(
    new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),

    `payment_queue_${filterMonth}.xlsx`
  );
};

const exportPDF = () => {
  const doc = new jsPDF("l", "mm", "a4");

  /* ================= FONT ================= */

  doc.addFileToVFS(
    "PromptRegular.ttf",
    PromptRegular
  );

  doc.addFont(
    "PromptRegular.ttf",
    "PromptRegular",
    "normal"
  );

  doc.setFont("PromptRegular");

  /* ================= TITLE ================= */

  doc.setFontSize(14);

  doc.text(
    `รายงานคิวจ่ายเงิน ${filterMonth}`,
    14,
    15
  );

  /* ================= MAIN TABLE ================= */

  autoTable(doc, {
    startY: 25,

    styles: {
      font: "PromptRegular",
      fontStyle: "normal",
      fontSize: 10,
      halign: "right",
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [180, 180, 180],
    },

    headStyles: {
      font: "PromptRegular",
      fontStyle: "normal",
      fontSize: 11,

      fillColor: [25, 118, 210],

      textColor: 255,

      halign: "center",
      valign: "middle",
    },

    bodyStyles: {
      font: "PromptRegular",
      fontStyle: "normal",
    },

    columnStyles: {
      0: {
        halign: "left",
        cellWidth: 65,
      },

      1: {
        halign: "right",
        cellWidth: 35,
      },

      2: {
        halign: "center",
        cellWidth: 35,
      },

      3: {
        halign: "center",
        cellWidth: 35,
      },

      4: {
        halign: "center",
        cellWidth: 30,
      },
    },

  

    body: [
      ...queue.map((item) => [
        item.vendor,

        item.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        }),

        item.receiveDate,

        item.dueDate,

        item.status,
      ]),

      [
        "รวมทั้งหมด",

        totalAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        }),

        "",
        "",
        "",
      ],
    ],

    didParseCell(data) {
      data.cell.styles.font = "PromptRegular";

      data.cell.styles.fontStyle = "normal";


      if (
        data.section === "body" &&
        data.column.index === 4
      ) {
        const value = String(data.cell.raw);

        if (value === "Paid") {
          data.cell.styles.textColor = [
            46,
            125,
            50,
          ];
        }

        if (value === "Pending") {
          data.cell.styles.textColor = [
            237,
            108,
            2,
          ];
        }
      }


      if (
        data.section === "body" &&
        data.row.index === queue.length
      ) {
  data.cell.styles.font = "PromptRegular";

  data.cell.styles.fontStyle = "normal";

        data.cell.styles.fillColor = [
          227,
          242,
          253,
        ];

        data.cell.styles.textColor = [
          25,
          118,
          210,
        ];
      }
    },
  });

const finalY =
  (doc as any).lastAutoTable.finalY + 15;

/* ================= TITLE ================= */

doc.setFont("PromptRegular");

doc.setFontSize(13);

doc.text(
  "สรุปรวมรายเจ้า",
  14,
  finalY
);

/* ================= SUMMARY TABLE ================= */

autoTable(doc, {
  startY: finalY + 5,

  styles: {
    font: "PromptRegular",
    fontStyle: "normal",
    fontSize: 10,
    valign: "middle",
    lineWidth: 0.1,
    lineColor: [180, 180, 180],
  },

  headStyles: {
    font: "PromptRegular",
    fontStyle: "normal",

    fillColor: [63, 81, 181],

    textColor: 255,

    halign: "center",
  },

  bodyStyles: {
    font: "PromptRegular",
    fontStyle: "normal",
  },

  columnStyles: {
    0: {
      halign: "left",
      cellWidth: 120,
    },

    1: {
      halign: "right",
      cellWidth: 50,
    },
  },

  head: [[
    "ชื่อผู้รับเงิน",
    "ยอดรวม",
  ]],

  body: [
    ...summaryByVendor.map((item) => [
      item.name,

      item.total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      }),
    ]),

    [
      "รวมทั้งหมด",

      totalAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      }),
    ],
  ],

  didParseCell(data) {
    data.cell.styles.font =
      "PromptRegular";

    data.cell.styles.fontStyle =
      "normal";

    /* ===== TOTAL ROW ===== */

    if (
      data.section === "body" &&
      data.row.index ===
        summaryByVendor.length
    ) {
      data.cell.styles.fillColor = [
        232,
        245,
        233,
      ];

      data.cell.styles.textColor = [
        46,
        125,
        50,
      ];
    }
  },
});
  doc.save(
    `payment_queue_${filterMonth}.pdf`
  );
};



  // 3. สรุปยอดรวมแยกตามชื่อ (Group by Vendor)
  const summaryByVendor = useMemo(() => {
    const summaryMap: { [key: string]: number } = {};
    queue.forEach(item => {
      const name = item.vendor.trim();
      summaryMap[name] = (summaryMap[name] || 0) + item.amount;
    });
    return Object.entries(summaryMap).map(([name, total]) => ({ name, total }));
  }, [queue]);

  const totalAmount = useMemo(() => {
    return queue.reduce((sum, item) => sum + item.amount, 0);
  }, [queue]);

  // Actions
  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await updateDoc(doc(db, "paymentQueue", id), { vendor: editValue });
    setQueue(prev => prev.map(item => item.id === id ? { ...item, vendor: editValue } : item));
    setEditingId(null);
  };

const addQueueItem = async () => {
  const numericAmount = Number(amount);

  if (!vendor || numericAmount <= 0 || !dueDate) {
    alert("กรอกข้อมูลไม่ครบ");
    return;
  }

  await addDoc(collection(db, "paymentQueue"), {
    vendor,
    amount: numericAmount,
    receiveDate,
    dueDate,
    status: "Pending",
    createdAt: serverTimestamp(),
  });

  await loadQueue();

  setVendor("");
  setAmount("0");
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
<Box sx={{ display: "flex", gap: 1 }}>
  <Button
    variant="contained"
    color="success"
    onClick={exportExcel}
  >
    Export Excel
  </Button>

  <Button
    variant="contained"
    color="error"
    onClick={exportPDF}
  >
    Export PDF
  </Button>
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
                {/* ใช้ queue แทน filteredQueue เพื่อให้ข้อมูลเรียงตามวันที่ */}
                {queue.map((item) => (
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