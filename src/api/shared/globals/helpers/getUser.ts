/* eslint-disable @typescript-eslint/no-non-null-assertion */
import jwt from 'jsonwebtoken'

const getUser = (token: string) => {
  if (token === null) return null

  const parsedToken = token.split(' ')[1]

  try {
    const decodedToken = jwt.verify(parsedToken, process.env.JWT_KEY!)

    return decodedToken?.userId
  } catch (error) {
    return null
  }
}

export default getUser
