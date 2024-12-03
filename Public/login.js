document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("Login-form");
  const messageResults = document.getElementById("MessageResults");

  // Event listener for form submission
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevents the default form submission behavior

    // Retrieve email and password values
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Basic validation for empty fields
    if (!email || !password) {
      messageResults.textContent = "Please enter both email and password.";
      messageResults.style.color = "red";
      return;
    }

    // Prepare data for sending to server
    const loginData = { email, password };

    // Send login data to server
    fetch("http://localhost:3500/Login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Display login success message briefly
        messageResults.textContent = data.message;
        messageResults.style.color = "green";
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          window.location.href = "/Public/dashboard.html";
        }, 1500);
      } else {
        // Display error message from server
        messageResults.textContent = "Login failed: " + data.message;
        messageResults.style.color = "red";
      }
    })
    .catch(error => {
      console.error("Login error:", error);
      messageResults.textContent = "An error occurred. Please try again.";
      messageResults.style.color = "red";
    });
  });
});
