# Overview
An ecommerce api that uses graphql, mongoose and express as server to integrate with a SPA client
Graphql and apollo/server is mainly used to to manage the server all the queries and mutations are modularized into a different folder
the server.ts file is the entry/root to the application
# Features
## Auth
It uses jsonwebtoken to create tokens for users that login into the application and saves the token in the database so that the user can login subsequently until it expires
## Cart
A user can add a product to cart, delete or update product in the cart. He can do so only if he/she is authenticated
## Order
A user can create and order and adds it to the orderItem
## Payment
After an order is made he/she can proceed to make payment

# How To Use
git clone https://github.com/samcesa45/dukesell_backend.git to clone the project to his local machine
npm install to install all dependencies
npm run dev to run the project locally
