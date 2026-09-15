import { package_add } from "../actions/types";

const initial_state = [];

const Package = (state = initial_state, action) => {
  switch (action.type) {
    case package_add:
      var pkg = state;
      pkg.push(action.package);
      return pkg;
    default:
      return state;
  }
};

export default Package;
