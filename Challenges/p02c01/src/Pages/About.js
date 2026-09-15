import React from "react";

const About = (props) => {
  return (
    <div>
      {/* <!-- Start margin --> */}
      <div className="margin-about">
        {/* <!-- Start left column --> */}
        <div className="box-about col-md-4 col-xs-offset-1">
          <h3 className="heading-inner">About</h3>
          <div className="hr"></div>
          <h4>
            <span className="text-about">Some hats can only be worn</span> if
            you're willing to be jaunty, to set them at an angle and to walk
            beneath them with a spring in your stride as if you're only a step
            away from dancing. They demand a lot of you.
          </h4>

          <h4>
            <span className="text-about">
              {" "}
              The right hat may also enliven our
            </span>{" "}
            imagination of the past...an old-fashioned cloche, a picture hat, or
            a toque trimmed with a pouf of polka-dotted veiling is just enough
            to make us feel as if we were living in another, romantic age.
          </h4>

          <h4>
            <span className="text-about">Some hats can only be worn</span> if
            you're willing to be jaunty, to set them at an angle and to walk
            beneath them with a spring in your stride as if you're only a step
            away from dancing. They demand a lot of you.
          </h4>
          <h4>
            <span className="text-about">
              Wearing hats has become like fine art.
            </span>
          </h4>
        </div>
        {/* <!-- End left column --> */}

        {/* <!-- Start right image --> */}
        <div className="col-md-6 wow fadeIn" data-wow-delay="0.1s">
          <img src="http://thexctf.site:8888/about1.jpg" alt="" className="photo-about" />
        </div>
        {/* <!-- End right image --> */}
      </div>
      {/* <!-- End margin --> */}

      <div className="col-md-12"></div>

      {/* <!-- Start margin --> */}
      <div className="margin-about">
        {/* <!-- Start right image --> */}
        <div
          className="col-md-6 wow fadeIn col-md-offset-1"
          data-wow-delay="0.1s"
        >
          <img src="http://thexctf.site:8888/about.jpg" alt="" className="photo-about" />
        </div>
        {/* <!-- End right image --> */}
        {/* <!-- Start left column --> */}
        <div className="box-about col-md-4">
          <h3 className="heading-inner">My process</h3>
          <div className="hr"></div>
          <div className="media">
            <div className="pull-left">
              <span className="fa-stack fa-2x">
                <i className="fa fa-circle fa-stack-2x text-primary"></i>
                <i className="fa fa-star fa-stack-1x fa-inverse"></i>
              </span>
            </div>
            <div className="media-body">
              <h4 className="media-heading">Process 1</h4>
              <p>
                SOME HATS CAN ONLY BE WORN if you're willing to be jaunty, to
                set them at an angle and to walk beneath them with a spring.{" "}
              </p>
            </div>
          </div>
          <div className="media">
            <div className="pull-left">
              <span className="fa-stack fa-2x">
                <i className="fa fa-circle fa-stack-2x text-primary"></i>
                <i className="fa fa-lightbulb-o fa-stack-1x fa-inverse"></i>
              </span>
            </div>
            <div className="media-body">
              <h4 className="media-heading">Process 2</h4>
              <p>
                SOME HATS CAN ONLY BE WORN if you're willing to be jaunty, to
                set them at an angle and to walk beneath them with a spring.{" "}
              </p>
            </div>
          </div>
          <div className="media">
            <div className="pull-left">
              <span className="fa-stack fa-2x">
                <i className="fa fa-circle fa-stack-2x text-primary"></i>
                <i className="fa fa-anchor fa-stack-1x fa-inverse"></i>
              </span>
            </div>
            <div className="media-body">
              <h4 className="media-heading">Process 3</h4>
              <p>
                SOME HATS CAN ONLY BE WORN if you're willing to be jaunty, to
                set them at an angle and to walk beneath them with a spring.{" "}
              </p>
            </div>
          </div>
        </div>
        {/* <!-- End left column --> */}
      </div>
      {/* <!-- End margin --> */}
    </div>
  );
};

export default About;
