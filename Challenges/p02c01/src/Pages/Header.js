import React from "react";
import { Link } from "react-router-dom";

const Header = (props) => {
  return (
    <div>
      <div className="brand wow fadeIn" data-wow-delay="0.1s">
        Patsy Doherty
        <div className="title">- hat designer -</div>
      </div>

      <nav className="navbar navbar-default" role="navigation">
        <div className="navbar-header">
          <button
            type="button"
            className="navbar-toggle"
            data-toggle="collapse"
            data-target="#bs-example-navbar-collapse-1"
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          {/* <!-- navbar-brand is hidden on larger screens, but visible when the menu is collapsed --> */}
          <div className="navbar-brand">
            <Link to="">Patsy Doherty</Link>
            <div className="title">- hat designer -</div>
          </div>
        </div>
        <div
          className="collapse navbar-collapse"
          id="bs-example-navbar-collapse-1"
        >
          <ul className="nav navbar-nav">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            {/* <li>
              <Link to="/services">Services</Link>
            </li> */}
            <li>
              <Link to="/collection">Collection</Link>
            </li>
            {/* <li>
              <Link to="/resume">Resume</Link>
            </li>
            <li>
              <Link to="/news">News</Link>
            </li> */}
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        {/* <!-- /navbar-collapse --> */}
      </nav>
    </div>
  );
};

export default Header;
