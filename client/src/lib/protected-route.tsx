import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import React from "react";

type ComponentType = React.ComponentType<any>;

// Loading component to reuse across route components
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary-color" />
  </div>
);

// Basic protected route - requires authentication but no specific role
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (loading) {
          return <LoadingComponent />;
        }

        if (!isAuthenticated) {
          return <Redirect to="/login" />;
        }

        // Redirect admin users to admin dashboard
        if (user?.role === 'admin') {
          return <Redirect to="/admin" />;
        }

        // Redirect rider users to rider dashboard
        if (user?.role === 'rider') {
          return <Redirect to="/rider" />;
        }

        return <Component />;
      }}
    </Route>
  );
}

// Admin-only route - requires 'admin' role
export function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (loading) {
          return <LoadingComponent />;
        }

        if (!isAuthenticated) {
          return <Redirect to="/login" />;
        }

        if (user?.role !== 'admin') {
          // Redirect non-admin users to appropriate pages
          if (user?.role === 'rider') {
            return <Redirect to="/rider" />;
          }
          return <Redirect to="/home" />;
        }

        return <Component />;
      }}
    </Route>
  );
}

// Rider-only route - requires 'rider' role
export function RiderRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (loading) {
          return <LoadingComponent />;
        }

        if (!isAuthenticated) {
          return <Redirect to="/login" />;
        }

        if (user?.role !== 'rider') {
          // Redirect non-rider users to appropriate pages
          if (user?.role === 'admin') {
            return <Redirect to="/admin" />;
          }
          return <Redirect to="/home" />;
        }

        return <Component />;
      }}
    </Route>
  );
}

// Use this for routes that should redirect to role-appropriate page if user is logged in
export function PublicOnlyRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (loading) {
          return <LoadingComponent />;
        }

        if (isAuthenticated) {
          // Redirect to appropriate page based on user role
          if (user?.role === 'admin') {
            return <Redirect to="/admin" />;
          } else if (user?.role === 'rider') {
            return <Redirect to="/rider" />;
          } else {
            return <Redirect to="/home" />;
          }
        }

        return <Component />;
      }}
    </Route>
  );
}