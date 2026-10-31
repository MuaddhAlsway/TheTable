import SiteContentProvider from "./context/SiteContentProvider";
import { AuthProvider } from "./context/AuthProvider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./app/router";
import "./index.css";
import "./styles/responsive.css";

const router = createBrowserRouter(routes);
createRoot(document.getElementById("root")!).render(<StrictMode><AuthProvider><SiteContentProvider><RouterProvider router={router} /></SiteContentProvider></AuthProvider></StrictMode>);
