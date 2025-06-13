"use strict"

const Hapi=require("@hapi/hapi");
const { employeeModel, titleModel, salaryModel, departmentEmployeeModel, departmentModel } = require("./models/models");
const { main } = require("./config/dbconfig");
require("dotenv").config();

async function init(){
    const server=Hapi.server({
    host: process.env.HOSTNAME,
    port: process.env.PORT,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });
  try{
    await server.start();
    console.log("Server started at ", server.info.uri);
    await main();
    server.route([{
        method: "GET",
        path: "/employees",
        handler: async(req, h)=>{
            //Display employee names only
            try {
                const {page=1, limit=100}=req.query;
                const limitValue=parseInt(limit);
                const offsetValue=(parseInt(page)-1)*limitValue;
                const getInfo=await employeeModel.findAll({limit: limitValue, offset: offsetValue, raw: true});
                return getInfo;
            } catch (error) {
                console.log("Error in route- / ", error.message);
            }
        }
    },
    {
        method: "GET",
        path: "/count-employees",
        handler: async (req, h) => {
          const totalRows = await employeeModel.count();
          const totalPages = Math.ceil(totalRows/100);
          return totalPages;
        },
    }, 
    {
        method: "PUT",
        path: "/employee/{employeeId}/update-basicInfo",
        handler: async(req, h)=>{
            //Update employee basic info from employee table
            try{
                const {employeeId}=req.params;
                const {first_name="", last_name="", gender="", birth_date, hire_date}=req.payload;
                const birthDate=new Date(birth_date);
                const hireDate=new Date(hire_date);
                const updateData={
                    ...(first_name && {first_name}),
                    ...(last_name && {last_name}),
                    ...(gender && {gender}),
                    ...(birth_date && !isNaN(birth_date) && {birth_date: birthDate}),
                    ...(hire_date && !isNaN(hire_date) && {hire_date: hireDate})
                };
                const [updatedCount]=await employeeModel.update(updateData, {
                    where: {
                        emp_no: parseInt(employeeId)
                    }
                });
                if (updatedCount===0){
                    return h.response({message: "Employee not found or no changes made."}).code(400);
                }
                return h.response({message: "Employee basic info updated successfully."}).code(200);
                // console.log("updateData", updateData);
                // console.log("employeeId", employeeId);
                // console.log(`first name: ${first_name}, last name: ${last_name}, gender: ${gender}, dob: ${birthDate}, hire: ${hireDate}`);
                // return h.response({message: "ok"}).code(200);
            }
            catch(error){
                console.log("Error in update-basicInfo route: ", error.message);
                return h.response({error: "Internal Server Error"}).code(500);
            }
        }
    },
    {
        method: "GET",
        path: "/employee/{employeeId}/details",
        handler: async(req, h)=>{
            //every details of the employee
            try{
                const {employeeId}=req.params;
                //employee basic info
                const basicInfo=await employeeModel.findAll({
                    where: {
                        emp_no: parseInt(employeeId)
                    },
                    raw: true
                });
                //employee titles info
                const titleInfo=await titleModel.findAll({
                    where: {
                        emp_no: parseInt(employeeId)
                    },
                    raw: true
                });
                //employee salary info
                const salaryInfo=await salaryModel.findAll({
                    where: {
                        emp_no: parseInt(employeeId)
                    },
                    raw: true
                });
                //employee dept info
                const deptInfo=await departmentEmployeeModel.findAll({
                    where: {
                        emp_no: parseInt(employeeId)
                    },
                    include: [
                        {
                            model: departmentModel
                        }
                    ]
                });
                const employeeAllInfo={
                    employeeBasic: basicInfo,
                    employeeTitle: titleInfo,
                    employeeSalary: salaryInfo,
                    employeeDept: deptInfo
                };
                return employeeAllInfo;
            }
            catch(error){
                console.log("Error in update-basicInfo route: ", error.message);
            }
        }
    }])
  }
  catch(error){
    console.log("Some error occurred: ", error.message);
  }
}

init();
