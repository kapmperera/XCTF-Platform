<?php
if (isset($_POST["userName"]) && isset($_POST["password"]) && $_POST["userName"] != "" && $_POST["password"] != "") {

    if ($_POST["userName"] == "Admin" && $_POST["password"] == "Admin1234") {
        echo 'Welcome Admin ! Your Flag is XCTF{Common_passwords_brings_bad luck}';
    } else {
        echo 'Oops! Try harder. You are not an admin.';
    }
} else {
    echo '<script>window.location.href = "index.html";</script>';
}
