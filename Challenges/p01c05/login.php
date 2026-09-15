<?php
define('DB_SERVER', 'localhost:3306');
define('DB_USERNAME', 'p01c05');
define('DB_PASSWORD', 'password1234');
define('DB_DATABASE', 'p01c05');
$db = mysqli_connect(DB_SERVER,DB_USERNAME,DB_PASSWORD,DB_DATABASE);


if (isset($_POST["userName"]) && isset($_POST["password"]) && $_POST["userName"] != "" && $_POST["password"] != "") {

    $myusername = $_POST['userName'];
    $mypassword = $_POST['password']; 
    
    $sql = "SELECT uid FROM users WHERE username = '$myusername' and password = '$mypassword'";
    
    $result = mysqli_query($db,$sql);
    $row = mysqli_fetch_array($result,MYSQLI_ASSOC);
    
    $count = mysqli_num_rows($result);
    
    
    if($count > 0) {
        echo "<h1?> Logged in! </h1>";
        echo "<br />";
        echo "Your flag is : XCTF{Always_use_prepared_SQL_statements}";
    } else {
       echo "Your Login Name or Password is invalid";
    }

} else {
    echo '<script>window.location.href = "index.html";</script>';
}
