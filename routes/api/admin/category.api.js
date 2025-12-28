const router = require('express').Router();
const moment = require("moment");
const slugify = require('slugify');
const Category = require("../../../models/category.model");
const categoryHelper = require("../../../helpers/category.helper");

// GET: Lấy danh sách danh mục (API JSON)
router.get('/', async (req, res) => {
  try {
    const find = {
      deleted: false
    };

    // Lọc theo trạng thái
    if(req.query.status) {
      find.status = req.query.status;
    }

    // Lọc theo người tạo
    if(req.query.createdBy) {
      find.createdBy = req.query.createdBy;
    }

    // Lọc theo ngày tạo
    const dateFilter = {};
    if(req.query.startDate) {
      const startDate = moment(req.query.startDate).startOf("date").toDate();
      dateFilter.$gte = startDate;
    }

    if(req.query.endDate) {
      const endDate = moment(req.query.endDate).endOf("date").toDate();
      dateFilter.$lte = endDate;
    }

    if(Object.keys(dateFilter).length > 0) {
      find.createdAt = dateFilter;
    }

    // Tìm kiếm
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

    const totalRecords = await Category.countDocuments(find);
    const totalPages = Math.ceil(totalRecords / limit);

    const categoryList = await Category
      .find(find)
      .sort({
        position: "desc"
      })
      .skip(skip)
      .limit(limit);

    res.json({
      code: "success",
      data: categoryList,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      code: "error",
      message: "Lỗi khi lấy danh sách danh mục"
    });
  }
});

// POST: Tạo danh mục mới
router.post('/', async (req, res) => {
  try {
    if(req.body.position) {
      req.body.position = parseInt(req.body.position);
    } else {
      const totalRecord = await Category.countDocuments({});
      req.body.position = totalRecord + 1;
    }

    req.body.createdBy = req.account ? req.account.id : null;
    req.body.updatedBy = req.account ? req.account.id : null;
    req.body.avatar = req.file ? req.file.path : "";

    const newRecord = new Category(req.body);
    await newRecord.save();

    res.json({
      code: "success",
      message: "Tạo danh mục thành công!",
      data: newRecord
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      code: "error",
      message: error.message || "Lỗi khi tạo danh mục"
    });
  }
});

// PATCH: Cập nhật danh mục
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if(req.body.position) {
      req.body.position = parseInt(req.body.position);
    } else {
      const totalRecord = await Category.countDocuments({});
      req.body.position = totalRecord + 1;
    }

    req.body.updatedBy = req.account ? req.account.id : null;
    if(req.file) {
      req.body.avatar = req.file.path;
    } else {
      delete req.body.avatar;
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if(!updated) {
      return res.json({
        code: "error",
        message: "Id không hợp lệ!"
      });
    }

    res.json({
      code: "success",
      message: "Cập nhật danh mục thành công!",
      data: updated
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// DELETE: Xóa danh mục
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await Category.findByIdAndDelete(id);

    if(!deleted) {
      return res.json({
        code: "error",
        message: "Id không hợp lệ!"
      });
    }

    res.json({
      code: "success",
      message: "Xóa danh mục thành công!"
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

// PATCH: Thay đổi trạng thái hoặc xóa nhiều danh mục
router.patch('/action/change-multi', async (req, res) => {
  try {
    const { option, ids } = req.body;

    if (!option || !Array.isArray(ids) || ids.length === 0) {
      return res.json({
        code: "error",
        message: "Thông tin không hợp lệ"
      });
    }

    switch (option) {
      case "active":
      case "inactive":
        await Category.updateMany({
          _id: { $in: ids }
        }, {
          status: option
        });
        res.json({
          code: "success",
          message: "Đổi trạng thái thành công!"
        });
        break;
      case "delete":
        await Category.deleteMany({
          _id: { $in: ids }
        });
        res.json({
          code: "success",
          message: "Xóa thành công!"
        });
        break;
      default:
        res.json({
          code: "error",
          message: "Option không hợp lệ"
        });
    }
  } catch (error) {
    console.error('Error in change multi:', error);
    res.json({
      code: "error",
      message: "Id không tồn tại trong hệ thống!"
    });
  }
});

module.exports = router;
