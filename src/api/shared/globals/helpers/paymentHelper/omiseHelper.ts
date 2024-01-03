/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/naming-convention */
import dotenv from 'dotenv'
import Omise from 'omise'
dotenv.config()

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY
})

export const retrieveCustomer = (id: string) => {
  if (id === null) return null

  return new Promise((resolve, reject) => {
    omise.customers.retrieve(id, function (_err, res) {
      if (res) {
        resolve(res)
      } else {
        reject('cannot retrieve customer id')
      }
    })
  })
}

export const createCustomer = (
  email: string,
  description: string,
  card: string
) => {
  return new Promise((resolve, reject) => {
    omise.customers.create({ email, description, card }, function (_err, res) {
      if (res) {
        resolve(res)
      } else {
        reject('error creating customers')
      }
    })
  })
}

export const createCharge = (amount: number, customer: string) => {
  return new Promise((resolve, reject) => {
    omise.charges.create(
      { amount, currency: 'usd', customer },
      function (_err, res) {
        if (res) {
          resolve(res)
        } else {
          reject('error creating charges')
        }
      }
    )
  })
}

export const createChargeInternetBanking = (
  amount: number,
  source: string,
  return_uri: string
) => {
  return new Promise((resolve, reject) => {
    omise.charges.create(
      { amount, currency: 'usd', source, return_uri },
      function (_err, res) {
        if (res) {
          resolve(res)
        } else {
          reject('error creating charge internet banking')
        }
      }
    )
  })
}
