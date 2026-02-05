const express = require('express');
const router = express.Router();
const {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllUsers,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.put('/profile', protect, updateProfile);
router.post('/address', protect, addAddress);
router.put('/address/:addressId', protect, updateAddress);
router.delete('/address/:addressId', protect, deleteAddress);
router.get('/all', protect, authorize('admin'), getAllUsers);
router.delete('/:userId', protect, authorize('admin'), deleteUser);

module.exports = router;