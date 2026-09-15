import React from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ component: Component, adminOnly = false, ...rest }) => {
  const { user, loading, isAdmin } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) {
          return (
            <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
              Authenticating operative session...
            </div>
          );
        }

        if (!user) {
          return (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: props.location }
              }}
            />
          );
        }

        if (adminOnly && !isAdmin) {
          return <Redirect to="/dashboard" />;
        }

        return <Component {...rest} {...props} />;
      }}
    />
  );
};

export default ProtectedRoute;
