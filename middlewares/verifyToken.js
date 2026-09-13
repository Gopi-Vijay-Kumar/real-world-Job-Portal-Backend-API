import jwt from 'jsonwebtoken'

export function verifyToken(req, res, next) {
    let accessToken = req.cookies?.accessToken

    if (!accessToken) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please login first."
        })
    }
    try {
        let secret = process.env.SECRET_KEY || 'default_secret_key'
        let decodedToken = jwt.verify(accessToken, secret)
        req.user = decodedToken
        next()
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" })
    }
}