const express = require('express');
const router = express.Router();
const {
  getAllWatches,
  getWatch,
  createWatch,
  updateWatch,
  deleteWatch,
  updateStock,
  getWatchStatistics,
  getFeaturedWatches,
  addImage,
  removeImage
} = require('../controllers/watchController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getAllWatches)
  .post(protect, authorize('admin'), createWatch);

router.get('/featured', getFeaturedWatches);
router.get('/statistics', protect, authorize('admin'), getWatchStatistics);

router.route('/:id')
  .get(getWatch)
  .put(protect, authorize('admin'), updateWatch)
  .delete(protect, authorize('admin'), deleteWatch);

router.put('/:id/stock', protect, authorize('admin'), updateStock);
router.post('/:id/images', protect, authorize('admin'), addImage);
router.delete('/:id/images', protect, authorize('admin'), removeImage);

module.exports = router;