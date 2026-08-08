import express from "express";

const resetPasswordRouter = express.Router();

resetPasswordRouter.post("/resetpassword", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    // Here you would typically generate a reset token and send an email
    // For demonstration purposes, we'll just log the email
    console.log(`Password reset requested for: ${email}`);

    // Simulate sending an email (you would replace this with actual email sending logic)
    // await sendResetEmail(email);

    return res.status(200).json({ message: "Password reset link sent" });
}
);
export default resetPasswordRouter;