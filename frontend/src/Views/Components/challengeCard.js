import React, { useEffect, useState } from "react";
import { useRouteMatch } from "react-router-dom";

const ChallengeCard = (props) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [Completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(props.data.completed);
  }, [props]);

  const submitFlag = (e) => {
    e.preventDefault();
    if (e.target.flag.value === props.data.flag) {
      setCompleted(true);
      alert("Nice Work...");
    } else {
      setCompleted(false);
      alert("Oops...\nTry harder...");
    }
  };
  return (
    <div className="challengeCard_Wrapper">
      <div className="info">
        <div className="index">{props.index + 1}</div>
        <div className="details">
          <h4>{props.data.name}</h4>
          <p>
            {props.data.tags.map((data, i) => {
              return (
                <span key={i} className="tag">
                  {data}
                </span>
              );
            })}
          </p>
        </div>
        <div className={Completed ? "points completed" : "points"}>
          <h1>
            <i className={Completed ? "fas fa-star" : "far fa-star"}></i>
            {props.data.points}
          </h1>
        </div>

        <div className="action">
          <i
            onClick={() => {
              setShowDetails((state) => {
                return !state;
              });
              setShowPassword(false);
            }}
            className={
              showDetails ? "fas fa-caret-down open" : "fas fa-caret-down"
            }
          ></i>
        </div>
      </div>

      <div className={showDetails ? "accessDetails open" : "accessDetails"}>
        <p>{props.data.description}</p>
        <div className="detailGrid">
          <table border={0}>
            <tr>
              <td>Url :</td>
              <td>
                <a
                  target="_blank"
                  href={`http://${
                    props.data.url
                  }.${window.location.host.replace("www.", "")}`}
                >
                  {`http://${props.data.url}.${window.location.host.replace(
                    "www.",
                    ""
                  )}`}
                </a>
              </td>
            </tr>
            <tr>
              <td>Username :</td>
              <td>{props.data.username}</td>
            </tr>
            <tr>
              <td>Password :</td>
              <td>
                {showPassword ? (
                  props.data.password
                ) : (
                  <span onClick={() => setShowPassword(true)}>
                    Click here to show password
                  </span>
                )}
              </td>
            </tr>
          </table>
          {Completed ? (
            <div className="completed">
              <h1>
                <i className="far fa-check-circle"></i>Completed
              </h1>
            </div>
          ) : (
            <div className="form">
              <form onSubmit={(e) => submitFlag(e)}>
                <div className="form_group">
                  <input
                    type="text"
                    name="flag"
                    placeholder="XCTF{ Your flag here }"
                  />
                </div>
                <div className="form_group">
                  <button> Submit </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
