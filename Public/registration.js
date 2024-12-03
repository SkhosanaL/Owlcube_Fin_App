// registration.js
document.getElementById("User-Registration-form").addEventListener("submit", function(event) {
  event.preventDefault(); // Prevent the form from submitting the traditional way

  // Gather form data
  const data = {
    first_name: document.getElementById("firstName").value,
    last_name: document.getElementById("lastName").value,
    Email_Address: document.getElementById("email").value,
    Password: document.getElementById("password").value
  };

  // Send data to the server using fetch
  fetch('/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) // Ensure you send the correct data
  })
  .then(response => response.json())
  .then(data => {
    const MessageResults = document.getElementById("MessageResults");
    if (data.success) {

      MessageResults.textContent = 'Customer information registered successfully. Please note your email address and your password for successful login!';
      MessageResults.style.color = 'green';

      window.location.href = "/Public/Account-Login.html";
    
     
    } else {
      MessageResults.textContent = data.message || "Registration failed.";
      MessageResults.style.color = 'red';
    }
  })
  .catch(error => {
    console.error('Error:', error);
    const MessageResults = document.getElementById("MessageResults");
    MessageResults.textContent = 'An error occurred. Please try again.';
    MessageResults.style.color = 'red';
  });
});
