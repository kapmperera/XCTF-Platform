<?php
session_start();

define('DB_SERVER', 'localhost:3306');
define('DB_USERNAME', 'p01c08');
define('DB_PASSWORD', 'password1234');
define('DB_DATABASE', 'p01c08');
$db = mysqli_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_DATABASE);

if (isset($_SESSION["Authorized"])) {
    if (!$_SESSION["Authorized"]) {
        header("Location: /");
    } else {
        $sql = "";
        if (isset($_GET["key"])) {
            $sql = 'SELECT * FROM countries WHERE name like  "%' . $_GET["key"] . '%"';
        } else {
            $sql = "SELECT * FROM countries";
        }

        $result = mysqli_query($db, $sql);

        $rows = array();
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        $count = mysqli_num_rows($result);
    }
} else {
    header("Location: /");
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Countries</title>

    <link rel="stylesheet" href="style.css" />
</head>

<body>
    <div class="formContainer">
        <form method="get">
            <input type="text" name="key">
            <input type="submit" value="Search">
        </form>
    </div>
    <div class="resContainer">
        <table border="1">
            <tr>
                <th class="headding">Name</th>
                <th class="headding">Code</th>
                <th class="headding">Region</th>
            </tr>


            <?php
            foreach ($rows as $key => $value) {
                echo '<tr>';
                echo '<td class="data"> ' . $value["name"] .  '</td>';
                echo '<td class="data"> ' . $value["code"] . ' </td>';
                echo '<td class="data"> ' . $value["region"] . ' </td>';

                echo '</tr>';
            }
            ?>

        </table>
    </div>
</body>

</html>