const router = require("express").Router();
const movieController = require("../../controllers/client/movie.controller");

// Chi tiết phim
router.get('/detail/:slug', movieController.detail);

// Lấy danh sách ghế đã đặt
router.get('/booked-seats', movieController.getBookedSeats);

module.exports = router;