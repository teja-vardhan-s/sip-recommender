import { PortfolioService } from "../services/portfolioService.js";
import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";
import PDFDocument from "pdfkit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const PortfolioController = {
    async getSummary(req, res, next) {
        try {
            const user_id = req.user.user_id;
            const summary = await PortfolioService.getSummary(user_id);

            return res.json({
                success: true,
                summary,
            });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },

    async getReport(req, res, next) {
        try {
            const user_id = req.user.user_id;
            const userName = req.user.name ?? "Investor";

            // Fetch portfolio summary
            const summary = await PortfolioService.getSummary(user_id);
            if (!summary) return res.status(404).json({ error: "No portfolio found" });

            // Create PDF in memory
            let buffers = [];
            const doc = new PDFDocument({ margin: 40 });

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", async () => {
                try {
                    const pdfData = Buffer.concat(buffers);

                    const key = `reports/portfolio_${user_id}_${Date.now()}.pdf`;

                    await s3.send(
                        new PutObjectCommand({
                            Bucket: process.env.AWS_S3_BUCKET_NAME,
                            Key: key,
                            Body: pdfData,
                            ContentType: "application/pdf",
                        })
                    );

                    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;

                    return res.json({ success: true, url });
                } catch (err) {
                    console.error("S3 upload error:", err);
                    return res.status(500).json({ error: "Failed to upload report to S3" });
                }
            });

            // ---- PAGE 1: HEADER ----
            doc.fontSize(22).text("Portfolio Summary Report", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Investor: ${userName}`);
            doc.text(`Generated on: ${new Date().toLocaleString()}`);
            doc.moveDown(1);

            // ---- TOTALS ----
            doc.fontSize(16).text("Overall Portfolio Value");
            doc.moveDown(0.5);
            const t = summary.totals;

            doc.fontSize(12)
                .text(`Total Invested: ₹${t.totalInvested.toLocaleString()}`)
                .text(`Current Value: ₹${t.totalCurrentValue.toLocaleString()}`)
                .text(`Gains: ₹${t.gains.toLocaleString()}`)
                .text(`Absolute Return: ${t.absReturn.toFixed(2)}%`);
            doc.moveDown(1);

            // ---- CATEGORY ALLOCATION ----
            doc.fontSize(16).text("Category Allocation");
            doc.moveDown(0.5);

            Object.entries(summary.categoryAllocation).forEach(([cat, pct]) => {
                doc.fontSize(12).text(`${cat}: ${pct}%`);
            });

            doc.addPage();

            // ---- PAGE 2: SIP DETAILS ----
            doc.fontSize(18).text("SIP Breakdown");
            doc.moveDown(1);

            const detail = summary.detailed;

            doc.fontSize(12).text(
                "Scheme Name | Category | Invested | Current Value | Return | Status",
                { underline: true }
            );

            doc.moveDown(0.5);

            detail.forEach((d) => {
                doc.text(
                    `${d.scheme_code} (${d.category})  |  ₹${d.investedAmount}  |  ₹${d.currentValue}  | ${d.absReturn.toFixed(2)}%  | ${d.sipStatus.status}`
                );
            });

            doc.moveDown(1);

            // ---- SIP HEALTH SUMMARY ----
            doc.fontSize(16).text("SIP Health Summary");
            doc.moveDown(0.5);

            doc.fontSize(12)
                .text(`Total SIPs: ${summary.sipSummary.total}`)
                .text(`On Track: ${summary.sipSummary.onTrack}`)
                .text(`Delayed: ${summary.sipSummary.delayed}`)
                .text(`Off Track: ${summary.sipSummary.offTrack}`);

            doc.end();

        } catch (err) {
            console.error("PDF Report Error:", err);
            next(err);
        }
    }
};
