<?php
// setcookie("uN" , base64_encode($_POST["userName"]));
if (isset($_POST["userName"]) && isset($_POST["password"]) && $_POST["userName"] != "" && $_POST["password"] != "") {

    $hashPas = md5($_POST["password"]);
    // if ($hashPas == md5("Doyle@1859")) {
    if ($_POST["userName"] == "Doyle" && $hashPas == "24ecfc510d909590310d17ad5b2d9e82") {
        session_start();
        $_SESSION["Authorized"] = true;
        echo '<script>window.location.href = "search.php";</script>';
    }
} else {

    echo '<script>window.location.href = "index.html";</script>';
}
