const typeDefs = `
  type Query {
    me: User!
    user(id: ID!): User
    users: [User]!
  }

  type User {
    id: ID!
    name: String!
  }
`

export default typeDefs
