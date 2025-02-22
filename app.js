import express from 'express'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import User from './model/user.js'

dotenv.config()

const url = process.env.MONGO_URL

const app = express()
app.use(express.json())

// MongoDB connection
mongoose
    .connect(url)
    .then(() => console.log("MongoDB connected"))
    .catch((error) => {
        console.log("Error", error.message)
        process.exit(1)
    })

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL, // Your Gmail account from .env file
        pass: process.env.EMAIL_PASS // App password from Gmail
    }
})

// 📌 1. Forgot Password
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body
    
    // JWT token creation (expires in 1 hour)
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' })
    
    // Password reset link
    const resetLink = `http://localhost:3000/reset-password?token=${token}`

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset',
        text: `Click the link to reset your password: ${resetLink}`
    }

    try {
        // Send the email
        await transporter.sendMail(mailOptions)
        // Include the token in the response so you can view it
        res.json({ message: 'Reset link sent successfully', token })
    } catch (error) {
        res.status(500).json({ error: 'Error sending email' })
    }
})


// 📌 2. Reset Password
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const email = decoded.email  // Extract email from decoded token

        // Find user in the database using email
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Directly update the user's password without hashing
        await User.updateOne({ email }, { password: newPassword })

        res.json({ message: 'Password reset successful' })
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' })
    }
})



// Start the server
app.listen(3000, () => console.log('🚀 Server running on port 3000'))
