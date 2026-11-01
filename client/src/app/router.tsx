import TeamPage from "../pages/admin/Team";
import DriverDashboard from "../pages/driver/DriverDashboard";
import WebsiteContent from "../pages/admin/WebsiteContent";
import FulfillmentSettingsPage from "../pages/admin/FulfillmentSettings";
import CashierDashboard, { CashierOrderDetail } from "../pages/staff/CashierDashboard";
import KitchenDashboard from "../pages/staff/KitchenDashboard";
import OperationsSettingsPage from "../pages/admin/OperationsSettings";
import RequireAuth from "../components/auth/RequireAuth";
import Login from "../pages/Login";
import Reservations from "../pages/Reservations";
import CustomerDashboard, { CustomerOrderDetail } from "../pages/CustomerDashboard";
import AdminDashboard, { AdminOrders, AdminOrderDetail, AdminReservations } from "../pages/admin/AdminDashboard";
import AdminMenu from "../pages/admin/AdminMenu";
import Checkout from "../pages/Checkout";
import Cart from "../pages/Cart";
import type { RouteObject } from "react-router-dom";
import App from "./App";
import Home from "../pages/Home";
import About from "../pages/About";
import Menu from "../pages/Menu";
import Locations from "../pages/Locations";
import NotFound from "../pages/NotFound";
import { StarterPage } from "../pages/RoutePage";

export const routes: RouteObject[] = [{
  element: <App />,
  children: [
    { index: true, element: <Home /> },
    { path: "about", element: <About /> },
    { path: "menu", element: <Menu /> },
    { path: "locations", element: <Locations /> },
    { path: "reservations", element: <RequireAuth><Reservations /></RequireAuth> },
    { path: "contact", element: <StarterPage title="Let's talk." description="Questions, gatherings, and your next visit to The Table." /> },
    { path: "login/*", element: <Login /> },
    { path: "signup/*", element: <Login signup /> },
    { path: "account", element: <RequireAuth><CustomerDashboard /></RequireAuth> },
    { path: "account/orders/:id", element: <RequireAuth><CustomerOrderDetail /></RequireAuth> },
    { path: "admin", element: <RequireAuth admin><AdminDashboard /></RequireAuth> },
    { path: "admin/orders", element: <RequireAuth admin><AdminOrders /></RequireAuth> },
    { path: "admin/orders/:id", element: <RequireAuth admin><AdminOrderDetail /></RequireAuth> },
    { path: "admin/reservations", element: <RequireAuth admin><AdminReservations /></RequireAuth> },
    { path: "admin/team", element: <RequireAuth admin><TeamPage /></RequireAuth> },
    { path: "driver", element: <RequireAuth roles={["driver"]}><DriverDashboard /></RequireAuth> },
    { path: "cashier", element: <RequireAuth roles={["admin", "cashier"]}><CashierDashboard /></RequireAuth> },
    { path: "cashier/orders/:id", element: <RequireAuth roles={["admin", "cashier"]}><CashierOrderDetail /></RequireAuth> },
    { path: "kitchen", element: <RequireAuth roles={["admin", "kitchen"]}><KitchenDashboard /></RequireAuth> },
    { path: "admin/fulfillment", element: <RequireAuth admin><FulfillmentSettingsPage /></RequireAuth> },
    { path: "admin/operations", element: <RequireAuth admin><OperationsSettingsPage /></RequireAuth> },
    { path: "admin/content", element: <RequireAuth admin><WebsiteContent /></RequireAuth> },
    { path: "admin/menu", element: <RequireAuth admin><AdminMenu /></RequireAuth> },
    { path: "cart", element: <Cart /> },
    { path: "checkout", element: <Checkout /> },
    { path: "privacy", element: <StarterPage title="Your privacy." description="Our privacy information will be published here." /> },
    { path: "*", element: <NotFound /> },
  ],
}];
