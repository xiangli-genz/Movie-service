const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: String, // Tên rạp
    address: String, // Địa chỉ
    city: String, // Thành phố
    phone: String,
    
    // Danh sách phòng chiếu
    screens: [{
      name: String, // Tên phòng (VD: "Phòng 1", "IMAX")
      capacity: Number, // Sức chứa
      format: [String], // Các định dạng hỗ trợ ["2D", "3D", "IMAX"]
      seatMap: {
        rows: Number,
        columns: Number,
        vipRows: [String],
        coupleRows: [String]
      }
    }],
    
    // Combo bắp nước
    combos: [{
      name: String,
      description: String,
      price: Number,
      image: String
    }],
    
    status: String, // active, inactive
  },
  {
    timestamps: true,
  }
);

const Cinema = mongoose.model('Cinema', schema, "cinemas");

module.exports = Cinema;