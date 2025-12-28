const router = require('express').Router();
const multer = require('multer');

const cloudinaryHelper = require("../../helpers/cloudinary.helper");
const movieController = require("../../controllers/admin/movie.controller");

const upload = multer({ storage: cloudinaryHelper.storage });

router.get('/list', movieController.list);

router.get('/create', movieController.create);

router.post(
  '/create', 
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  movieController.createPost
);

router.get('/edit/:id', movieController.edit);

router.patch(
  '/edit/:id', 
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]), 
  movieController.editPatch
);

router.patch('/delete/:id', movieController.deletePatch);

router.patch('/change-multi', movieController.changeMultiPatch);

module.exports = router;