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
const PORT = process.env.PORT || 8080;

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
  inquirer.prompt([
      {
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
      }
  ])
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

function viewAllDepartments() {
  db.query('SELECT department.id AS ID, department.name AS DEPARTMENT FROM department', function (err, results) {
      console.table('\n', results, '\n');
      init();
  })
}

init();

// sync sequelize models to the database, then turn on the server
sequelize.sync({ force: false }).then(() => {
  app.listen(PORT, () => console.log('Now listening'));
});