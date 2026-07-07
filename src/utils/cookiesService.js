class CookiesService {
    setAccessToken = (res, value) => {
        res.cookie("accessToken", value, {
            httpOnly: true, // http
            secure: false, // https
            sameSite: "strict",
            maxAge: 60 * 60 * 1000 //  1h
        })
    }

    setRefreshToken = (res, value) => {
        res.cookie("refreshToken", value, {
            httpOnly: true, // http
            secure: false, // https
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 //  7d
        })
    }

    getAccessToken = (req) => {
        return req.cookies["accessToken"]
    }

    getRefreshToken = (req) => {
        return req.cookies["refreshToken"]
    }

    clearData = (res, key) => {
        res.clearCookie(key)
    }

    clearTokens = (res) => {
        this.clearData(res, "accessToken");
        this.clearData(res, "refreshToken");
    }
}

module.exports = new CookiesService();