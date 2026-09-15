<?php
// setcookie("uN" , base64_encode($_POST["userName"]));
if (isset($_POST["userName"]) && isset($_POST["password"]) && $_POST["userName"] != "" && $_POST["password"] != "") {
    setcookie("uN", $_POST["userName"]);
    setcookie("uR", base64_encode("['user']"));
    echo '<script>window.location.href = "dashboard.html";</script>';
} else {

    echo '<script>window.location.href = "index.html";</script>';
}
