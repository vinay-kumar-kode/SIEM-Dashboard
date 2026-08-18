function login(){

    let username =
        document.getElementById("username").value;

    let password =
        document.getElementById("password").value;

    if(username==="admin" && password==="admin123"){

        window.location.href="dashboard.html";

    }

    else{

        document.getElementById("message").innerHTML =
        "Invalid Username or Password";

    }

}
