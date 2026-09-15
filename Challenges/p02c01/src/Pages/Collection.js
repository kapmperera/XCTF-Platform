import React from "react";

const Data = require("./CollectionData.json");

const Collection = (props) => {
  return (
    //  <!-- Start margin -->
    <div className="margin-collection wow fadeIn" data-wow-delay="0.1s">
      <div className="col-md-10 col-xs-offset-1">
        <h3 className="heading-inner">Collection</h3>
        <div className="hr"></div>
        <div className="heading-c">
          Some hats can only be worn if you're willing to be jaunty, to set them
          at an angle and to walk beneath them with a spring in your stride as
          if you're only a step away from dancing. They demand a lot of you.{" "}
        </div>
      </div>
      {/* <!-- End text --> */}

      {/* <!-- Start projects --> */}
      <div className="container">
        {/* <ul className="portfolio-filter text-center">
          <li>
            <a className="btn btn-default active" href="#" data-filter="*">
              All Collection
            </a>
          </li>
          <li>
            <a className="btn btn-default" href="#" data-filter=".spring">
              Spring
            </a>
          </li>
          <li>
            <a className="btn btn-default" href="#" data-filter=".summer">
              Summer
            </a>
          </li>
          <li>
            <a className="btn btn-default" href="#" data-filter=".autumn">
              Autumn
            </a>
          </li>
        </ul> */}

        <div className="row">
          <div className="portfolio-items grid">
            {Data.map((data, i) => {
              return (
                <div className="portfolio-item summer col-xs-12 col-sm-12 col-md-4 thumbs">
                  <figure
                    className="effect-moses wow fadeIn"
                    data-wow-delay="0.1s"
                  >
                    <a href={data.image}>
                      <img src={data.image} alt="" />
                      <figcaption>
                        <h2>{data.title}</h2>
                        <p>{data.desc}</p>
                      </figcaption>
                    </a>
                  </figure>
                </div>
              );
            })}
            {/* 
            <div className="portfolio-item autumn col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image2.jpg">
                  <img src="http://thexctf.site:8888/image2.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO2</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item spring col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image3.jpg">
                  <img src="http://thexctf.site:8888/image3.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO3</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item spring col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image4.jpg">
                  <img src="http://thexctf.site:8888/image4.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO4</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item summer col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image5.jpg">
                  <img src="http://thexctf.site:8888/image5.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO5</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item summer col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image6.jpg">
                  <img src="http://thexctf.site:8888/image6.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO6</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item autumn col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image7.jpg">
                  <img src="http://thexctf.site:8888/image7.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO7</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item autumn col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image8.jpg">
                  <img src="http://thexctf.site:8888/image8.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO8</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>

            <div className="portfolio-item spring col-xs-12 col-sm-12 col-md-4 thumbs">
              <figure className="effect-moses wow fadeIn">
                <a href="img/image9.jpg">
                  <img src="http://thexctf.site:8888/image9.jpg" alt="" />
                  <figcaption>
                    <h2>PHOTO9</h2>
                    <p>
                      The human head is a constantly moving and turning pedestal
                      with the hat a sculpture.
                    </p>
                  </figcaption>
                </a>
              </figure>
            </div>
           */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collection;
