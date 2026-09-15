import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./App.css";

// pages
import Header from "./Pages/Header";
import Footer from "./Pages/Footer";
import Home from "./Pages/Home";
import About from "./Pages/About";
import Collection from "./Pages/Collection";
import Contact from "./Pages/Contact";

function App() {
  return (
    // <!-- Start wrapper -->
    <div class="wrapper">
      <div class="col-md-12">
        <Router>
          <Header />
          <Switch>
            <Route
              path="/"
              exact
              render={(props) => {
                return <Home />;
              }}
            />
            <Route
              path="/about"
              exact
              render={(props) => {
                return <About />;
              }}
            />
            <Route
              path="/contact"
              exact
              render={(props) => {
                return <Contact />;
              }}
            />
            <Route
              path="/collection"
              exact
              render={(props) => {
                return <Collection />;
              }}
            />
          </Switch>
        </Router>
        <Footer />
      </div>
    </div>
  );
}

export default App;
