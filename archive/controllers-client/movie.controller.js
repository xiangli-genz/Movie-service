const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
const Cinema = require("../../models/cinema.model");
// const Booking = require("../../models/booking.model");
const moment = require("moment");

module.exports.detail = async (req, res) => {
  try {
    const slug = req.params.slug;

    const movieDetail = await Movie.findOne({
      slug: slug,
      status: "active",
      deleted: false
    });

    if(movieDetail) {
      // Breadcrumb
      const breadcrumb = {
        image: movieDetail.avatar,
        title: movieDetail.name,
        list: [
          {
            link: "/",
            title: "Trang Chủ"
          }
        ]
      };

      const category = await Category.findOne({
        _id: movieDetail.category,
        deleted: false,
        status: "active"
      });

      if(category) {
        if(category.parent) {
          const parentCategory = await Category.findOne({
            _id: category.parent,
            deleted: false,
            status: "active"
          });

          if(parentCategory) {
            breadcrumb.list.push({
              link: `/category/${parentCategory.slug}`,
              title: parentCategory.name
            });
          }
        }

        breadcrumb.list.push({
          link: `/category/${category.slug}`,
          title: category.name,
        });
      }

      breadcrumb.list.push({
        link: `/movie/detail/${slug}`,
        title: movieDetail.name
      });

      // Format dữ liệu
      movieDetail.releaseDateFormat = moment(movieDetail.releaseDate).format("DD/MM/YYYY");

      // Lấy danh sách rạp từ showtimes của phim
      const cinemaNames = [...new Set(movieDetail.showtimes.map(st => st.cinema))];
      const cinemaList = await Cinema.find({ 
        name: { $in: cinemaNames },
        status: "active" 
      });

      // Format lịch chiếu - Group by cinema and date
      const showtimesGrouped = {};
      
      if(movieDetail.showtimes && movieDetail.showtimes.length > 0) {
        movieDetail.showtimes.forEach(showtime => {
          const cinema = showtime.cinema;
          const dateStr = moment(showtime.date).format("YYYY-MM-DD");
          
          if (!showtimesGrouped[cinema]) {
            showtimesGrouped[cinema] = {};
          }
          
          if (!showtimesGrouped[cinema][dateStr]) {
            showtimesGrouped[cinema][dateStr] = {
              date: showtime.date,
              dateFormat: moment(showtime.date).format("DD/MM/YYYY"),
              dayOfWeek: moment(showtime.date).format("dddd"),
              format: showtime.format,
              times: []
            };
          }
          
          // Add times
          if (showtime.times && Array.isArray(showtime.times)) {
            showtimesGrouped[cinema][dateStr].times.push(...showtime.times);
          }
        });
      }

      res.render("client/pages/movie-detail", {
        pageTitle: movieDetail.name,
        breadcrumb: breadcrumb,
        movieDetail: movieDetail,
        cinemaList: cinemaList,
        showtimesGrouped: showtimesGrouped
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error in movie detail:", error);
    res.redirect("/");
  }
};

module.exports.getBookedSeats = async (req, res) => {
  try {
    const { movieId, cinema, date, time } = req.query;

    if (!movieId || !cinema || !date || !time) {
      return res.json({
        code: "error",
        message: "Thiếu thông tin cần thiết"
      });
    }

    // Parse date
    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    const bookings = await Booking.find({
      movieId: movieId,
      cinema: cinema,
      "showtime.date": {
        $gte: startOfDay,
        $lte: endOfDay
      },
      "showtime.time": time,
      status: { $in: ["initial", "confirmed"] },
      deleted: false
    });

    const bookedSeats = [];
    bookings.forEach(booking => {
      if (booking.seats && booking.seats.length > 0) {
        booking.seats.forEach(seat => {
          bookedSeats.push(seat.seatNumber);
        });
      }
    });

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
};