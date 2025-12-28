const router = require('express').Router();
const adminApi = require('./admin/index.api');
const clientApi = require('./client/index.api');

router.use('/admin', adminApi);
router.use('/client', clientApi);

module.exports = router;
