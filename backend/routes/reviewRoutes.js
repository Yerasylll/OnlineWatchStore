const express = require('express');
const router = express.Router();
const {
  createReview,
  getWatchReviews,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.route('/watch/:watchId')
  .get(getWatchReviews)
  .post(protect, createReview);

router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;