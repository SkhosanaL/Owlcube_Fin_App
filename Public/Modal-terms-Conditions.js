// Get all the links with the class "terms-link"
var termsLinks = document.querySelectorAll(".terms-link");

// Loop through each link and add an event listener
termsLinks.forEach(function(link) {
  link.addEventListener("click", function(event) {
    event.preventDefault();  // Prevent the default link action
    
    // Fetch the corresponding Terms and Conditions for each loan
    fetch('/Public/Terms&Conditions.html')  // data-loan attribute to fetch specific files for each loan
      .then(response => response.text())
      .then(html => {
        // Show the modal and insert the content
        var modal = document.getElementById("myModal");
        modal.innerHTML = html;
        modal.style.display = "block";

        // Add the close button functionality
        var span = modal.querySelector(".close");
        span.onclick = function() {
          modal.style.display = "none";
        }
      })
      .catch(err => {
        console.error('Failed to load modal content:', err);
      });
  });
});

// Close the modal if the user clicks outside of it
window.onclick = function(event) {
  var modal = document.getElementById("myModal");
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
