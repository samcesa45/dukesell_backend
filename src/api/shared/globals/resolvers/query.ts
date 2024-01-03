/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import Product from '../../../features/products/models/product'
import User from '../../../features/user/models/user'

const Query = {
  user: (args, { userId }) => {
    // check if user logged in

    if (!userId) throw new Error('Please log in')

    return User.findById(userId)
      .populate({
        path: 'products',
        options: { sort: { createdAt: 'desc' } },
        populate: { path: 'user' }
      })
      .populate({ path: 'carts', populate: { path: 'product' } })
      .populate({
        path: 'orders',
        options: { sort: { createdAt: 'desc' } },
        populate: { path: 'items', populate: { path: 'product' } }
      })
  },
  users: () => {
    return User.find({})
      .populate({
        path: 'products',
        populate: { path: 'user' }
      })
      .populate({ path: 'carts', populate: { path: 'product' } })
  },
  product: (args) => {
    return Product.findById(args.id).populate({
      path: 'user',
      populate: { path: 'products' }
    })
  },
  products: () => {
    return Product.find()
      .populate({
        path: 'user',
        populate: { path: 'products' }
      })
      .sort({ createdAt: 'desc' })
  }
}

export default Query
