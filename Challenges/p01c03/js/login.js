function login(e) {
  var uName = e.target.userName.value;
  var pass = e.target.password.value;
  var hashPasss = sha256(pass);
  if (
    uName == "Admin" &&
    hashPasss ==
      "60fe74406e7f353ed979f350f2fbb6a2e8690a5fa7d1b0c32983d1d8b3f95f67"
  ) {
    return true;
  } else {
    alert("Oops! Try harder. You are not an admin.");
    return false;
  }
}
