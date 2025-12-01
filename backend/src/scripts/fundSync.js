import axios from "axios";
import prisma from "../prismaClient.js";

const AMFI_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

function normalizeCategory(section) {
    if (!section) return "Other";
    const s = section.toLowerCase();
    if (s.includes("equity")) return "Equity";
    if (s.includes("debt")) return "Debt";
    if (s.includes("hybrid")) return "Hybrid";
    if (s.includes("exchange traded") || s.includes("etf")) return "ETF";
    return "Other";
}

function computeRiskLevel(category) {
    switch (category) {
        case "Equity": return "High";
        case "Hybrid": return "Moderate";
        case "Debt": return "Low";
        default: return null;
    }
}

export function parseAMFI(text) {
    const lines = text.split(/\n/)
    const funds = [];

    let currentSection = null

    for (const rawLine of lines) {
        const line = rawLine.trim()

        if (!line.includes(";")) {
            if (line.toLowerCase().includes("scheme")) {
                currentSection = line;
            }
            continue;
        }

        const cols = line.split(";").map(w => w.trim())
        if (cols.length < 5) continue;

        const scheme_code = cols[0]
        const fund_name = cols[3]
        const nav = parseFloat(cols[4])
        if (!scheme_code || !fund_name || !nav) continue;

        const category = normalizeCategory(currentSection)
        const risk_level = computeRiskLevel(category)

        funds.push({
            scheme_code,
            fund_name,
            category,
            nav,
            risk_level
        })
    }
    return funds;
}

export async function syncFundsFromAMFI({ limit = null } = {}) {
    console.log("Fetching fund data from AMFI...");
    const { data } = await axios.get(AMFI_URL, { timeout: 60000 });
    const funds = parseAMFI(data);
    const subset = limit ? funds.slice(0, limit) : funds;


    console.log(`Parsed ${subset.length} funds from AMFI data.`);

    let count = 0;

    for (const f of subset) {
        // Upsert the latest NAV into MutualFunds
        const fund = await prisma.mutualFunds.upsert({
            where: { scheme_code: f.scheme_code },
            update: {
                fund_name: f.fund_name,
                category: f.category,
                nav: f.nav,
                nav_updated_at: new Date(),
                risk_level: f.risk_level,
                rating_source: "Heuristic",
            },
            create: {
                scheme_code: f.scheme_code,
                fund_name: f.fund_name,
                category: f.category,
                nav: f.nav,
                risk_level: f.risk_level,
                rating_source: "Heuristic",
            },
        });

        // Store today's NAV in NAVHistory if not already present
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existing = await prisma.nAVHistory.findFirst({
            where: {
                scheme_code: f.scheme_code,
                date: { gte: todayStart },
            },
        });

        if (!existing) {
            await prisma.nAVHistory.create({
                data: {
                    scheme_code: f.scheme_code,
                    nav: f.nav,
                    date: new Date(),
                },
            });
        }

        count++;
    }

    console.log(`✅ Synced ${count} mutual funds and recorded daily NAV history.`);

}
