/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import User from '../../../features/user/models/user'
import { type validateLoginRequestBodyType } from './types'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Product from '../../../features/products/models/product'
import Cart from '../../../features/carts/models/cart'
import {
  createCharge,
  createChargeInternetBanking,
  createCustomer,
  retrieveCustomer
} from '../helpers/paymentHelper/omiseHelper'
import OrderItem from '../../../features/orderItems/models/orderItem'
import Order from '../../../features/orders/models/order'
const Mutation = {
  signup: async (args: validateLoginRequestBodyType) => {
    // Trim and lowercase email
    const email = args.requestBody.email.trim().toLowerCase()

    // Check if email already exist in database
    const currentUsers = await User.find({})
    const isEmailExist =
      currentUsers.findIndex((user) => user.email === email) > -1

    if (isEmailExist) {
      throw new Error('Email already exist.')
    }

    // validate password
    if (args.requestBody.password.trim().length < 6) {
      throw new Error('Password must be at least 6 characters.')
    }

    const password = await bcrypt.hash(args.requestBody.password, 10)

    return await User.create({ ...args, email, password })
  },
  login: async (args: validateLoginRequestBodyType) => {
    const { email, password } = args.requestBody

    // Find user in database
    const user = await User.findOne({ email })
      .populate({
        path: 'products',
        populate: { path: 'user' }
      })
      .populate({ path: 'carts', populate: { path: 'product' } })
      .populate({
        path: 'orders',
        options: { sort: { createdAt: 'desc' } },
        populate: { path: 'items', populate: { path: 'product' } }
      })

    if (user == null) throw new Error('Email not found, please sign up.')

    // check if password is correct
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) throw new Error('invalid email or password')

    const token = jwt.sign({ userId: user.id }, process.env.JWT_KEY!, {
      expiresIn: process.env.SESSION_EXP!
    })

    return { user, jwt: token }
  },
  createProduct: async (args, { userId }) => {
    // Check if user logged in
    if (!userId) throw new Error('Please log in.')
    if (!args.description || !args.price || !args.imageUrl) {
      throw new Error('Please provide all required fields.')
    }

    const product = await Product.create({ ...args, user: userId })
    const user = await User.findById(userId)

    if (!user.products) {
      user.products = [product]
    } else {
      user.products.push(product)
    }

    await user.save()

    return await Product.findById(product.id).populate({
      path: 'user',
      populate: { path: 'products' }
    })
  },
  updateProduct: async (args, { userId }) => {
    const { id, name, description, price, imageUrl } = args

    // check if user is logged in
    if (!userId) throw new Error('Please log in.')

    // find product in database
    const product = await Product.findById(id)

    // check if user is the owner of the product
    if (userId !== product?.user?.toString()) {
      throw new Error('You are not authorized.')
    }

    // form updated information
    const updatedInfo = {
      name: !!name ? name : product?.name,
      description: !!description ? description : product?.description,
      price: !!price ? price : product?.price,
      imageUrl: !!imageUrl ? imageUrl : product?.imageUrl
    }

    // Updated product in database
    await Product.findByIdAndUpdate(id, updatedInfo)

    // Find the updated Product
    const updatedProduct = await Product.findById(id).populate({
      path: 'user'
    })
    return updatedProduct
  },
  addToCart: async (args, { userId }) => {
    // id --> productId
    const { id } = args

    if (!userId) throw new Error('Please log in.')

    try {
      // find user who perfomr add to cart  --> from login

      // check if the new addToCart item is already in user.carts
      const user = await User.findById(userId).populate({
        path: 'carts',
        populate: { path: 'product' }
      })

      const findCartItemIndex = user?.carts.findIndex(
        (cartItem) => cartItem?.product?.id === id
      )

      if (findCartItemIndex > -1) {
        // The new addTocart item is already in cart
        // find the cartItem and update in database
        user?.carts[findCartItemIndex!]?.quantity += 1

        await Cart.findByIdAndUpdate(user?.carts[findCartItemIndex!].id, {
          quantity: user?.carts[findCartItemIndex!].quantity
        })

        // find updated cartItem
        const updatedCartItem = await Cart.findById(
          user?.carts[findCartItemIndex].id
        )
          .populate({ path: 'product' })
          .populate({ path: 'user' })

        return updatedCartItem
      } else {
        // the new addTocart item is not in cart yet
        // Create new cartItem
        const cartItem = await Cart.create({
          product: id,
          quantity: 1,
          user: userId
        })

        // find the new cartItem
        const newCartItem = await Cart.findById(cartItem.id)
          .populate({ path: 'product' })
          .populate({ path: 'user' })

        // update user.carts
        await User.findByIdAndUpdate(userId, {
          carts: [...user.carts, newCartItem]
        })

        return newCartItem
      }
    } catch (error) {
      console.log(error)
    }
  },
  deleteCart: async (args, { userId }) => {
    const { id } = args
    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // find cart from given id
    const cart = await Cart.findById(id)

    // user id from request
    const user = await User.findById(userId)

    // check ownership of the cart
    if (cart?.user?.toString() !== userId) {
      throw new Error('Not authorized.')
    }

    // Delete cart
    const deletedCart = await Cart.findByIdAndDelete(id)

    // updated users carts
    const updatedUserCarts = user?.carts.filter(
      (cartId) => cartId.toString() !== deletedCart.id.toString()
    )

    await User.findByIdAndUpdate(userId, { carts: updatedUserCarts })

    return deletedCart
  },
  createOrder: async ({ amount, cardId, token, return_uri }, { userId }) => {
    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // Query user from the database
    const user = await User.findById(userId).populate({
      path: 'carts',
      populated: { path: 'product' }
    })

    // create charge with omise payment

    let customer

    // Credit card: user use existing car
    if (amount && cardId && !token && !return_uri) {
      const existingCustomer = await retrieveCustomer(cardId!)

      if (!existingCustomer) throw new Error('Cannot process payment')

      customer = existingCustomer
    }

    // Credit Card: User use new card
    if (amount && token && !cardId && !return_uri) {
      const newCustomer = await createCustomer(
        user?.email,
        user?.username,
        token
      )

      if (!newCustomer) throw new Error('Cannot process payment')

      customer = newCustomer

      // update user'cards field
      const { id, expirationMonth, expirationYear, brand, lastDigits } =
        newCustomer.cards.data[0]

      const newCard = {
        id: newCustomer?.id,
        cardInfo: {
          id,
          expirationMonth,
          expirationYear,
          brand,
          lastDigits
        }
      }

      await User.findByIdAndUpdate(userId, { cards: [newCard, ...user.cards] })
    }

    let charge = {}
    if (token && return_uri) {
      // Internet banking
      charge = await createChargeInternetBanking(amount, token, return_uri)
    } else {
      // Credit Card
      charge = await createCharge(amount, customer.id)
    }

    if (!charge) throw new Error('Something went wrong with payment, try again')

    // Convert cartItem to OrderItem
    const convertCartToOrder = async () => {
      return Promise.all(
        user?.carts.map((cart) =>
          OrderItem.create({
            product: cart.product,
            quantity: cart.quantity,
            user: cart.user
          })
        )
      )
    }

    // Create order
    const orderItemArray = await convertCartToOrder()

    const order = await Order.create({
      user: userId,
      items: orderItemArray.map((orderItem) => orderItem.id),
      authorize_uri: charge.authorize_uri
    })

    // delete cartItem from the database

    const deleteCartItems = async () => {
      return Promise.all(
        user.carts.map((cart) => Cart.findByIdAndDelete(cart.id))
      )
    }

    await deleteCartItems()

    // update user info in the database

    await User.findByIdAndUpdate(userId, {
      carts: [],
      orders: !user.orders ? [order.id] : [...user.orders, order.id]
    })

    // return order

    return Order.findById(order.id)
      .populate({ path: 'user' })
      .populate({ path: 'items', populate: { path: 'product' } })
  }
}

export default Mutation
