import { combineReducers } from "redux";
import auth from "./auth";
import Package from "./Packages";

const reducers = combineReducers({
  auth: auth,
  Packages: Package,
});

export default reducers;
