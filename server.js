const express = require("express");
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const saltRounds = 10;

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connection to MongoDB successful");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  });

// Define schemas and models
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  loginTimes: [{ login: Date, logout: Date }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }]

});


const bookSchema = new mongoose.Schema({
  title: { type: String, unique: true, required: true },
  summary: String,
  imageUrl: String,
  price: Number,
  totalCopies: Number,
  copiesAvailable: Number,
  genre: String,
  publishedDate: Date
});

const authorSchema = new mongoose.Schema({
  authorName: { type: String, required: true },
  bio: String,
  books: [bookSchema]
});

const publisherSchema = new mongoose.Schema({
  publisherName: { type: String, required: true },
  authors: [authorSchema]
});

const multiPublishersSchema = new mongoose.Schema({
  publishers: [publisherSchema]
});

const PurchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  username: { type: String, required: true },
  bookTitle: { type: String, required: true },
  bookimageUrl: { type: String, required: true },
  author: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  purchasedDate: { type: Date, required: true },
});

const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  userId: String, // Add userId field
});

const addressSchema = new mongoose.Schema({
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  userId: { type: String, required: true },
  street: { type: String, required: true },
  landmark: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: Number, required: true },
  country: { type: String, required: true }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
const Book = mongoose.model('Book', bookSchema);
const MultiPublisher = mongoose.model('MultiPublisher', multiPublishersSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Purchase = mongoose.model('Purchase', PurchaseSchema);
const Address = mongoose.model('Address', addressSchema);

// Purchase ---------------------------------------- ----------------------------------------

// const Book = require('./models/Book'); // Adjust the path as per your file structure

// Update book details
// Update book details
app.put('/books/:id', async (req, res) => {
  try {
      const bookId = req.params.id;
      // Logic to update the book in the database based on bookId and req.body
      // Example:
      const updatedBook = await Book.findByIdAndUpdate(bookId, req.body, { new: true });
      res.json(updatedBook);
  } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({ message: 'Failed to update book' });
  }
});



// ---------------------------------------- ----------------------------------------

// User Registration
app.post('/register', async (req, res) => {
  const { username, mobile, email, name, password } = req.body;

  try {
    const existingUser = await Customer.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const existingMobile = await Customer.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ error: "Phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const customer = await Customer.create({ username, mobile, email, name, password: hashedPassword });
    res.json({ message: "Registration successful", customer });
  } catch (err) {
    console.log("Error creating customer:", err);
    res.status(500).json({ error: "Could not create customer" });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Customer.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      user.loginTimes.push({ login: new Date() });
      await user.save();
      res.json({ message: "Login successful", userId: user._id, role: user.role });
    } else {
      res.status(401).json({ error: "Wrong credentials" });
    }
  } catch (err) {
    console.log("Error logging in user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Logout
app.post("/logout", async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const lastLogin = user.loginTimes[user.loginTimes.length - 1];
    if (lastLogin && !lastLogin.logout) {
      lastLogin.logout = new Date();
      await user.save();
    }

    res.json({ message: "Logout successful" });
  } catch (err) {
    console.log("Error logging out user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch Login Times
app.get('/login-times', async (req, res) => {
  try {
    const users = await Customer.find({}, 'username email mobile loginTimes');
    res.status(200).json(users);
  } catch (err) {
    console.log("Error fetching login times:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update User
app.put('/users/:id', async (req, res) => {
  try {
    const { username, email, mobile } = req.body;
    const user = await Customer.findByIdAndUpdate(
      req.params.id,
      { username, email, mobile },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    console.log("Error updating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch Username by User ID
app.get('/username/:id', async (req, res) => {
  try {
    const user = await Customer.findById(req.params.id, 'username');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ username: user.username });
  } catch (err) {
    console.log("Error fetching username:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Delete User
app.delete('/users/:id', async (req, res) => {
  try {
    const user = await Customer.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User and their login details deleted successfully" });
  } catch (err) {
    console.log("Error deleting user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Purchase Book
// assume you have a books model and a purchases model


// Add a new book
app.post('/books', async (req, res) => {
  const { title, summary, imageUrl, price, totalCopies, publisherName, authorName, bio, genre } = req.body;

  if (!publisherName || !authorName || !title || !summary || !imageUrl || !price || !totalCopies) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    let multiPublisher = await MultiPublisher.findOne({});
    if (!multiPublisher) {
      multiPublisher = new MultiPublisher({ publishers: [] });
    }

    let publisher = multiPublisher.publishers.find(p => p.publisherName === publisherName);
    if (!publisher) {
      publisher = { publisherName, authors: [] };
      multiPublisher.publishers.push(publisher);
    }

    let author = publisher.authors.find(author => author.authorName === authorName);
    if (!author) {
      author = { authorName, bio, books: [] };
      publisher.authors.push(author);
    }

    let book = author.books.find(book => book.title === title);
    if (book) {
      return res.status(400).json({ error: 'Book title already exists within this author' });
    }

    author.books.push({ title, summary, imageUrl, price, totalCopies, copiesAvailable: totalCopies, genre });
    await multiPublisher.save();

    res.status(201).json({ message: 'Book added successfully', multiPublisher });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all books
app.get('/books', async (req, res) => {
  try {
    const multiPublisher = await MultiPublisher.findOne({}).populate('publishers.authors.books');
    const books = [];

    if (multiPublisher) {
      multiPublisher.publishers.forEach(publisher => {
        publisher.authors.forEach(author => {
          author.books.forEach(book => {
            books.push({ ...book.toObject(), author: author.authorName, publisher: publisher.publisherName });
          });
        });
      });
    }

    res.status(200).json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get book details by ID
app.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const multiPublisher = await MultiPublisher.findOne({}).populate('publishers.authors.books');

    if (!multiPublisher) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = multiPublisher.publishers
      .flatMap(publisher => publisher.authors)
      .flatMap(author => author.books)
      .find(book => book._id.toString() === id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json(book);
  } catch (err) {
    console.error('Error fetching book details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update book details
// app.put('/books/:id', async (req, res) => {
//   const { id } = req.params;
//   const { title, summary, imageUrl, price, totalCopies, genre } = req.body;

//   try {
//     const multiPublisher = await MultiPublisher.findOne({});

//     if (!multiPublisher) {
//       return res.status(404).json({ error: 'Book not found' });
//     }

//     let updatedBook;
//     multiPublisher.publishers.forEach(publisher => {
//       publisher.authors.forEach(author => {
//         author.books.forEach(book => {
//           if (book._id.toString() === id) {
//             book.title = title || book.title;
//             book.summary = summary || book.summary;
//             book.imageUrl = imageUrl || book.imageUrl;
//             book.price = price || book.price;
//             book.totalCopies = totalCopies || book.totalCopies;
//             book.genre = genre || book.genre;
//             book.copiesAvailable = book.totalCopies - (book.totalCopies - book.copiesAvailable);
//             updatedBook = book;
//           }
//         });
//       });
//     });

//     if (!updatedBook) {
//       return res.status(404).json({ error: 'Book not found' });
//     }

//     await multiPublisher.save();
//     res.status(200).json({ message: 'Book updated successfully', book: updatedBook });
//   } catch (err) {
//     console.error('Error updating book:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Delete a book
app.delete('/books/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const multiPublisher = await MultiPublisher.findOne({});

    if (!multiPublisher) {
      return res.status(404).json({ error: 'Book not found' });
    }

    let bookDeleted = false;
    multiPublisher.publishers.forEach(publisher => {
      publisher.authors.forEach(author => {
        author.books = author.books.filter(book => {
          if (book._id.toString() === id) {
            bookDeleted = true;
            return false;
          }
          return true;
        });
      });
    });

    if (!bookDeleted) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await multiPublisher.save();
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch publishers
app.get('/publishers', async (req, res) => {
  try {
    const publishers = await MultiPublisher.findOne({}, 'publishers.publisherName');
    res.status(200).json(publishers);
  } catch (err) {
    console.error('Error fetching publishers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch authors for a given publisher
app.get('/authors', async (req, res) => {
  const { publisherName } = req.query;

  try {
    const multiPublisher = await MultiPublisher.findOne({ 'publishers.publisherName': publisherName }, { 'publishers.$': 1 });

    if (!multiPublisher || multiPublisher.publishers.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    const authors = multiPublisher.publishers[0].authors.map(author => author.authorName);
    res.status(200).json(authors);
  } catch (err) {
    console.error('Error fetching authors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch all multiple publishers
app.get('/multiple-publishers', async (req, res) => {
  try {
    const multiplePublishers = await MultiPublisher.find();
    res.status(200).json(multiplePublishers);
  } catch (err) {
    console.error('Error fetching multiple publishers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST /purchase
// POST /purchase
app.post('/purchase', async (req, res) => {
  try {
    const { userId, bookTitle, bookimageUrl, author, price, quantity, totalPrice, purchasedDate } = req.body;

    if (!userId || !bookTitle || !bookimageUrl || !author || !price || !quantity || !totalPrice || !purchasedDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Retrieve the username from the Customer model
    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPurchase = new Purchase({
      userId,
      username: user.username,
      bookTitle,
      bookimageUrl, // Corrected field name
      author,
      price,
      quantity,
      totalPrice,
      purchasedDate,
    });

    await newPurchase.save();

    res.status(201).json({ message: 'Purchase successful', purchase: newPurchase });
  } catch (error) {
    console.error('Error saving purchase:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Fetch purchase details
app.get('/purchase', async (req, res) => {
  try {
    const purchases = await Purchase.find().populate('userId', 'username');
    const purchaseDetails = purchases.map(purchase => ({
      ...purchase._doc,
      userName: purchase.userId.username // Assuming username is the field in the Customer model
    }));
    res.status(200).json(purchaseDetails);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/purchase/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const purchases = await Purchase.find({ userId }).populate('userId', 'username');
    const purchaseDetails = purchases.map(purchase => ({
      ...purchase._doc,
      userName: purchase.userId.username // Assuming username is the field in the Customer model
    }));
    res.status(200).json(purchaseDetails);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Delete a purchase by ID
app.delete('/purchase/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const deletedPurchase = await Purchase.findByIdAndDelete(purchaseId);
    if (!deletedPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.status(200).json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Update a purchase by ID
app.put('/purchase/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { bookTitle, bookImage, author, price, quantity, totalPrice, purchasedDate } = req.body;

    // Validate required fields
    if (!bookTitle || !bookImage || !author || !price || !quantity || !totalPrice || !purchasedDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      { bookTitle, bookImage, author, price, quantity, totalPrice, purchasedDate },
      { new: true }
    );

    if (!updatedPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.status(200).json({ message: 'Purchase updated successfully', purchase: updatedPurchase });
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






app.get('/:userId/favorites', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await Customer.findById(userId).populate('favorites');

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json(user.favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).send('Server error');
  }
});

app.post('/:userId/favorites', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { bookId } = req.body;
    const user = await Customer.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (!user.favorites.includes(bookId)) {
      user.favorites.push(bookId);
      await user.save();
    }

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).send('Server error');
  }
});

app.delete('/:userId/favorites/:bookId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const bookId = req.params.bookId;
    const user = await Customer.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.favorites = user.favorites.filter(favorite => favorite.toString() !== bookId);
    await user.save();

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).send('Server error');
  }
});

app.post('/feedback', async (req, res) => {
  const { name, email, message, userId } = req.body; // Include userId

  const newFeedback = new Feedback({ name, email, message, userId });
  try {
    await newFeedback.save();
    res.status(200).send('Feedback submitted successfully');
  } catch (error) {
    res.status(500).send('Error submitting feedback');
  }
});


// Fetch all feedback
app.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define criteria constants
const ACTIVE_DAYS = 10;
const FREQUENT_LOGINS_THRESHOLD = 5; // Adjust this number as needed

// Helper function to calculate the date difference in days
function dateDifferenceInDays(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // Hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Endpoint to get active users
app.get('/users/active', async (req, res) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ACTIVE_DAYS);

    const activeUsers = await Customer.find({
      'loginTimes.login': { $gte: cutoffDate }
    });

    res.status(200).json(activeUsers);
  } catch (err) {
    console.error('Error fetching active users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get frequently logged-in users
app.get('/users/frequent', async (req, res) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ACTIVE_DAYS);

    const users = await Customer.find({
      'loginTimes.login': { $gte: cutoffDate }
    });

    const frequentUsers = users.filter(user => {
      const loginCount = user.loginTimes.filter(loginTime => loginTime.login >= cutoffDate).length;
      return loginCount >= FREQUENT_LOGINS_THRESHOLD;
    });

    res.status(200).json(frequentUsers);
  } catch (err) {
    console.error('Error fetching frequent users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get inactive users
app.get('/users/inactive', async (req, res) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ACTIVE_DAYS);

    const inactiveUsers = await Customer.find({
      $or: [
        { 'loginTimes.login': { $lt: cutoffDate } },
        { 'loginTimes': { $eq: [] } }
      ]
    });

    res.status(200).json(inactiveUsers);
  } catch (err) {
    console.error('Error fetching inactive users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Fetch all users' purchase details
// app.get('/users/purchase', async (req, res) => {
//   try {
//     const purchases = await Purchase.find().populate('userId', 'username email');

//     const purchaseDetails = purchases.reduce((acc, purchase) => {
//       const userId = purchase.userId._id.toString();
//       if (!acc[userId]) {
//         acc[userId] = {
//           userId: purchase.userId._id,
//           username: purchase.userId.username,
//           email: purchase.userId.email,
//           purchases: []
//         };
//       }

//       acc[userId].purchases.push({
//         bookTitle: purchase.bookTitle,
//         bookimageUrl: purchase.bookimageUrl,
//         author: purchase.author,
//         price: purchase.price,
//         quantity: purchase.quantity,
//         totalPrice: purchase.totalPrice,
//         purchasedDate: purchase.purchasedDate
//       });

//       return acc;
//     }, {});

//     res.status(200).json(Object.values(purchaseDetails));
//   } catch (error) {
//     console.error('Error fetching purchase details:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });



// Create a new address
app.post('/address', async (req, res) => {
  const { street,landmark, city, state, postalCode, country } = req.body;
  const userId = req.body.userId || req.query.userId; // User ID from request body or query parameter

  try {
    const address = new Address({ userId, street,landmark, city, state, postalCode, country });
    await address.save();
    res.status(201).json({ message: 'Address created successfully', address });
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch addresses by user ID
app.get('/address/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const addresses = await Address.find({ userId });
    if (!addresses.length) {
      return res.status(404).json({ error: 'No addresses found for this user' });
    }
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an address by ID
app.delete('/address/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findByIdAndDelete(id);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit an address by ID
app.put('/address/:id', async (req, res) => {
  const { id } = req.params;
  const { street,landmark, city, state, postalCode, country } = req.body;

  try {
    const address = await Address.findByIdAndUpdate(
      id,
      { street,landmark, city, state, postalCode, country },
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.status(200).json({ message: 'Address updated successfully', address });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});