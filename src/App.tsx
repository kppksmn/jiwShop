import { useState } from "react";
import "./App.css";

import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
} from "@mui/material";

import PaymentQueueTab from "./components/Queq";
import DailySummaryTab from "./components/DailySummaryTab";
import PaymentPage from "./components/PaymentPage";
import ImportData from "./components/ImportData";

function App() {
  const [tabIndex, setTabIndex] = useState(0); // 0 = สรุปรายรับรายจ่าย, 1 = รันคิวจ่าย

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom align="center">
        📊 สรุปผลประกอบการ
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, newValue) => setTabIndex(newValue)}
        >
          <Tab label="สรุปรายรับรายจ่าย" />
          <Tab label="รันคิวจ่าย" />
          <Tab label="บิลร้านพี่สาว" />
          {/* <Tab label="ImportData" /> */}
        </Tabs>
      </Box>

      {tabIndex === 0 && <DailySummaryTab />}
      {tabIndex === 1 && <PaymentQueueTab />}
      {tabIndex === 2 && <PaymentPage />}
      {tabIndex === 3 && <ImportData/>}
    </Container>
  );
}

export default App;
