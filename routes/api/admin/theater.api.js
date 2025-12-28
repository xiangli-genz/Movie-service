const router = require('express').Router();
const Cinema = require('../../../models/cinema.model');

// GET: Lấy danh sách rạp (API JSON)
router.get('/', async (req, res) => {
  try {
    const theaters = await Cinema.find({ status: "active" }).select('_id name');
    res.json({
      code: "success",
      data: theaters
    });
  } catch (error) {
    res.status(500).json({
      code: "error",
      message: error.message
    });
  }
});

module.exports = router;
