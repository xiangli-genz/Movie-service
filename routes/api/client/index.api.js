const router = require('express').Router();
const movieApi = require('./movie.api');

router.use('/movies', movieApi);

module.exports = router;
