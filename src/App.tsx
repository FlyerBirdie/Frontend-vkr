import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ScheduleResultProvider } from "./context/ScheduleResultContext";
import AnalyticsPage from "./pages/AnalyticsPage";
import EquipmentPage from "./pages/EquipmentPage";
import LoginPage from "./pages/LoginPage";
import OrderEditPage from "./pages/OrderEditPage";
import OrdersPage from "./pages/OrdersPage";
import SchedulePage from "./pages/SchedulePage";
import TechProcessDetailPage from "./pages/TechProcessDetailPage";
import TechProcessesPage from "./pages/TechProcessesPage";
import WorkersPage from "./pages/WorkersPage";

export default function App() {
  return (
    <BrowserRouter>
      <ScheduleResultProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/schedule" replace />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id/edit" element={<OrderEditPage />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route path="tech-processes" element={<TechProcessesPage />} />
              <Route path="tech-processes/:id" element={<TechProcessDetailPage />} />
              <Route
                path="operations"
                element={<Navigate to="/schedule?view=operations" replace />}
              />
            </Route>
          </Route>
        </Routes>
      </ScheduleResultProvider>
    </BrowserRouter>
  );
}
