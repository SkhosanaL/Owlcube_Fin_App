// index.js
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const connection = require('./Database/owlcubefin');
const e = require("express");

dotenv.config();
const PORT = process.env.PORT || 3500;
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/Public", express.static(path.join(__dirname, "/Public")));

// Serve home.html as the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/Public/Home.html"));
});

// API Route for registering a new user
app.post('/', async(req, res) => {
  const { first_name, last_name, Email_Address, Password } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    const query = `INSERT INTO Account_Login (First_Name, Last_Name, Email_Address, Password, Date_Account_Created, Account_Status, New_Applicant, Loan_Application_Submitted) 
                   VALUES (?, ?, ?, ?, NOW(), 'Active', 'Yes', 'No')`;
    connection.query(query, [first_name, last_name, Email_Address, hashedPassword], (err, result) => {
      if (err) {
        console.error('Error inserting user into database:', err);
        return res.json({ success: false, message: 'Database error. Please try again.' });
      }
      console.log('User registered:', result);
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error processing registration:', error);
    res.json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// Login Route
app.post("/Login", async (req, res) => {
  const { email, password } = req.body;

  const query = `
    SELECT Account_id, First_Name, Password 
    FROM Account_Login
    WHERE Email_Address = ?`;

  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.Password);

    if (validPassword) {
      res.cookie("userLoggedIn", true, { httpOnly: true, maxAge: 3600000 });
      res.cookie("firstName", user.First_Name, { httpOnly: false, maxAge: 3600000 });
      res.cookie("accountId", user.Account_id, { httpOnly: true, maxAge: 3600000 });

      return res.json({ success: true, message: "Login successful!" });
    } else {
      return res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

//saving customer profile
app.post("/submitCustomerProfile", (req, res) => {
  const accountId = req.cookies.accountId;
  console.log("Account ID from cookie:", accountId);

  if (!accountId) {
    return res.send(`
      <script>
        alert("User not logged in. Please log in again.");
        window.location.href = "/Public/Login.html";
      </script>
    `);
  }
    const {
      title,
      firstName,
      lastName,
      address,
      rsaId,
      email,
      phoneNumber,
      occupation,
      income,
      expenses,
      Returning_Customer,
      confirmPrivacy,
      confirmInsolvency
    } = req.body;

    console.log("Received data:", req.body); 

    // First, check if RSA_Identity_number already exists
    const checkDuplicateQuery = "SELECT * FROM Customer WHERE RSA_Identity_number = ?";
    connection.query(checkDuplicateQuery, [rsaId], (err, results) => {
    if (err) {
      console.error("Database error on duplicate check:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length > 0) {
      // RSA_Identity_number already exists
      return res.status(400).json({ success: false, message: "RSA Identity Number is already registered" });
    }

     // Generate the base of Customer_number
    const baseCustomerNumber = `${lastName.slice(0, 3).toUpperCase()}${firstName.charAt(0).toUpperCase()}`;

    const findCustomerNumberQuery = `
    SELECT Customer_number FROM Customer 
    WHERE Customer_number LIKE '${baseCustomerNumber}%' 
    ORDER BY Customer_number DESC 
    LIMIT 1
  `;
    
  connection.query(findCustomerNumberQuery, (err, results) => {
    if (err) {
      console.error("Error finding customer number:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    let customerNumber;
    if (results.length > 0) {
      // Get the last used number, increment it
      const lastCustomerNumber = results[0].Customer_number;
      const lastNumber = parseInt(lastCustomerNumber.slice(-4)) + 1;
      customerNumber = `${baseCustomerNumber}${String(lastNumber).padStart(4, "0")}`;
    } else {
      // Start with 0001 if no similar Customer_number exists
      customerNumber = `${baseCustomerNumber}0001`;
    }
  
    const insertCustomerQuery = `
      INSERT INTO customer 
      (Account_id,Customer_number,Title, First_Name, Last_Name, Physical_Address, RSA_Identity_number, 
       Email_Address, Cellphone_number, Occupation, Monthly_Gross_Income, 
       Total_Monthly_Expenses, Returning_Customer,Confirm_Privacy, Insolvent) 
      VALUES (?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;
  
    const values = [
      accountId,
      customerNumber,
      title,
      firstName,
      lastName,
      address,
      rsaId,
      email,
      phoneNumber,
      occupation,
      income,
      expenses,
      Returning_Customer? 0:1,
      confirmPrivacy ? 1 : 0,
      confirmInsolvency ? 1 : 0
    ];
  
    connection.query(insertCustomerQuery, values, (insertErr, result) => {
      if (insertErr) {
        console.error("Error saving customer data:", insertErr);
        return res.status(500).send(`
          <script>
            alert("Error saving profile. Please try again.");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      }
  
        res.send(`
          <script>
             alert("Profile saved successfully!");
             window.location.href = "/Public/dashboard.html";
          </script>
        `);
     });
    });
  });
});
// Logout Route
app.post("/logout", (req, res) => {
  res.clearCookie("userLoggedIn");
  res.clearCookie("firstName");
  res.clearCookie("accountId");
  res.json({ success: true, message: "Logged out successfully" });
});

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const upload = multer({ storage: storage });

// File Upload Route with Customer_id Retrieval
app.post("/uploadDocument", upload.single("documentFile"), (req, res) => {
  if (!req.file) {
    return res.send(`
      <script>
        alert("No file uploaded. Please choose a file.");
        window.location.href = "/Public/dashboard.html";
      </script>
    `);
  }

  const firstName = req.cookies.firstName; // Alternatively, use req.cookies or other identifiers
  const uploadPath = req.file.path;
  const dateUploaded = new Date();

  // Query Customer table to retrieve Customer_id based on email
  const customerQuery = `
    SELECT Customer_id 
    FROM Customer 
    WHERE First_Name = ?`;

    connection.query(customerQuery, [firstName], (customerErr, customerResults) => {
      if (customerErr) {
        console.error("Error retrieving Customer_id:", customerErr);
        return res.send(`
          <script>
            alert("Database error. Please try again later.");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      }
  
      if (customerResults.length === 0) {
        return res.send(`
          <script>
            alert("Customer not found. Please check the email address.");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      }

     const customerId = customerResults[0].Customer_id;

    // Insert record into Financial_History table with retrieved Customer_id
     const insertQuery = `
      INSERT INTO Financial_History (Customer_id, uploads, Date_uploaded) 
      VALUES (?, ?, NOW())`;

      connection.query(insertQuery, [customerId, uploadPath, dateUploaded], (err, result) => {
        if (err) {
          console.error("Error saving financial history data:", err);
          return res.send(`
            <script>
              alert("Database error. Please try again later.");
              window.location.href = "/Public/dashboard.html";
            </script>
          `);
        }
        res.send(`
          <script>
            alert("Document uploaded successfully!");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      });
    });
  });

// Route for Registering a New User
app.post("/register", async (req, res) => {
  const { first_name, last_name, Email_Address, Password } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    const query = `
      INSERT INTO Account_Login (First_Name, Last_Name, Email_Address, Password, Date_Account_Created, Account_Status, New_Applicant, Loan_Application_Submitted) 
      VALUES (?, ?, ?, ?, NOW(), 'Active', 'Yes', 'No')`;

    connection.query(query, [first_name, last_name, Email_Address, hashedPassword], (err, result) => {
      if (err) {
        console.error("Error inserting user into database:", err);
        return res.json({ success: false, message: "Database error. Please try again." });
      }

      console.log("User registered:", result);
      res.json({ success: true });
    });
  } catch (error) {
    console.error("Error processing registration:", error);
    res.json({ success: false, message: "Server error. Please try again later." });
  }
});

//Loan-App route
app.post("/submitLoanApplication", (req, res) => {
  const accountId = req.cookies.accountId; // Get Account ID from cookies to identify the logged-in user

  // Step 1: Retrieve customer data from Customer table
  const customerQuery = `
    SELECT Customer_id, Customer_number, First_Name, Last_Name 
    FROM Customer 
    WHERE Account_id = ?`;
  
  connection.query(customerQuery, [accountId], (error, customerResults) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).send("Server error. Please try again later.");
    }

    if (customerResults.length === 0) {
      return res.status(400).send("Customer not found");
    }

    const { Customer_id, Customer_number, First_Name, Last_Name } = customerResults[0];

    // Step 2: Generate Loan_Account_number
    const date = new Date();
    const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;
    const currentYear = date.getFullYear();

    // Query to find the latest application and determine the next year increment
    const yearIncrementQuery = `
      SELECT MAX(Date_of_Application) as lastApplicationDate 
      FROM Loan_Application 
      WHERE Customer_id = ?`;

    connection.query(yearIncrementQuery, [Customer_id], (yearError, yearResults) => {
      if (yearError) {
        console.error("Database error:", yearError);
        return res.status(500).send("Server error. Please try again later.");
      }

      let loanYear = currentYear;
      if (yearResults[0].lastApplicationDate) {
        const lastYear = new Date(yearResults[0].lastApplicationDate).getFullYear();
        loanYear = lastYear >= currentYear ? lastYear + 1 : currentYear;
      }

      const loanAccountNumber = `${Last_Name.slice(0, 3).toUpperCase()}${First_Name.charAt(0).toUpperCase()}-${dayMonth}/${loanYear}`;

      // Step 3: Insert into Loan_Application table
      const insertLoanQuery = `
        INSERT INTO Loan_Application 
        (Customer_id, Loan_Account_number, Customer_number, Loan_type, Loan_Term, Loaned_Amount, Date_of_Application) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`;

      const { Loan_type, Loan_Term, Loaned_Amount } = req.body;

      connection.query(insertLoanQuery, [Customer_id, loanAccountNumber, Customer_number, Loan_type, Loan_Term, Loaned_Amount], (insertError) => {
        if (insertError) {
          console.error("Database error:", insertError);
          return res.send(`
            <script>
            alert("Server Error, please try again!");
            window.location.href = "/Public/dashboard.html";
          </script>
          `);
        }

        res.send(`
          <script>
            alert("Application submitted successfully!, Your Loan Account Number is:${loanAccountNumber}");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      });
    });
  });
});

// API route to calculate balance
app.get("/api/calculateBalance", (req, res) => {
  const accountId = req.cookies.accountId;

  const loanQuery = `
    SELECT Loaned_Amount, Loan_Term
    FROM Loan_Application
    WHERE Customer_id = (SELECT Customer_id FROM Customer WHERE Account_id = ?)
    ORDER BY Date_of_Application DESC
    LIMIT 1`;

  connection.query(loanQuery, [accountId], (err, results) => {
    if (err) {
      console.error("Database error retrieving loan information:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No loan information found" });
    }

    const { Loaned_Amount, Loan_Term } = results[0];
    const interestRate = 3.5;
    const balance = Loaned_Amount * (1 + (interestRate * Loan_Term) / 100);

    res.json({ success: true, balance: balance.toFixed(2) });
  });
});

app.post("/submitDeposit", async (req, res) => {
  const { depositAmount, depositDate } = req.body;
  const accountId = req.cookies.accountId; // Get Account ID from cookies to identify the logged-in user

  try {
    // Step 1: Retrieve necessary customer and loan information
    const customerQuery = `
      SELECT Customer.Customer_id, Loan_Application.Loan_id, Loan_Application.Loaned_Amount, Loan_Application.Loan_Term, Financial_History.Financial_History_id
      FROM Customer
      JOIN Loan_Application ON Customer.Customer_id = Loan_Application.Customer_id
      LEFT JOIN Financial_History ON Customer.Customer_id = Financial_History.Customer_id
      WHERE Customer.Account_id = ?
      ORDER BY Loan_Application.Date_of_Application DESC
      LIMIT 1`;

    const [customer] = await new Promise((resolve, reject) => {
      connection.query(customerQuery, [accountId], (error, results) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer or loan information not found" });
    }

    const { Customer_id, Loan_id, Loaned_Amount, Loan_Term, Financial_History_id } = customer;
    const interestRate = 3.5; // Example interest rate

    // Step 2: Calculate the opening balance with interest
    let currentBalance = Loaned_Amount * (1 + (interestRate * Loan_Term) / 100);

    // Step 3: Apply deposit and update balance with interest
    const newBalance = (currentBalance - depositAmount) * (1 + interestRate / 100);

    // Generate a unique Savings Account Number if not already present
    const savingsAccountNumber = "SAV-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

    // Step 4: Insert data into Savings_Account table
    const insertDepositQuery = `
      INSERT INTO Savings_Account
      (Financial_History_id, Customer_id, Savings_Account_number, Date_opened, Deposit, Date_of_Deposit, Balance, Interest_rate, payments, Payment_Date, Loan_id)
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, NOW(), ?)`;

    await new Promise((resolve, reject) => {
      connection.query(
        insertDepositQuery,
        [
          Financial_History_id,
          Customer_id,
          savingsAccountNumber,
          depositAmount,
          depositDate,
          newBalance,
          interestRate,
          depositAmount,
          Loan_id
        ],
        (error) => {
          if (error) reject(error);
          resolve();
        }
      );
    });

    // Send success response back to the client
    res.json({ success: true, message: "Deposit submitted successfully", balance: newBalance.toFixed(2) });
  } catch (error) {
    console.error("Error processing deposit submission:", error);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
});
//Get-Loan-Status
app.get("/loanStatusForm", async (req, res) => {
  const accountId = req.cookies.accountId; // Assuming accountId is stored in cookies

  if (!accountId) {
    return res.status(400).send(`
      <script>
        alert("User not authenticated.");
        window.location.href = "/Public/Home.html";
      </script>
    `);
  }

  try {
    const query = `
      SELECT customer.Customer_number AS customerNumber,
             customer.First_Name AS firstName,
             customer.Last_Name AS lastName,
             customer.RSA_Identity_number AS identityNumber,
             customer.Email_Address AS email,
             loan_application.Loan_Account_number AS loanAccountNumber,
             loan_application.Loan_type AS loanType,
             loan_application.Loan_Term AS loanTerm,
             loan_application.Date_of_Application AS dateOfApplication,
             loan_application.Loaned_Amount AS loanedAmount,
             savings_account.Savings_Account_number AS savingsAccountNumber
      FROM customer
      JOIN loan_application ON loan_application.Customer_id = customer.Customer_id
      JOIN savings_account ON savings_account.Customer_id = customer.Customer_id
           AND loan_application.Loan_id = savings_account.Loan_id
      WHERE customer.Account_id = ?;
    `;

    connection.query(query, [accountId], (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).send(`
          <script>
            alert("Server error. Please try again later.");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      }

      if (results.length === 0) {
        return res.status(404).send(`
          <script>
            alert("Loan status not found.");
            window.location.href = "/Public/dashboard.html";
          </script>
        `);
      }

      const data = results[0];

      // Render the form with populated data
      res.send(`
        <html>
          <head>
            <link rel="stylesheet" type="text/css" href="/Public/Dashboard.css">
            <style>
              .loan-status-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 10px;
                width: 50%;
                margin: auto;
                background-color: #f9f9f9;
              }
              .loan-status-container label, input, .application-status {
                display: inline-block;
                width: 30%;
                margin: 5px;
                text-align: left;
              }
              .application-status {
                width: 100%;
                display: flex;
                justify-content: space-around;
                margin-top: 10px;
              }
              .close-button {
                background-color: yellow;
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                margin-top: 10px;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="loan-status-container">
              <form>
                
                <label for="customerNumber">customerNumber:</label>
                <input type="text" id="customerNumber" value="${data.customerNumber || ''}" readonly>

                <label for="savingsAccountNumber">Savings Account Number:</label>
                <input type="text" id="savingsAccountNumber" value="${data.savingsAccountNumber || ''}" readonly>

                <label for="firstName">First Name:</label>
                <input type="text" id="firstName" value="${data.firstName || ''}" readonly>

                <label for="lastName">Last Name:</label>
                <input type="text" id="lastName" value="${data.lastName || ''}" readonly>

                <label for="identityNumber">Identity Number:</label>
                <input type="text" id="identityNumber" value="${data.identityNumber || ''}" readonly>

                <label for="emailAddress">Email Address:</label>
                <input type="text" id="emailAddress" value="${data.email || ''}" readonly>

                <label for="loanAccountNumber">Loan Account Number:</label>
                <input type="text" id="loanAccountNumber" value="${data.loanAccountNumber || ''}" readonly>

                <label for="loanedAmount">Loaned Amount:</label>
                <input type="text" id="loanedAmount" value="${data.loanedAmount || ''}" readonly>

                <label for="loanType">Loan Type:</label>
                <input type="text" id="loanType" value="${data.loanType || ''}" readonly>

                <label for="loanTerm">Loan Term:</label>
                <input type="text" id="loanTerm" value="${data.loanTerm || ''}" readonly>

                <label for="dateOfApplication">Date of Application:</label>
                <input type="text" id="dateOfApplication" value="${data.dateOfApplication || ''}" readonly>

                <div class="application-status">
                  <label>Application Status:</label>
                  <input type="checkbox" id="statusInProgress" checked disabled> Application in Progress
                  <input type="checkbox" id="statusApproved" disabled> Approved
                  <input type="checkbox" id="statusRejected" disabled> Rejected
                </div>

                <button type="button" class="close-button" onclick="window.close()">Close</button>
              </form>
            </div>
          </body>
        </html>
      `);
    });
  } catch (error) {
    console.error("Error retrieving loan status:", error);
    res.status(500).send(`
      <script>
        alert("Server error. Please try again later.");
        window.location.href = "/Public/dashboard.html";
      </script>
    `);
  }
});

// Start the server
  app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      connection.connect(function(err) {
        if (err) throw err;
         console.log("Database connected.");
      });
  });

