function CM(s, e, t, a) {
  if (btoa(t.substring(split * s, split * e)) === a) {
    return true;
  } else {
    return false;
  }
}

function verify(e) {
  e.preventDefault();
  cPass = e.target.password.value;
  split = 4;
  if (CM(7, 8, cPass, "MDAxfQ==")) {
    if (CM(6, 7, cPass, "MDEwMQ==")) {
      if (CM(5, 6, cPass, "YmFkXw==")) {
        if (CM(4, 5, cPass, "X2lzXw==")) {
          if (CM(3, 4, cPass, "c2lkZQ==")) {
            if (CM(2, 3, cPass, "ZW50Xw==")) {
              if (CM(1, 2, cPass, "e2NsaQ==")) {
                if (CM(0, 1, cPass, "WENURg==")) {
                  alert("You got the flag!");
                }
              }
            }
          }
        }
      }
    }
  } else {
    alert("Incorrect password");
  }

  return false;
}