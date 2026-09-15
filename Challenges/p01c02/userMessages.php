<?php

$isAdmin = false;

if (strpos(base64_decode($_COOKIE["uR"]), "'admin'") !== false) {
  $isAdmin = true;
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Log in</title>

  <link rel="stylesheet" href="style.css" />
</head>

<body>
  <div class="DashboardWrapper">

    <div class="DashboardContainer">
      <?php if ($isAdmin) {
        include "messages.php";
      } else {
        echo "<h1> Please Sign in as Admin</h1>";
      }  ?>
    </div>
  </div>
</body>

</html>