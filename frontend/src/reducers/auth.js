import { auth_signin, auth_signout } from "../actions/types";
import Cookies from "js-cookie";

const initial_state = {
  isSignedin: false,
  email: "",
};

const auth = (state = initial_state, action) => {
  switch (action.type) {
    case auth_signin:
      Cookies.set("isSignedin", true);
      Cookies.set("uM", action.email);
      return {
        isSignedin: true,
        email: action.email,
      };
    case auth_signout:
      Cookies.remove("isSignedin");
      Cookies.remove("uM");
      return {
        isSignedin: false,
        email: "",
      };
    default:
      return state;
  }
};

export default auth;
