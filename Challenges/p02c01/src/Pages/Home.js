import React from "react";
import { Link } from "react-router-dom";

const Home = (props) => {
  return (
    <div>
      {/* <!-- Start main image and the text below --> */}
      <div className="col-md-12 wow fadeIn" data-wow-delay="0.1s">
        <img src="http://thexctf.site:8888/main-banner.jpg" alt="img" className="resp main-image" />
        <h1>Hat design</h1>
        <div className="hr"></div>
        <h2>
          The human head is a constantly moving and turning pedestal...with the
          hat a sculpture.
        </h2>
        <div className="text-center">
          <Link to="collection" className="home-btn btn">
            View collection
          </Link>
        </div>
      </div>
      {/* <!-- End main image and the text below --> */}

      {/* <!-- Start left column --> */}
      <div className="box-home col-md-4 col-xs-offset-1">
        <h3>
          <span className="text-left">The right hat may also enliven our</span>
          imagination of the past...an old-fashioned cloche, a picture hat, or a
          toque trimmed with a pouf of polka-dotted veiling is just enough to
          make us feel as if we were living in another, romantic age.
          <a href="news.html">
            read more <i className="fa fa-angle-right"></i>
          </a>
        </h3>
      </div>
      {/* <!-- End left column --> */}

      {/* <!-- Start right image --> */}
      <div className="col-md-6 wow fadeIn" data-wow-delay="0.1s">
        <div className="first">
          <div className="square wow fadeInDown" data-wow-delay=".5s"></div>
        </div>
        <img src="http://thexctf.site:8888/photo.jpg" alt="img" className="photo-home" />
      </div>
      {/* <!-- End right image --> */}
    </div>
  );
};

export default Home;
