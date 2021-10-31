const express = require('express');

const table = require('console.table');
const inquirer = require('inquirer');
const { exit } = require('process');
const mysql = require('mysql2');
const util = require('util');
require('dotenv').config();

// import sequelize connection
const sequelize = require('./config/connection');

const app = express();
const PORT = process.env.PORT || 3306;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createConnection(
  {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PW,
      database: process.env.DB_NAME
  },
);

db.query = util.promisify(db.query);

// Inquirer Function
async function init() {
  inquirer.prompt({
    name: "menu",
    message: "What would you like to do?",
    type: 'list',
    choices: [
      "View All Departments",
      "View All Roles",
      "View All Employees",
      "Add A Department",
      "Add A Role",
      "Add an Employee",
      "Update An Employee Role",
      "Terminate CLI",
    ] 
  })
  // Call function based on user selection
  .then((choice) => {
    switch(choice.menu) {
        case "View All Departments":
            viewAllDepartments();               
            break;
        case "View All Roles":
            viewAllRoles();
            break;
        case "View All Employees":
            viewAllEmployees();
            break;
        case "Add A Department":
            addADepartment();
            break;
        case "Add A Role":
            addARole();
            break;
        case "Add an Employee":
            addAnEmployee();
            break;
        case "Update An Employee Role":
            updateAnEmployeeRole();
            break;
        case "Terminate CLI":
            process.exit();
    }
  })
};

// Functions called by the switch returning back to the menu //

// Retrieval calls
function viewAllDepartments() {
  db.query('SELECT department.id AS ID, department.name AS DEPARTMENT FROM department', 
  function (error, results) {
    console.table('\n', results, '\n');
    init();
  })
}

function viewAllRoles() {
  db.query(`SELECT role.id, role.title, role.salary, department.name
      FROM role 
      JOIN department ON role.department_id = department.id
      ORDER BY role.id ASC`, function (error, results) {
          console.table('\n', results, '\n');
          init();
      })
}

function viewAllEmployees() {
  db.query(`
    SELECT  employee.id AS ID,
            employee.first_name AS "FIRST NAME",
            employee.last_name AS "LAST NAME",
            role.title AS "TITLE",
            role.salary AS "SALARY",
            department.name AS "DEPARTMENT",
            CONCAT(manager.first_name, " ", manager.last_name) AS "MANAGER NAME"
              FROM employee
                LEFT JOIN employee manager ON manager.id = employee.manager_id
                INNER JOIN role ON employee.role_id = role.id
                INNER JOIN department ON role.department_id = department.id`, 
                  function (error, results) {
                    console.table('\n', results, '\n');
                    init();
                  })
}

// Creation Calls
function addADepartment() {
  inquirer.prompt([
      {
          name: "newDepartment",
          message: "Please enter the new department's name.",
          type: "input"
      }
  ]).then((answers) => {
      db.query(`INSERT INTO department SET ?`, {
        name: answers.newDepartment
      })
      console.log('\n', `Department ${answers.newDepartment} has been added to the Database.`, '\n');
      init();
    }
  )
}

async function addARole() {
  // Query DB for department choices array
  let departments = await db.query('SELECT * FROM department');

  inquirer.prompt([
      {
          name: "newRole",
          message: "What is the name of the role?",
          type: "input"
      },
      {
          name: "newSalary",
          message: "What is the salary for this role [XX0000]?",
          type: "number"
      },
      {
          name: "department",
          message: "Which department does the role belong to?",
          type: "list",
          choices: departments.map((department) => {
              return {
                  name: department.department_name,
                  value: department.name
              }
          })
      }
  ]).then((answers) => {
      // Destructure the user input
      let { newRole, newSalary } = answers;
      // Find the department by name and get its ID
      let matchedDepartment = departments.find(department => 
          department.name === answers.department).id;
      
      db.query(`INSERT INTO role SET ?`, {
        title: newRole,
        salary: newSalary,
        department_id: matchedDepartment
      })
      console.log('\n', `${newRole} has been added to the Database.`, '\n');
      init();
    }
  )
}

async function addAnEmployee() {
  // Query DB for role choices array
  let roles = await db.query('SELECT * FROM role');
  // Query DB for employee choices array
  let employees = await db.query(`SELECT
    employee.id AS id,
    employee.first_name AS "firstName",
    employee.last_name AS "lastName",
      CONCAT(employee.first_name, " ", employee.last_name) AS "employeeName"
        FROM employee
        LEFT JOIN employee manager ON manager.id = employee.manager_id
        INNER JOIN role ON employee.role_id = role.id
        INNER JOIN department ON role.department_id = department.id`
  );

  inquirer.prompt([
      {
          name: "firstName",
          message: "What is the employee's first name?",
          type: "input"
      },
      {
          name: "lastName",
          message: "What is the employee's last name?",
          type: "input"
      },
      {
          name: "roleName",
          message: "What role will the employee be undertaking?",
          type: "list",
          choices: roles.map((role) => {
              return {
                  name: role.title
              }
          })
      },
      {
          name: "managerName",
          message: "Who will be the employee's manager?",
          type: "list",
          choices: employees.map((employee) => {
              return {
                  name: `${employee.firstName} ${employee.lastName}`
              }
          })
      }
  ]).then((answers) => {
      // Destructure the user input
      let { firstName, lastName } = answers;
      // Find the role by name and get its ID
      let matchedRoleID = roles.find(role => role.title === answers.roleName).id;
      // Find the manager by name and get their ID
      let matchedManagerID = employees.find(employee => employee.employeeName === answers.managerName).id;
      db.query(`INSERT INTO employee SET ?`, {
        first_name: firstName,
        last_name: lastName,
        role_id: matchedRoleID,
        manager_id: matchedManagerID
      })
      console.log('\n', `Employee ${firstName} ${lastName} has been added to the Database.`, '\n');
      init();
    }
  ) 
}

// Initialisation Call
init();

// sync sequelize models to the database, then turn on the server
sequelize.sync({ force: false }).then(() => {
  app.listen(PORT, () => console.log('Now listening'));
});