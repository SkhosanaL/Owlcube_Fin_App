document.addEventListener("DOMContentLoaded", function () {
  const customerModal = document.getElementById("customerModal");
  const uploadModal = document.getElementById("uploadModal");
  const customerProfileLink = document.getElementById("customerProfileLink");
  const uploadDocumentsLink = document.getElementById("uploadDocumentsLink");

  // Date and Time Display
  function updateDateTime() {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const dateString = now.toLocaleDateString("en-UK", options);
    const timeString = now.toLocaleTimeString("en-UK", { hour: "2-digit", minute: "2-digit" });
    document.getElementById("dateTimeDisplay").textContent = `${dateString} - ${timeString}`;
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Open Customer Profile Modal
  customerProfileLink.addEventListener("click", function (event) {
    event.preventDefault();
    customerModal.style.display = "block";
  });

  // Open Supporting Documents Modal
  uploadDocumentsLink.addEventListener("click", function (event) {
    event.preventDefault();
    uploadModal.style.display = "block";
  });

  // Close Customer Modal
  window.closeCustomerModal = function () {
    customerModal.style.display = "none";
  };

  // Close Supporting Documents Modal
  window.closeUploadModal = function () {
    uploadModal.style.display = "none";
  };

  // Close modals when clicking outside of modal content
  window.onclick = function (event) {
    if (event.target == customerModal) {
      closeCustomerModal();
    } else if (event.target == uploadModal) {
      closeUploadModal();
    }
  };

  // Retrieve and display user's first name in the welcome message
  const firstName = document.cookie
    .split("; ")
    .find(row => row.startsWith("firstName="))
    ?.split("=")[1];
  document.getElementById("welcomemessage-dashboard").textContent = `Welcome to Owl Microfinance Corporation, ${firstName || "User"}`;
});

//Loan_App Pop-up control
document.addEventListener("DOMContentLoaded", function () {
  const loanApplicationLink = document.getElementById("loanApplicationLink");
  const loanAppContainer = document.getElementById("loanAppContainer");
  const closeLoanFormButton = document.getElementById("closeLoanForm");
  

  // Show Loan Application Form
  loanApplicationLink.addEventListener("click", function (event) {
    event.preventDefault();
    loanAppContainer.style.display = "block";
  });

  // Close Loan Application Form
    closeLoanFormButton.addEventListener("click", function () {
    loanAppContainer.style.display = "none";
  });
});

//Savings Account Form Controls
document.addEventListener("DOMContentLoaded", function () {
  const savingsAccountForm = document.getElementById("SavingsAccount");
  const savingsAccountLink = document.getElementById("savingsAccountLink");
  const closeSavingsFormButton = document.getElementById("closeSavingsForm");
  const balanceField = document.getElementById("Balance");
  const transactionTableBody = document.getElementById("transactionTableBody"); // Ensure this ID exists in your HTML

  const interestRate = 3.5; // Fixed interest rate of 3.5%

  // Show Savings Account Form and retrieve initial balance
  savingsAccountLink.addEventListener("click", async function (event) {
    event.preventDefault();
    savingsAccountForm.style.display = "flex";

    try {
      const response = await fetch("/api/calculateBalance");
      const data = await response.json();

      if (data.success) {
        balanceField.value = data.balance;
      } else {
        alert("Error retrieving balance: " + data.message);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      alert("Failed to retrieve balance from server.");
    }
  });

  // Generate Savings Account Number
  document.getElementById("Generate-Savings-Acc-No").addEventListener("click", function () {
    const uniqueNumber = "SAV-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    document.getElementById("SavingsAccountNumber").value = uniqueNumber;
  });

  // Handle Deposit submission and log transaction
  document.getElementById("Deposit-Amount").addEventListener("click", async function (event) {
    event.preventDefault();

    const depositAmount = parseFloat(document.getElementById("DepositAmount").value);
    const depositDate = document.getElementById("DateofDeposit").value;

    if (!depositDate || isNaN(depositAmount) || depositAmount <= 0) {
      alert("Please enter a valid deposit amount and date.");
      return;
    }

    try {
      const response = await fetch("/submitDeposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositAmount, depositDate }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Deposit submitted successfully! Updated balance: " + result.balance);
        balanceField.value = result.balance;

        // Log transaction in the transaction table
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${depositAmount.toFixed(2)}</td>
          <td>${new Date(depositDate).toLocaleDateString()}</td>
          <td>${interestRate.toFixed(2)}%</td>
          <td>${result.balance}</td>
        `;
        transactionTableBody.appendChild(row);
      } else {
        alert("Error submitting deposit: " + result.message);
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      alert("Failed to submit deposit.");
    }
  });

  // Close Savings Form
  closeSavingsFormButton.addEventListener("click", function () {
    savingsAccountForm.style.display = "none";
  });

  // Handle Print Statement
  document.getElementById("Print-Statement").addEventListener("click", function () {
    const printContent = `
      <h3>Savings Account Statement</h3>
      <table border="1" style="width: 100%; text-align: left;">
        <thead>
          <tr>
            <th>Payments</th>
            <th>Payment Date</th>
            <th>Bank Interest Rate</th>
            <th>Balance</th>
          </tr>
        </thead>
        ${transactionTableBody.innerHTML}
      </table>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head><title>Savings Account Statement</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const loanStatusLink = document.getElementById("loanStatusLink"); // Link to open Loan Status form

  // Open Loan Status form as a modal
  loanStatusLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.open("/loanStatusForm", "_blank"); // Opens form in a new tab or window
  });
  
  // Optional: Close function if handling as a modal within the same tab (not used with new tab approach)
  window.closeLoanStatusForm = function () {
    const loanStatusContainer = document.querySelector(".loan-status-container");
    if (loanStatusContainer) {
      loanStatusContainer.style.display = "none";
    }
  };
});
