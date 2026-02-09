import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  return <div>Hello "/_dashboard/"! {user?.user?.name}</div>;
}
