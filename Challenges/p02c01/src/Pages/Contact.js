import React from "react";

const Contact = (props) => {
  return (
    // <!-- Start margin -->
    <div className="margin-contact">
      {/* <!-- Start left column --> */}
      <div className="box-contact col-md-4 col-xs-offset-1">
        <h3 className="heading-inner">Get in touch</h3>
        <div className="hr"></div>
        <div id="contact-area">
          <form method="post" action="#">
            <label for="Name">Name:</label>
            <input type="text" name="Name" id="Name" />
            <label for="Email">Email:</label>
            <input type="text" name="Email" id="Email" />
            <label for="Message">Message:</label>
            <br />
            <textarea
              name="Message"
              rows="20"
              cols="20"
              id="Message"
            ></textarea>
            <input
              type="submit"
              name="submit"
              value="Submit"
              className="submit-button"
            />
          </form>
        </div>
        <h6>
          <strong>Address:</strong> Sherlock Street 34, London
          <span>
            <strong>Tel: </strong>+44 (0)333 222 3333
          </span>
          <span>
            <strong>Email: </strong>
            <a href="mailto:patsy@office.com"> patsy@office.com</a>
          </span>
          <span>
            <strong>Working hours: </strong>Mond-Frid: 9am/5pm
          </span>
        </h6>
      </div>
      {/* <!-- End left column --> */}

      {/* <!-- Start right image --> */}
      <div className="col-md-6 wow fadeIn" data-wow-delay="0.1s">
        <img src="http://thexctf.site:8888/contact.jpg" alt="img" className="photo-contact" />
      </div>
      {/* <!-- End right image --> */}
    </div>
    //  <!-- End margin -->
  );
};

export default Contact;
