import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "../styles/RoutePage.css";

type RoutePageProps = { title: string; description: string; children?: ReactNode };
export default function RoutePage({ title, description, children }: RoutePageProps) {
  return <main className="route-page"><header className="route-page__header"><p>THE TABLE / JEDDAH</p><h1 tabIndex={-1}>{title}</h1><div className="route-page__description">{description}</div></header>{children}</main>;
}

export function StarterPage({ title, description }: Omit<RoutePageProps, "children">) {
  return <RoutePage title={title} description={description}><div className="route-page__notice"><p>This page is being prepared.</p><p>Online services for this section are not connected yet.</p><Link to="/">Back to home</Link><Link to="/menu">Explore our dishes</Link></div></RoutePage>;
}
