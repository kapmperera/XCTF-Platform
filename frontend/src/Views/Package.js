import React, { useEffect, useState } from "react";
import { Link, useLocation, useRouteMatch } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
// Components
import ChallengeCard from "./Components/challengeCard";

// const packageList = require("../JSON/myPackages.json");
const challengesList = require("../JSON/challenges.json");

const Package = (props) => {
  const location = useLocation();
  const match = useRouteMatch();
  const pId = Number.parseInt(match.params.id);

  const packageList = useSelector((state) => state.Packages);

  const [data, setdata] = useState({});
  const [ChallengesList, setChallengesList] = useState([]);

  useEffect(() => {
    const getData = () => {
      packageList.map((data) => {
        if (data.id === pId) {
          setdata(data);
        }
      });
    };

    getData();

    var cList = [];
    try {
      cList = require(`../JSON/challenges/${pId}.json`);
      console.log(cList);
    } catch (error) {
      cList = [];
      console.error("Error : ", error);
    }
    setChallengesList(cList);
  }, []);

  return (
    <div className="appPage packageWrapper">
      <div className="container">
        <div className="titleSection">
          <img alt={data.name} src={data.image} />
          <div className="info">
            <h3>{data.name}</h3>
            <p>{data.description}</p>
            <p className="metaData">
              <span className="item">
                <span className="key">Last Update : </span> {data.lastUpdate}
              </span>
              <span className="item">
                <span className="key">subscriptions : </span>{" "}
                {data.subscriptions}
              </span>
            </p>
          </div>
          <div className="action">
            <span className="completeStatus">
              {data.challenges_completed}&nbsp;/&nbsp;
              {data.challenges_total}
            </span>
          </div>
        </div>

        {/* =========================================== */}
        {/* =============== Challenges =============== */}
        {/* =========================================== */}
        <div className="sectionTitle">
          <h1>Challenges</h1>
          <hr />
        </div>

        {ChallengesList.map((data, i) => {
          return <ChallengeCard data={data} key={i} index={i} />;
        })}
      </div>
    </div>
  );
};

export default Package;
