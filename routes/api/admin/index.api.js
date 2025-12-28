const router = require('express').Router();
const movieApi = require('./movie.api');
const theaterApi = require('./theater.api');
const categoryApi = require('./category.api');

router.use('/movies', movieApi);
router.use('/theaters', theaterApi);
router.use('/categories', categoryApi);

module.exports = router;
