import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";



export const getAllFunds = async (req, res) => {
    try {
        const funds = await MutualFundsRepository.findAll();
        return res.json({ success: true, data: funds });
    } catch (err) {
        console.error("GET /api/funds error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}


export const searchFunds = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
        }

        const funds = await MutualFundsRepository.searchFunds(query);
        return res.json({ success: true, data: funds });
    } catch (err) {
        console.error("GET /api/funds/search error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}