const router = require('express').Router();
const moment = require('moment');
const Movie = require('../../../models/movie.model');

const { default: slugify } = require('slugify');
const multer = require('multer');
// const cloudinaryHelper = require('../../../helpers/cloudinary.helper');

// const upload = multer({ storage: cloudinaryHelper.storage });
const upload = require('../../../helpers/cloudinary.helper');

// GET: Lấy danh sách phim (API JSON)
router.get('/', async (req, res) => {
  try {
    const find = {
      deleted: false
    };

    if(req.query.status) {
      find.status = req.query.status;
    }

    if(req.query.createdBy) {
      find.createdBy = req.query.createdBy;
    }

    const dateFiler = {};

    if(req.query.startDate) {
      const startDate = moment(req.query.startDate).startOf("date").toDate();
      dateFiler.$gte = startDate;
    }

    if(req.query.endDate) {
      const endDate = moment(req.query.endDate).endOf("date").toDate();
      dateFiler.$lte = endDate;
    }

    if(Object.keys(dateFiler).length > 0) {
      find.createdAt = dateFiler;
    }

    if(req.query.keyword) {
      const keyword = slugify(req.query.keyword, {
        lower: true
      });
      const keywordRegex = new RegExp(keyword);
      find.slug = keywordRegex;
    }

    // PHÂN TRANG
    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const totalRecords = await Movie.countDocuments(find);
    const totalPages = Math.ceil(totalRecords / limit);

    const movieList = await Movie
      .find(find)
      .sort({
        position: "desc"
      })
      .skip(skip)
      .limit(limit);

    // Format dữ liệu
    for (const item of movieList) {
      item.createdByFullName = item.createdBy ? String(item.createdBy) : "-";
      item.updatedByFullName = item.updatedBy ? String(item.updatedBy) : "-";

      item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
      item.updatedAtFormat = moment(item.updatedAt).format("HH:mm - DD/MM/YYYY");
      
      if(item.releaseDate) {
        item.releaseDateFormat = moment(item.releaseDate).format("DD/MM/YYYY");
      } else {
        item.releaseDateFormat = "--";
      }
    }

    res.json({
      code: "success",
      data: movieList,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      code: "error",
      message: "Lỗi khi lấy danh sách phim"
    });
  }
});

// GET: Lấy chi tiết phim (API JSON)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const movie = await Movie.findOne({
      _id: id,
      deleted: false
    });

    if (!movie) {
      return res.status(404).json({
        code: "error",
        message: "Phim không tìm thấy"
      });
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// DELETE: Xóa phim (API JSON)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    await Movie.deleteOne({
      _id: id
    });

    res.json({
      code: "success",
      message: "Xóa phim thành công!"
    });
  } catch (error) {
    res.status(500).json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// POST: Tạo phim mới (API JSON)
router.post('/', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.json({
        code: "error",
        message: "Tên phim không được để trống"
      });
    }

    req.body.name = req.body.name.trim();
    
    // Tạo slug
    req.body.slug = slugify(req.body.name, { lower: true, strict: true });
    
    // Check trùng slug
    let count = 0;
    let baseSlug = req.body.slug;
    while (await Movie.findOne({ slug: req.body.slug })) {
      count++;
      req.body.slug = `${baseSlug}-${count}`;
    }
    
    if(req.body.position) {
      req.body.position = parseInt(req.body.position);
    } else {
      const totalRecord = await Movie.countDocuments({});
      req.body.position = totalRecord + 1;
    }

    if (!req.body.status) {
      req.body.status = 'active';
    }

    req.body.createdBy = req.account?.id || null;
    req.body.updatedBy = req.account?.id || null;
    
    if(req.files && req.files.avatar) {
      req.body.avatar = req.files.avatar[0].path;
    }

    // Xử lý giá vé
    req.body.prices = {
      standard: parseInt(req.body.priceStandard) || 50000,
      vip: parseInt(req.body.priceVip) || 60000,
      couple: parseInt(req.body.priceCouple) || 110000
    };

    // Xử lý ngày phát hành
    req.body.releaseDate = req.body.releaseDate ? new Date(req.body.releaseDate) : null;

    // Xử lý lịch chiếu
    if(req.body.showtimes) {
      if(typeof req.body.showtimes === 'string') {
        try {
          req.body.showtimes = JSON.parse(req.body.showtimes);
        } catch (e) {
          req.body.showtimes = [];
        }
      }
    } else {
      req.body.showtimes = [];
    }

    if(req.files && req.files.images && req.files.images.length > 0) {
      req.body.images = req.files.images.map(file => file.path);
    }

    const newRecord = new Movie(req.body);
    await newRecord.save();

    res.json({
      code: "success",
      message: "Thêm phim mới thành công!",
      data: newRecord
    });
  } catch (error) {
    console.error("Error creating movie:", error);
    let message = "Có lỗi xảy ra khi tạo phim";
    if (error.errors && error.errors.name) {
      message = error.errors.name.message;
    } else if (error.message) {
      message = error.message;
    }
    res.status(500).json({
      code: "error",
      message: message
    });
  }
});

// PUT: Cập nhật phim (API JSON)
router.put('/:id', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const id = req.params.id;
    
    const movie = await Movie.findOne({
      _id: id,
      deleted: false
    });

    if (!movie) {
      return res.status(404).json({
        code: "error",
        message: "Phim không tìm thấy"
      });
    }

    // Cập nhật tên và slug nếu tên thay đổi
    if (req.body.name && req.body.name.trim()) {
      req.body.name = req.body.name.trim();
      if (req.body.name !== movie.name) {
        req.body.slug = slugify(req.body.name, { lower: true, strict: true });
        
        // Check trùng slug
        let count = 0;
        let baseSlug = req.body.slug;
        while (await Movie.findOne({ slug: req.body.slug, _id: { $ne: id } })) {
          count++;
          req.body.slug = `${baseSlug}-${count}`;
        }
      }
    }

    // Cập nhật các trường khác
    if (req.body.position) {
      req.body.position = parseInt(req.body.position);
    }

    if (!req.body.status) {
      req.body.status = 'active';
    }

    req.body.updatedBy = req.account?.id || null;
    req.body.updatedAt = new Date();

    // Cập nhật avatar nếu có file mới
    if (req.files && req.files.avatar) {
      req.body.avatar = req.files.avatar[0].path;
    }

    // Xử lý giá vé
    if (req.body.priceStandard || req.body.priceVip || req.body.priceCouple) {
      req.body.prices = {
        standard: parseInt(req.body.priceStandard) || movie.prices?.standard || 50000,
        vip: parseInt(req.body.priceVip) || movie.prices?.vip || 60000,
        couple: parseInt(req.body.priceCouple) || movie.prices?.couple || 110000
      };
    }

    // Xử lý ngày phát hành
    if (req.body.releaseDate) {
      req.body.releaseDate = new Date(req.body.releaseDate);
    }

    // Xử lý lịch chiếu
    if (req.body.showtimes) {
      if (typeof req.body.showtimes === 'string') {
        try {
          req.body.showtimes = JSON.parse(req.body.showtimes);
        } catch (e) {
          req.body.showtimes = movie.showtimes || [];
        }
      }
    }

    // Cập nhật images nếu có file mới
    if (req.files && req.files.images && req.files.images.length > 0) {
      req.body.images = req.files.images.map(file => file.path);
    }

    // Cập nhật tất cả các trường
    Object.assign(movie, req.body);
    await movie.save();

    res.json({
      code: "success",
      message: "Cập nhật phim thành công!",
      data: movie
    });
  } catch (error) {
    console.error("Error updating movie:", error);
    let message = "Có lỗi xảy ra khi cập nhật phim";
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        if (error.errors[key].message) {
          message = error.errors[key].message;
        }
      });
    } else if (error.message) {
      message = error.message;
    }
    res.status(500).json({
      code: "error",
      message: message
    });
  }
});



module.exports = router;
