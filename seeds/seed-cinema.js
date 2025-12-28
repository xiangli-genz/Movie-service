require('dotenv').config();
const mongoose = require('mongoose');
const Cinema = require('../models/cinema.model');

async function seedCinema() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log("Connected to database");

    // Xóa dữ liệu cũ
    await Cinema.deleteMany({});
    console.log("Cleared old cinema data");

    // Tạo dữ liệu rạp
    const cinemas = [
      {
        name: "CGV - Tân Bình",
        address: "16 Thành Thái, Tân Bình, TP.HCM",
        city: "Ho Chi Minh",
        phone: "0283625858",
        status: "active",
        screens: [
          {
            name: "Phòng 1",
            capacity: 150,
            format: ["2D", "3D"],
            seatMap: {
              rows: 10,
              columns: 15,
              vipRows: ["H", "I", "J"],
              coupleRows: ["K"]
            }
          }
        ]
      },
      {
        name: "Lotte Cinema - Q1",
        address: "26 Lê Lợi, Q.1, TP.HCM",
        city: "Ho Chi Minh",
        phone: "0283625858",
        status: "active",
        screens: [
          {
            name: "Phòng 1",
            capacity: 200,
            format: ["2D", "3D", "IMAX"],
            seatMap: {
              rows: 12,
              columns: 18,
              vipRows: ["J", "K", "L"],
              coupleRows: ["M"]
            }
          }
        ]
      },
      {
        name: "Galaxy Cinema - Q3",
        address: "116 Nguyễn Huệ, Q.3, TP.HCM",
        city: "Ho Chi Minh",
        phone: "0283625858",
        status: "active",
        screens: [
          {
            name: "Phòng 1",
            capacity: 180,
            format: ["2D", "4DX"],
            seatMap: {
              rows: 11,
              columns: 16,
              vipRows: ["I", "J", "K"],
              coupleRows: ["L"]
            }
          }
        ]
      }
    ];

    const result = await Cinema.insertMany(cinemas);
    console.log(`Created ${result.length} cinemas`);
    
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedCinema();
