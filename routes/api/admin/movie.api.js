const router = require('express').Router();
const moment = require('moment');
const Movie = require('../../../models/movie.model');
const Category = require('../../../models/category.model');
const Cinema = require('../../../models/cinema.model');
const { default: slugify } = require('slugify');
const multer = require('multer');
const upload = require('../../../helpers/cloudinary.helper');

// ===== [GET] /api/catalog/admin/movies - Danh sách phim (Admin) =====
router.get('/', async (req, res) => {
  try {
    const find = {
      deleted: false
    };

    // Filter by status
    if(req.query.status) {
      find.status = req.query.status;
    }

    // Filter by createdBy
    if(req.query.createdBy) {
      find.createdBy = req.query.createdBy;
    }

    // Filter by date
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

    // Search by keyword
    if(req.query.keyword) {
      const keyword = slugify(req.query.keyword, { lower: true });
      const keywordRegex = new RegExp(keyword);
      find.slug = keywordRegex;
    }

    // Pagination
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const totalRecords = await Movie.countDocuments(find);
    const totalPages = Math.ceil(totalRecords / limit);

    const movieList = await Movie
      .find(find)
      .sort({ position: "desc" })
      .skip(skip)
      .limit(limit);

    // Format dates
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
      data: {
        movies: movieList,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalRecords: totalRecords,
          limit: limit
        }
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

// ===== [GET] /api/catalog/admin/movies/:id - Chi tiết phim =====
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

    // Format date
    if (movie.releaseDate) {
      movie.releaseDateFormat = moment(movie.releaseDate).format("YYYY-MM-DD");
    }

    res.json({
      code: "success",
      data: { movie }
    });
  } catch (error) {
    res.status(500).json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// ===== [POST] /api/catalog/admin/movies - Tạo phim mới =====
router.post('/', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    console.log('=== CREATING MOVIE ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({
        code: "error",
        message: "Tên phim không được để trống"
      });
    }

    req.body.name = req.body.name.trim();
    
    // Generate slug
    req.body.slug = slugify(req.body.name, { lower: true, strict: true });
    
    // Check duplicate slug
    let count = 0;
    let baseSlug = req.body.slug;
    while (await Movie.findOne({ slug: req.body.slug, deleted: false })) {
      count++;
      req.body.slug = `${baseSlug}-${count}`;
    }
    
    // Set position
    if(req.body.position) {
      req.body.position = parseInt(req.body.position);
    } else {
      const totalRecord = await Movie.countDocuments({ deleted: false });
      req.body.position = totalRecord + 1;
    }

    // Set status
    if (!req.body.status) {
      req.body.status = 'active';
    }

    // Set createdBy/updatedBy
    req.body.createdBy = req.account?.id || req.body.createdBy || null;
    req.body.updatedBy = req.account?.id || req.body.updatedBy || null;
    
    // Handle avatar upload
    if(req.files && req.files.avatar && req.files.avatar[0]) {
      req.body.avatar = req.files.avatar[0].path;
    }

    // Handle ticket prices
    req.body.prices = {
      standard: parseInt(req.body.priceStandard) || 50000,
      vip: parseInt(req.body.priceVip) || 70000,
      couple: parseInt(req.body.priceCouple) || 130000
    };

    // Handle release date
    if (req.body.releaseDate) {
      req.body.releaseDate = new Date(req.body.releaseDate);
    }

    // Handle showtimes
    if(req.body.showtimes) {
      if(typeof req.body.showtimes === 'string') {
        try {
          req.body.showtimes = JSON.parse(req.body.showtimes);
        } catch (e) {
          console.error('Error parsing showtimes:', e);
          req.body.showtimes = [];
        }
      }
      
      // Validate và format showtimes
      if (Array.isArray(req.body.showtimes)) {
        req.body.showtimes = req.body.showtimes.map(st => ({
          cinema: st.cinema,
          date: new Date(st.date),
          times: Array.isArray(st.times) ? st.times : [],
          format: st.format || '2D'
        }));
      }
    } else {
      req.body.showtimes = [];
    }

    // Handle images
    if(req.files && req.files.images && req.files.images.length > 0) {
      req.body.images = req.files.images.map(file => file.path);
    }

    // Create movie
    const newRecord = new Movie(req.body);
    await newRecord.save();

    console.log('✅ Movie created:', newRecord._id, newRecord.name);

    res.status(201).json({
      code: "success",
      message: "Thêm phim mới thành công!",
      data: { movie: newRecord }
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

// ===== [PUT] /api/catalog/admin/movies/:id - Cập nhật phim =====
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

    console.log('=== UPDATING MOVIE ===');
    console.log('Movie ID:', id);
    console.log('Body:', req.body);

    // Update name and slug if name changed
    if (req.body.name && req.body.name.trim()) {
      req.body.name = req.body.name.trim();
      if (req.body.name !== movie.name) {
        req.body.slug = slugify(req.body.name, { lower: true, strict: true });
        
        // Check duplicate slug
        let count = 0;
        let baseSlug = req.body.slug;
        while (await Movie.findOne({ slug: req.body.slug, _id: { $ne: id }, deleted: false })) {
          count++;
          req.body.slug = `${baseSlug}-${count}`;
        }
      }
    }

    // Update position
    if (req.body.position) {
      req.body.position = parseInt(req.body.position);
    }

    // Update status
    if (!req.body.status) {
      req.body.status = 'active';
    }

    // Update updatedBy
    req.body.updatedBy = req.account?.id || req.body.updatedBy || null;
    req.body.updatedAt = new Date();

    // Update avatar if new file uploaded
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      req.body.avatar = req.files.avatar[0].path;
    }

    // Update prices
    if (req.body.priceStandard || req.body.priceVip || req.body.priceCouple) {
      req.body.prices = {
        standard: parseInt(req.body.priceStandard) || movie.prices?.standard || 50000,
        vip: parseInt(req.body.priceVip) || movie.prices?.vip || 70000,
        couple: parseInt(req.body.priceCouple) || movie.prices?.couple || 130000
      };
    }

    // Update release date
    if (req.body.releaseDate) {
      req.body.releaseDate = new Date(req.body.releaseDate);
    }

    // Update showtimes
    if (req.body.showtimes) {
      if (typeof req.body.showtimes === 'string') {
        try {
          req.body.showtimes = JSON.parse(req.body.showtimes);
        } catch (e) {
          console.error('Error parsing showtimes:', e);
          req.body.showtimes = movie.showtimes || [];
        }
      }
      
      if (Array.isArray(req.body.showtimes)) {
        req.body.showtimes = req.body.showtimes.map(st => ({
          cinema: st.cinema,
          date: new Date(st.date),
          times: Array.isArray(st.times) ? st.times : [],
          format: st.format || '2D'
        }));
      }
    }

    // Update images if new files uploaded
    if (req.files && req.files.images && req.files.images.length > 0) {
      req.body.images = req.files.images.map(file => file.path);
    }

    // Update all fields
    Object.assign(movie, req.body);
    await movie.save();

    console.log('✅ Movie updated:', movie._id, movie.name);

    res.json({
      code: "success",
      message: "Cập nhật phim thành công!",
      data: { movie }
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

// ===== [DELETE] /api/catalog/admin/movies/:id - Xóa phim =====
router.delete('/:id', async (req, res) => {
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
    
    // Soft delete
    movie.deleted = true;
    movie.deletedAt = new Date();
    movie.deletedBy = req.account?.id || null;
    await movie.save();

    console.log('✅ Movie deleted:', movie._id, movie.name);

    res.json({
      code: "success",
      message: "Xóa phim thành công!"
    });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// ===== [PATCH] /api/catalog/admin/movies/change-multi - Thay đổi nhiều =====
router.patch('/change-multi', async (req, res) => {
  try {
    const { option, ids } = req.body;

    if (!option || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: "error",
        message: "Thông tin không hợp lệ"
      });
    }

    let updateData = {};
    
    switch (option) {
      case "active":
      case "inactive":
        updateData = { status: option };
        await Movie.updateMany(
          { _id: { $in: ids }, deleted: false },
          updateData
        );
        res.json({
          code: "success",
          message: "Đổi trạng thái thành công!"
        });
        break;
        
      case "delete":
        updateData = { 
          deleted: true, 
          deletedAt: new Date(),
          deletedBy: req.account?.id || null
        };
        await Movie.updateMany(
          { _id: { $in: ids }, deleted: false },
          updateData
        );
        res.json({
          code: "success",
          message: "Xóa thành công!"
        });
        break;
        
      default:
        res.status(400).json({
          code: "error",
          message: "Option không hợp lệ"
        });
    }
  } catch (error) {
    console.error('Error in change multi:', error);
    res.status(500).json({
      code: "error",
      message: "Id không tồn tại trong hệ thống!"
    });
  }
});

module.exports = router;