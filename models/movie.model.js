const mongoose = require("mongoose");
const slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên phim không được để trống'],
    }, // Tên phim
    category: String, // Thể loại phim
    position: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'active'
    },
    avatar: String, // Poster phim
    duration: String, // Thời lượng phim (VD: "120 phút")
    director: String, // Đạo diễn
    cast: String, // Diễn viên
    language: String, // Ngôn ngữ
    releaseDate: Date, // Ngày công chiếu
    ageRating: String, // Phân loại độ tuổi (P, T13, T16, T18, C)
    trailer: String, // Link trailer YouTube
    description: String, // Mô tả phim
    images: Array, // Danh sách ảnh
    
    // Lịch chiếu
    showtimes: [{
      cinema: String, // Tên rạp/địa điểm
      date: Date, // Ngày chiếu
      times: [String], // Các suất chiếu ["10:00", "14:00", "18:00"]
      format: String // Định dạng (2D, 3D, IMAX)
    }],
    
    // Giá vé theo loại ghế
    prices: {
      standard: Number, // Ghế thường
      vip: Number, // Ghế VIP
      couple: Number // Ghế đôi
    },
    
    // Sơ đồ ghế mặc định (có thể tùy chỉnh theo từng rạp)
    seatMap: {
      rows: Number, // Số hàng ghế
      columns: Number, // Số cột ghế
      vipRows: [String], // Các hàng VIP ["V1", "V2"]
      coupleRows: [String], // Các hàng ghế đôi ["C1"]
      bookedSeats: [String] // Ghế đã đặt ["A1", "A2"]
    },
    
    createdBy: String,
    updatedBy: String,
    slug: {
      type: String,
      slug: "name",
      unique: true
    },
    deleted: {
      type: Boolean,
      default: false
    },
    deletedBy: String,
    deletedAt: Date
  },
  {
    timestamps: true,
  }
);

const Movie = mongoose.model('Movie', schema, "movies");

module.exports = Movie;