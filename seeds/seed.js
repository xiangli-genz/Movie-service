require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify'); // Đảm bảo đã npm install slugify

const AccountAdmin = require('../models/account-admin.model');
const Category = require('../models/category.model');
const Cinema = require('../models/cinema.model');
const Movie = require('../models/movie.model');
const User = require('../models/user.model');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log("Connected to database");

    // XÓA DỮ LIỆU CŨ
    await AccountAdmin.deleteMany({});
    await Category.deleteMany({});
    await Cinema.deleteMany({});
    await Movie.deleteMany({});
    await User.deleteMany({});
    console.log("Cleared old data");

    // 1. TẠO ADMIN
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    const admin = await AccountAdmin.create({
      fullName: "Administrator",
      email: "admin@cinema.com",
      phone: "0867347102",
      password: hashedPassword,
      status: "active"
    });
    console.log("Created admin account");

    // 2. TẠO DANH MỤC + TỰ ĐỘNG TẠO SLUG (ĐÂY LÀ CHỖ QUAN TRỌ)
    const categoryData = [
      { name: "Phim Đang Chiếu", position: 1 },
      { name: "Phim Sắp Chiếu", position: 2 },
      { name: "Phim Hành Động", position: 3 },
      { name: "Phim Kinh Dị",     position: 4 },
      { name: "Phim Hoạt Hình",  position: 5 }
    ];

    const categories = await Category.insertMany(
      categoryData.map(cat => ({
        ...cat,
        slug: slugify(cat.name, { lower: true, strict: true }), // sinh slug tự động
        status: "active",
        createdBy: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );
    console.log("Created categories");

    // 3. TẠO RẠP CHIẾU
    const cinemas = await Cinema.insertMany([
      // ... giữ nguyên phần cinemas như cũ của bạn
      // (mình rút gọn để ngắn, bạn copy nguyên phần cinemas cũ vào đây là được)
      {
        name: "CGV Vincom Bà Triệu",
        address: "Tầng 5-6, TTTM Vincom, 191 Bà Triệu, Hai Bà Trưng, Hà Nội",
        city: "Hà Nội",
        phone: "1900 6017",
        screens: [/* ... */],
        combos: [/* ... */],
        status: "active"
      },
      // các rạp khác...
    ]);
    console.log("Created cinemas");

    // 4. TẠO PHIM (giữ nguyên, chỉ sửa category thành ObjectId thật)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await Movie.insertMany([
      {
        name: "Avatar: The Way of Water",
        category: categories[0]._id,           // Phim Đang Chiếu
        position: 1,
        status: "active",
        avatar: "https://example.com/avatar2.jpg",
        duration: "192 phút",
        director: "James Cameron",
        cast: "Sam Worthington, Zoe Saldana, Sigourney Weaver",
        language: "Tiếng Anh - Phụ đề Việt",
        releaseDate: new Date("2024-12-15"),
        ageRating: "T13",
        trailer: "https://www.youtube.com/watch?v=d9MyW72ELq0",
        description: "Jake Sully và gia đình Na'vi phải chạy trốn...",
        // showtimes, prices, seatMap... giữ nguyên
        createdBy: admin._id,
        updatedBy: admin._id
      },
      {
        name: "Spider-Man: No Way Home",
        category: categories[2]._id,           // Phim Hành Động
        position: 2,
        status: "active",
        // ... các field khác giữ nguyên
        createdBy: admin._id,
        updatedBy: admin._id
      },
      {
        name: "The Conjuring: The Devil Made Me Do It",
        category: categories[3]._id,          // Phim Kinh Dị
        // ...
      },
      {
        name: "Doraemon: Nobita và Bản Giao Hưởng Địa Cầu",
        category: categories[4]._id,           // Phim Hoạt Hình
        // ...
      },
      {
        name: "The Batman",
        category: categories[1]._id,           // Phim Sắp Chiếu
        // ...
      }
    ]);
    console.log("Created movies");

    // 5. TẠO USER MẪU
    const userPassword = await bcrypt.hash("User@123", salt);
    await User.create({
      fullName: "Nguyễn Văn A",
      email: "user@example.com",
      phone: "0123456789",
      password: userPassword,
      status: "active"
    });
    console.log("Created sample user");

    console.log("\nSEEDING COMPLETED SUCCESSFULLY!");
    console.log("Admin → admin@cinema.com / Admin@123");
    console.log("User  → user@example.com / User@123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error.message);
    process.exit(1);
  }
}

seedDatabase();