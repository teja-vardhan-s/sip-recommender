import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import PDFDocument from "pdfkit";
import streamBuffers from "stream-buffers"; // npm i stream-buffers

const REGION = process.env.AWS_REGION;
const FROM = process.env.SES_FROM_EMAIL;
const BUCKET = process.env.S3_REPORTS_BUCKET;
const PREFIX = process.env.S3_REPORTS_PREFIX || "reports";
const PRESIGNED_EXPIRES = Number(process.env.REPORT_PRESIGNED_URL_EXPIRES || 7 * 24 * 3600);

const ses = new SESClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

export const EmailService = {
    async sendSimpleEmail({ to, subject, html, text }) {
        const params = {
            Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
            Message: {
                Body: {
                    Html: { Data: html ?? "" },
                    Text: { Data: text ?? "" },
                },
                Subject: { Data: subject },
            },
            Source: FROM,
        };
        await ses.send(new SendEmailCommand(params));
    },

    async uploadReportBufferToS3(buffer, key, contentType = "application/pdf") {
        const params = {
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: "private",
        };
        await s3.send(new PutObjectCommand(params));
        return key;
    },

    async getReportSignedUrl(key) {
        const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key }); // only for consistent presigner import
        // For presign GET, create a GetObjectCommand via @aws-sdk/client-s3
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const url = await getSignedUrl(s3, getCmd, { expiresIn: PRESIGNED_EXPIRES });
        return url;
    },

    // Helper: generate a PDF buffer using pdfkit (simple layout)
    async generatePortfolioPdf({ user, summary }) {
        // summary: whatever object you built for the report
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const bufferStream = new streamBuffers.WritableStreamBuffer();

        doc.info.Title = `Portfolio Report - ${user.name}`;
        doc.fontSize(20).text("Portfolio Report", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Name: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(14).text("Summary", { underline: true });
        const totals = summary.totals ?? {};
        doc.fontSize(12).text(`Total Invested: ₹${Number(totals.totalInvested ?? 0).toLocaleString()}`);
        doc.text(`Current Value: ₹${Number(totals.totalCurrentValue ?? 0).toLocaleString()}`);
        doc.text(`Gains: ₹${Number(totals.gains ?? 0).toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(14).text("Details", { underline: true });
        (summary.detailed || []).forEach((d, idx) => {
            doc.fontSize(12).text(`${idx + 1}. ${d.scheme_code} - ${d.category}`);
            doc.text(`   Invested: ₹${Number(d.investedAmount ?? 0).toLocaleString()}  Current: ₹${Number(d.currentValue ?? 0).toLocaleString()}  Return: ${d.absReturn ?? 0}%`);
            doc.moveDown(0.2);
        });

        doc.end();
        await new Promise((resolve) => doc.pipe(bufferStream).on("finish", resolve));
        const buffer = bufferStream.getContents();
        return buffer;
    },

    // high-level: generate report, upload to s3 and email presigned link
    async generateAndEmailPortfolioReport({ user, summary }) {
        // 1. generate
        const pdfBuffer = await this.generatePortfolioPdf({ user, summary });

        // 2. store
        const now = new Date();
        const key = `${PREFIX}/user_${user.user_id}/${now.getFullYear()}/${(now.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/portfolio_${Date.now()}.pdf`;
        await this.uploadReportBufferToS3(pdfBuffer, key);

        // 3. presigned link
        const url = await this.getReportSignedUrl(key);

        // 4. email
        const html = `
      <p>Hi ${user.name},</p>
      <p>Your monthly portfolio report is ready. You can download it from the link below (valid for ${PRESIGNED_EXPIRES / 3600 / 24} days):</p>
      <p><a href="${url}">Download portfolio report (PDF)</a></p>
      <p>Regards,<br/>SIP Recommender</p>
    `;
        await this.sendSimpleEmail({ to: user.email, subject: "Your Portfolio Report", html });
        return { s3Key: key, url };
    },
};
