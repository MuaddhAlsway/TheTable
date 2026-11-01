import EmailSettings from '../pages/admin/EmailSettings';
import SmsSettings from '../pages/admin/SmsSettings';
import ReservationDesk from '../pages/staff/ReservationDesk';
import CustomerReservation from '../pages/CustomerReservation';
import Tables from '../pages/admin/Tables';
import TableLanding from '../pages/TableLanding';
import CheckoutEntry from '../pages/CheckoutEntry';
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
import AdminDashboard, { AdminOrders, AdminOrderDetail } from "../pages/admin/AdminDashboard";
import AdminMenu from "../pages/admin/AdminMenu";
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
    { path: "admin/reservations", element: <RequireAuth admin><ReservationDesk /></RequireAuth> },
    { path: "cashier/reservations", element: <RequireAuth roles={["admin", "cashier"]}><ReservationDesk /></RequireAuth> },
    { path: "account/reservations/:id", element: <RequireAuth><CustomerReservation /></RequireAuth> },
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
    { path: "table/:token", element: <TableLanding /> },
    { path: "admin/email", element: <RequireAuth admin><EmailSettings /></RequireAuth> },
    { path: "admin/sms", element: <RequireAuth admin><SmsSettings /></RequireAuth> },
    { path: "admin/tables", element: <RequireAuth admin><Tables /></RequireAuth> },
    { path: "checkout", element: <CheckoutEntry /> },
    { path: "privacy", element: <StarterPage title="Your privacy." description="Our privacy information will be published here." /> },
    { path: "*", element: <NotFound /> },
  ],
}];
