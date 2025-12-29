const router = require('express').Router();
const Movie = require('../../../models/movie.model');
const moment = require('moment');

// GET: Lấy danh sách phim active 
router.get('/', async (req, res) => {
  try {
    const find = {
      deleted: false,
      status: "active"
    };

    // Filter by category if provided
    if(req.query.category) {
      find.category = req.query.category;
    }

    // Search by keyword
    if(req.query.keyword) {
      const keyword = req.query.keyword;
      const keywordRegex = new RegExp(keyword, 'i');
      find.$or = [
        { name: keywordRegex },
        { description: keywordRegex }
      ];
    }

    // Get movies from database
    const movies = await Movie.find(find)
      .populate('category')
      .sort({ createdAt: -1 });

    // Format response data
    const formattedMovies = movies.map(movie => ({
      _id: movie._id,
      name: movie.name,
      slug: movie.slug,
      avatar: movie.avatar,
      description: movie.description,
      releaseDate: movie.releaseDate,
      releaseDateFormat: moment(movie.releaseDate).format("DD/MM/YYYY"),
      duration: movie.duration,
      rated: movie.rated,
      category: movie.category,
      price: movie.price,
      status: movie.status
    }));

    // Handle sorting
    let sortedMovies = formattedMovies;
    const sort = req.query.sort || 'latest';

    switch(sort) {
      case 'price-asc':
        sortedMovies = formattedMovies.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        sortedMovies = formattedMovies.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        sortedMovies = formattedMovies.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'latest':
      default:
        sortedMovies = formattedMovies.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    }

    res.json({
      code: "success",
      message: 'Success',
      data: sortedMovies
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      code: "error",
      message: 'Internal Server Error',
      data: []
    });
  }
});

// GET: Lấy thông tin ghế đã đặt (API từ controller getBookedSeats)
router.get('/booked-seats/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { cinema, date, time } = req.query;

    if (!movieId || !cinema || !date || !time) {
      return res.json({
        code: "error",
        message: "Thiếu thông tin cần thiết"
      });
    }
    
    // Tạm thời trả về mảng trống (sẽ update sau khi có Booking model)
    const bookedSeats = [];


    res.json({
      code: "success",
      bookedSeats: bookedSeats
    });

  } catch (error) {
    console.error("Error getting booked seats:", error);
    res.json({
      code: "error",
      message: "Lỗi khi lấy thông tin ghế"
    });
  }
});

// GET: Lấy chi tiết phim theo id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const movie = await Movie.findOne({ _id: id, deleted: false }).populate('category');

    if (!movie) {
      return res.status(404).json({ code: 'error', message: 'Phim không tồn tại' });
    }

    const formatted = {
      _id: movie._id,
      name: movie.name,
      slug: movie.slug,
      avatar: movie.avatar,
      description: movie.description,
      releaseDate: movie.releaseDate,
      releaseDateFormat: movie.releaseDate ? moment(movie.releaseDate).format('DD/MM/YYYY') : null,
      duration: movie.duration,
      rated: movie.rated,
      ageRating: movie.ageRating,
      language: movie.language,
      director: movie.director,
      category: movie.category,
      prices: movie.prices,
      showtimes: movie.showtimes || [],
      status: movie.status
    };

    res.json({ code: 'success', data: formatted });
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    res.status(500).json({ code: 'error', message: 'Lỗi server' });
  }
});
// GET: Lấy thông tin ghế đã đặt từ Booking Service
router.get('/booked-seats/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { cinema, date, time } = req.query;

    if (!movieId || !cinema || !date || !time) {
      return res.json({
        code: "error",
        message: "Thiếu thông tin cần thiết"
      });
    }

    // ✅ GỌI BOOKING SERVICE ĐỂ LẤY GHẾ ĐÃ ĐẶT
    const axios = require('axios');
    const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
    
    const response = await axios.get(
      `${BOOKING_SERVICE_URL}/api/bookings/seats/booked`,
      {
        params: { movieId, cinema, date, time },
        timeout: 5000
      }
    );

    if (response.data.code === 'success') {
      return res.json({
        code: "success",
        bookedSeats: response.data.data.bookedSeats
      });
    }

    return res.json({
      code: "error",
      message: "Không thể lấy thông tin ghế"
    });

  } catch (error) {
    console.error("Error getting booked seats:", error);
    res.json({
      code: "success", // ✅ Vẫn trả success, nhưng mảng rỗng
      bookedSeats: []
    });
  }
});
module.exports = router;
