import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// Views
import Header from "./Views/Header";
import Landing from "./Views/Landing";
import Login from "./Views/Login";
import SignUp from "./Views/SignUp";
import Packages from "./Views/Packages";
import Leaderboard from "./Views/Leaderboard";
import Dashboard from "./Views/Dashboard";
import AdminDashboard from "./Views/AdminDashboard";
import MiniCtfPlayer from "./Views/MiniCtfPlayer";

// Styles
import "./Styles/main.scss";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <Switch>
            <Route exact path="/" component={Landing} />
            <Route exact path="/challenges" component={Packages} />
            <Route exact path="/packages" component={Packages} />
            <Route exact path="/packages/:id" component={Packages} />
            <Route exact path="/mini-ctf/:id" component={MiniCtfPlayer} />
            <Route exact path="/leaderboard" component={Leaderboard} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={SignUp} />
            
            <ProtectedRoute exact path="/dashboard" component={Dashboard} />
            <ProtectedRoute exact path="/admin" adminOnly={true} component={AdminDashboard} />

            {/* Fallback route */}
            <Route render={(props) => <Landing {...props} />} />
          </Switch>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
